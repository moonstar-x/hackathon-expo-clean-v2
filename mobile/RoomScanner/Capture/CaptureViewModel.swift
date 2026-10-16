import Foundation
import Observation
import RoomPlan

/// The capture flow's state machine (§8.2), its completed rooms, live geometry and persistence calls.
@Observable
@MainActor
final class CaptureViewModel {
    enum Phase: Equatable {
        case tips
        case scanning
        case processing
        case reviewing
        case waitingForNextRoom
        case saving
        case done
        case failed(CaptureIssue)
    }

    enum FinalizeState: Equatable {
        case idle
        case running
        case finished
        case failed(String)
    }

    enum CancelPrompt: Identifiable {
        /// No rooms are completed: "¿Descartar el escaneo?"
        case discardOnly
        /// Offer Save N rooms, Discard scan or Keep scanning.
        case saveOrDiscard(Int)

        var id: String {
            switch self {
            case .discardOnly: "discard"
            case .saveOrDiscard: "save"
            }
        }
    }

    enum Sheet: String, Identifiable {
        case review, save
        var id: String { rawValue }
    }

    struct CompletedRoom: Identifiable {
        var id: UUID
        var room: CapturedRoom
        var geometry: RoomGeometry
        var name: String
    }

    /// A failed Core Data write that can be retried (§11, "No se pudo guardar el escaneo").
    struct PersistenceFailure: Identifiable {
        let id = UUID()
        var message: String
        var retry: @MainActor () async -> Void
    }

    // MARK: State

    private(set) var phase: Phase
    private(set) var completedRooms: [CompletedRoom] = []
    /// The in-progress room from live updates (§8.4).
    private(set) var liveRoom: RoomGeometry?
    /// The id the room being scanned will be stored under.
    private(set) var currentRoomID = UUID()
    /// Set when the app went to the background while scanning (REV-5).
    private(set) var trackingWasInterrupted = false
    private(set) var locationID: UUID?
    private(set) var finalizeState: FinalizeState = .idle
    var cancelPrompt: CancelPrompt?
    var persistenceFailure: PersistenceFailure?
    /// The editable name of the room under review (REV-1).
    var reviewName = ""
    /// The editable location name on the Save sheet (SAVE-1).
    var locationName = ""

    @ObservationIgnored private let repository: any LocationRepository
    @ObservationIgnored private var _controller: CaptureSessionController?
    @ObservationIgnored private var liveMappingInFlight = false
    @ObservationIgnored private var pendingLiveRoom: CapturedRoom?
    @ObservationIgnored private var hasStarted = false
    @ObservationIgnored private var draftCreatedAt = Date.now
    /// Writes run one at a time, in order, so a room is never appended before its draft exists.
    @ObservationIgnored private var persistenceQueue: Task<Void, Never>?

    init(repository: any LocationRepository, showsTips: Bool) {
        self.repository = repository
        self.phase = showsTips ? .tips : .scanning
    }

    /// Created on first use, so that building the view model is cheap.
    var controller: CaptureSessionController {
        if let _controller { return _controller }
        let controller = CaptureSessionController()
        controller.onEvent = { [weak self] event in self?.handle(event) }
        _controller = controller
        return controller
    }

    // MARK: Derived values

    /// 1-based number of the room shown in the top bar.
    var roomNumber: Int {
        switch phase {
        case .reviewing, .saving, .done: max(completedRooms.count, 1)
        default: completedRooms.count + 1
        }
    }

    var activeSheet: Sheet? {
        switch phase {
        case .reviewing, .failed: .review
        case .saving: .save
        default: nil
        }
    }

    var currentIssue: CaptureIssue? {
        if case .failed(let issue) = phase { issue } else { nil }
    }

    var completedGeometries: [RoomGeometry] { completedRooms.map(\.geometry) }

    var completedArea: Float { LocationMetrics.totalFloorArea(of: completedGeometries) }

