import Foundation
import Observation

enum DetailTab: String, CaseIterable, Identifiable {
    case plan, model, measurements

    var id: String { rawValue }

    var title: String {
        switch self {
        case .plan: String(localized: "detail.tab.plan")
        case .model: String(localized: "detail.tab.model")
        case .measurements: String(localized: "common.measurements")
        }
    }
}

/// Loads and holds a location's geometry for the detail screen (§7.7).
@Observable
@MainActor
final class LocationDetailViewModel {
    enum State: Equatable {
        case loading
        case loaded(ScanGeometry)
        /// The location is a draft (§7.7.5).
        case draft
        /// The geometry is missing, can't be decoded, or is from a newer version (§11).
        case unreadable
        /// Finishing or rebuilding is in progress.
        case working
    }

    /// The selected tab is remembered for the rest of the app session (DET-2).
    @ObservationIgnored static var lastSelectedTab: DetailTab = .plan

    let locationID: UUID
    private(set) var state: State = .loading
    private(set) var rawData: StoredRawData?
    var selectedTab: DetailTab = LocationDetailViewModel.lastSelectedTab {
        didSet { Self.lastSelectedTab = selectedTab }
    }
    var planOptions = FloorPlanCanvas.Options()
    var showsFurnitureIn3D = true
    var errorMessage: String?

    /// Built once per geometry, the first time the 3D tab is shown.
    @ObservationIgnored private var cachedScene: (geometry: ScanGeometry, model: SceneBuilder.Result)?

    @ObservationIgnored private let repository: any LocationRepository

    init(locationID: UUID, repository: any LocationRepository) {
        self.locationID = locationID
        self.repository = repository
    }

    var geometry: ScanGeometry? {
        if case .loaded(let geometry) = state { geometry } else { nil }
    }

    /// True when the raw room data exists, so a draft can be finished or a location rebuilt.
    var canRebuild: Bool { rawData?.canRebuild ?? false }

    var canExportUSDZ: Bool { rawData.map(USDZExporter.canExport) ?? false }

    func sceneModel(for geometry: ScanGeometry) -> SceneBuilder.Result {
        if let cachedScene, cachedScene.geometry == geometry {
            return cachedScene.model
        }
        let model = SceneBuilder.build(geometry, showObjects: showsFurnitureIn3D)
        cachedScene = (geometry, model)
        return model
    }

    // MARK: Loading (DET-1)

    func load(status: LocationStatus) async {
        if state == .working { return }
        do {
            rawData = try await repository.loadRawData(locationID: locationID)
        } catch {
            Log.persistence.error("Loading raw data failed: \(error)")
            rawData = nil
        }
        guard status == .complete else {
            state = .draft
            return
        }
        do {
            // The repository decodes on a background context, off the main thread.
            if let geometry = try await repository.loadGeometry(locationID: locationID) {
                state = .loaded(geometry)
            } else {
                state = .unreadable
            }
        } catch {
            Log.geometry.error("Couldn't open location \(self.locationID): \(error)")
            state = .unreadable
        }
    }

    // MARK: Actions

    /// "Finish with N rooms" for drafts, and "Rebuild" for unreadable locations.
    func rebuild(reuseStructure: Bool) async {
        state = .working
        do {
            let geometry = try await ScanFinalizer(repository: repository)
                .finalizeFromStore(locationID: locationID, reuseStructure: reuseStructure)
            state = .loaded(geometry)
        } catch {
            Log.capture.error("Rebuild failed: \(error)")
            errorMessage = error.localizedDescription
            state = reuseStructure ? .unreadable : .draft
        }
    }

    func rename(to name: String) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        await run { try await $0.rename(locationID: self.locationID, to: trimmed) }
    }

    func renameRoom(_ roomID: UUID, to name: String) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        await run { try await $0.renameRoom(roomID: roomID, to: trimmed) }
    }

    /// Returns true when the location was deleted.
    func delete() async -> Bool {
        await run { try await $0.delete(locationID: self.locationID) }
    }

    @discardableResult
    private func run(_ operation: (any LocationRepository) async throws -> Void) async -> Bool {
        do {
            try await operation(repository)
            return true
        } catch {
            Log.persistence.error("Detail action failed: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }
}
