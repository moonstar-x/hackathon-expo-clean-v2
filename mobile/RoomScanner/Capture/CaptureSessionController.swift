import ARKit
import Foundation
import RoomPlan
import os

/// A RoomPlan error, reduced to what the UI needs. Sendable so it can cross actor boundaries.
struct CaptureIssue: Equatable, Sendable {
    var message: String
    /// True for `exceedSceneSizeLimit`. The UI then suggests finishing rooms sooner.
    var isSceneTooLarge: Bool

    init(message: String, isSceneTooLarge: Bool = false) {
        self.message = message
        self.isSceneTooLarge = isSceneTooLarge
    }

    init(_ error: any Error) {
        let tooLarge = (error as? RoomCaptureSession.CaptureError) == .exceedSceneSizeLimit
            || (error as? StructureBuilder.BuildError) == .exceedSceneSizeLimit
        self.init(message: error.localizedDescription, isSceneTooLarge: tooLarge)
    }
}

/// Owns the one `ARSession` and the one `RoomCaptureView` used for a whole multi-room session (§8.1).
///
/// Every room shares the AR session, so all rooms are captured in the same world coordinate frame.
@MainActor
final class CaptureSessionController: NSObject, RoomCaptureViewDelegate, RoomCaptureSessionDelegate {
    enum Event: Sendable {
        /// An in-progress result for the current room, throttled to 4 Hz.
        case liveUpdate(CapturedRoom)
        /// RoomPlan finished processing the current room.
        case processed(CapturedRoom)
        case failed(CaptureIssue)
    }

    static let liveUpdateInterval: TimeInterval = 0.25

    let arSession: ARSession
    let captureView: RoomCaptureView
    var onEvent: ((Event) -> Void)?

    /// Read from nonisolated delegate callbacks. After the flow ends, late results are ignored.
    private let acceptsResults = OSAllocatedUnfairLock(initialState: true)
    private var lastLiveUpdate = Date.distantPast

    override init() {
        arSession = ARSession()
        captureView = RoomCaptureView(frame: .zero, arSession: arSession)
        super.init()
        captureView.delegate = self
        // §8.4 risk: if this stops RoomCaptureView's own visualization from updating on a device,
        // remove this line. The mini plan then shows only completed rooms.
        captureView.captureSession.delegate = self
    }

    // RoomCaptureViewDelegate inherits from NSCoding.
    nonisolated required init?(coder: NSCoder) {
        nil
    }

    nonisolated func encode(with coder: NSCoder) {}

    // MARK: Commands (§8.3)

    /// Starts capturing a room: the first room, after Start, or after Rescan.
    func startRoom() {
        acceptsResults.withLock { $0 = true }
        lastLiveUpdate = .distantPast
        captureView.captureSession.run(configuration: RoomCaptureSession.Configuration())
    }

    /// Ends the current room but keeps the AR session tracking for the next room.
    func finishRoom() {
        captureView.captureSession.stop(pauseARSession: false)
    }

    /// Ends the whole flow. Results that arrive afterwards are dropped.
    func endSession() {
        acceptsResults.withLock { $0 = false }
        captureView.captureSession.stop()
        arSession.pause()
    }

    private var isAccepting: Bool {
        acceptsResults.withLock { $0 }
    }

    nonisolated private func accepting() -> Bool {
        acceptsResults.withLock { $0 }
    }

    // MARK: RoomCaptureViewDelegate

    nonisolated func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: (any Error)?) -> Bool {
        guard accepting() else { return false }
        if let error {
            let issue = CaptureIssue(error)
            Log.capture.error("Capture failed before processing: \(error)")
            Task { @MainActor in self.emit(.failed(issue)) }
            return false
        }
        return true
    }

    nonisolated func captureView(didPresent processedResult: CapturedRoom, error: (any Error)?) {
        guard accepting() else { return }
        if let error {
            let issue = CaptureIssue(error)
            Log.capture.error("Processing failed: \(error)")
            Task { @MainActor in self.emit(.failed(issue)) }
            return
        }
        Task { @MainActor in self.emit(.processed(processedResult)) }
    }

    // MARK: RoomCaptureSessionDelegate

    nonisolated func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
        guard accepting() else { return }
        Task { @MainActor in self.handleLiveUpdate(room) }
    }

    nonisolated func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: (any Error)?) {
        guard accepting(), let error else { return }
        let issue = CaptureIssue(error)
        Log.capture.error("Capture session ended with an error: \(error)")
        Task { @MainActor in self.emit(.failed(issue)) }
    }

    // MARK: Helpers

    private func handleLiveUpdate(_ room: CapturedRoom) {
        let now = Date.now
        guard now.timeIntervalSince(lastLiveUpdate) >= Self.liveUpdateInterval else { return }
        lastLiveUpdate = now
        emit(.liveUpdate(room))
    }

    private func emit(_ event: Event) {
        guard isAccepting else { return }
        onEvent?(event)
    }
}