    /// Completed rooms plus the live room. The rotation comes from completed rooms only,
    /// so the mini plan doesn't spin while the user scans.
    var liveGeometry: ScanGeometry {
        let completed = completedGeometries
        var rooms = completed
        if let liveRoom, phase == .scanning || phase == .processing {
            rooms.append(liveRoom)
        }
        return ScanGeometry(rooms: rooms, merged: nil,
                            planRotation: GeometryMath.planRotation(for: completed.flatMap(\.walls)))
    }

    // MARK: Flow

    /// Called when the capture screen appears, and by Start Scanning on the tips screen.
    func beginIfNeeded() {
        guard !hasStarted, phase == .scanning || phase == .tips else { return }
        hasStarted = true
        phase = .scanning
        startCurrentRoom()
    }

    /// Done in the top bar: ends the current room and waits for RoomPlan to process it.
    func finishCurrentRoom() {
        guard phase == .scanning else { return }
        phase = .processing
        controller.finishRoom()
    }

    /// Scan Next Room: commits the name and shows the "walk to the next room" interstitial.
    func scanNextRoom() {
        commitReviewName()
        phase = .waitingForNextRoom
    }

    /// Start on the interstitial. The AR session kept tracking while the user walked.
    func startNextRoom() {
        guard phase == .waitingForNextRoom else { return }
        phase = .scanning
        startCurrentRoom()
    }

    /// Rescan This Room: removes the room under review (if any) and captures it again.
    func rescanRoom() {
        if phase == .reviewing, let last = completedRooms.popLast() {
            enqueuePersistence { repository in
                try await repository.deleteRoom(roomID: last.id)
            }
        }
        phase = .scanning
        startCurrentRoom()
    }

    /// Finish, or Save N rooms from Cancel: ends the session and opens the Save sheet.
    func finish() {
        guard !completedRooms.isEmpty else { return }
        if phase == .reviewing { commitReviewName() }
        controller.endSession()
        liveRoom = nil
        locationName = Location.defaultName(for: draftCreatedAt)
        phase = .saving
        startFinalizing()
    }

    func requestCancel() {
        cancelPrompt = completedRooms.isEmpty ? .discardOnly : .saveOrDiscard(completedRooms.count)
    }

    /// Discard: stops the session and deletes the draft if one was created.
    func discard() async {
        endSessionIfNeeded()
        phase = .done
        await persistenceQueue?.value
        guard let locationID else { return }
        do {
            try await repository.delete(locationID: locationID)
        } catch {
            Log.persistence.error("Discarding the draft failed: \(error)")
        }
    }

    /// Save: persists the name. Finalizing already marked the location complete.
    /// Returns the saved location's id.
    func save() async -> UUID? {
        guard finalizeState == .finished, let locationID else { return nil }
        let name = locationName.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            if !name.isEmpty {
                try await repository.rename(locationID: locationID, to: name)
            }
            phase = .done
            return locationID
        } catch {
            Log.persistence.error("Saving the name failed: \(error)")
            persistenceFailure = PersistenceFailure(message: error.localizedDescription) { [weak self] in
                _ = await self?.save()
            }
            return nil
        }
    }

    func retryFinalizing() {
        startFinalizing()
    }

    func sceneDidEnterBackground() {
        if phase == .scanning {
            trackingWasInterrupted = true
            Log.capture.info("App went to the background during a scan")
        }
    }

    /// Called when the flow disappears.
    func tearDown() {
        endSessionIfNeeded()
    }

    // MARK: Events

    private func handle(_ event: CaptureSessionController.Event) {
        switch event {
        case .liveUpdate(let room):
            guard phase == .scanning else { return }
            mapLiveRoom(room)
        case .processed(let room):
            guard phase == .processing || phase == .scanning else { return }
            completeRoom(room)
        case .failed(let issue):
            guard phase == .scanning || phase == .processing else { return }
            liveRoom = nil
            phase = .failed(issue)
        }
    }

    private func completeRoom(_ room: CapturedRoom) {
        let id = currentRoomID
        let index = completedRooms.count
        let geometry = RoomPlanMapping.makeRoomGeometry(room, id: id)
        let name = RoomNaming.defaultName(for: geometry.detectedType, index: index,
                                          previousTypes: completedRooms.map(\.geometry.detectedType) + [geometry.detectedType])
        if completedRooms.isEmpty, locationID == nil {
            draftCreatedAt = .now
        }
        completedRooms.append(CompletedRoom(id: id, room: room, geometry: geometry, name: name))
        liveRoom = nil
        reviewName = name
        phase = .reviewing

        // §10.2: the draft is created when the first room completes, and every room is written right away.
        let floorArea = Double(RoomMetrics.floorArea(of: geometry) ?? 0)
        enqueuePersistence { [weak self] repository in
            guard let self else { return }
            let json = try await Task.detached { try RoomPlanCoding.encode(room) }.value
            let locationID = try await self.ensureDraft(repository)
            try await repository.appendRoom(locationID: locationID, roomID: id, index: index, name: name,
                                            capturedRoomJSON: json, floorArea: floorArea, capturedAt: .now)
        }
    }

    private func ensureDraft(_ repository: any LocationRepository) async throws -> UUID {
        if let locationID { return locationID }
        let id = try await repository.createDraft(name: Location.defaultName(for: draftCreatedAt),
                                                  createdAt: draftCreatedAt)
        locationID = id
        return id
    }

    private func mapLiveRoom(_ room: CapturedRoom) {
        guard !liveMappingInFlight else {
            pendingLiveRoom = room
            return
        }
        liveMappingInFlight = true
        let id = currentRoomID
        Task {
            let geometry = await Task.detached(priority: .utility) {
                RoomPlanMapping.makeRoomGeometry(room, id: id)
            }.value
            liveMappingInFlight = false
            if phase == .scanning, id == currentRoomID {
                liveRoom = geometry
            }
            if let next = pendingLiveRoom {
                pendingLiveRoom = nil
                mapLiveRoom(next)
            }
        }
    }

    // MARK: Helpers

    private func startCurrentRoom() {
        currentRoomID = UUID()
        liveRoom = nil
        pendingLiveRoom = nil
        controller.startRoom()
    }

    private func endSessionIfNeeded() {
        _controller?.endSession()
    }

    private func commitReviewName() {
        guard let index = completedRooms.indices.last else { return }
        let name = reviewName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name != completedRooms[index].name else { return }
        completedRooms[index].name = name
        let id = completedRooms[index].id
        enqueuePersistence { repository in
            try await repository.renameRoom(roomID: id, to: name)
        }
    }

    private func startFinalizing() {
        guard finalizeState != .running else { return }
        finalizeState = .running
        let rooms = completedRooms.map { CapturedRoomEntry(id: $0.id, room: $0.room) }
        Task {
            // Make sure the draft and all rooms are written before finalizing.
            await persistenceQueue?.value
            guard let locationID else {
                finalizeState = .failed(String(localized: "capture.error.saveFailed"))
                return
            }
            do {
                try await ScanFinalizer(repository: repository).finalize(locationID: locationID, rooms: rooms)
                finalizeState = .finished
            } catch {
                Log.persistence.error("Finalizing failed: \(error)")
                finalizeState = .failed(error.localizedDescription)
            }
        }
    }

    /// Runs a write after the previous ones. On failure, keeps the data in memory and offers Retry.
    private func enqueuePersistence(_ operation: @escaping @MainActor (any LocationRepository) async throws -> Void) {
        let previous = persistenceQueue
        let repository = repository
        persistenceQueue = Task { [weak self] in
            await previous?.value
            do {
                try await operation(repository)
            } catch {
                Log.persistence.error("Couldn't save scan: \(error)")
                self?.persistenceFailure = PersistenceFailure(message: error.localizedDescription) { [weak self] in
                    self?.enqueuePersistence(operation)
                    await self?.persistenceQueue?.value
                }
            }
        }
    }
}
