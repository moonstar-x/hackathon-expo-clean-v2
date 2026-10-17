import Foundation
import Network
import Observation
import SwiftUI
import UIKit

@Observable @MainActor
final class UploadQueue {
    private(set) var isUploading = false
    private let store: any UploadStore
    private let session: SessionStore
    private let build: @Sendable (UploadSnapshot) async throws -> UploadPayload
    @ObservationIgnored private var worker: Task<Void, Never>?
    @ObservationIgnored private var retryTimer: Task<Void, Never>?
    @ObservationIgnored private var rerun = false
    @ObservationIgnored private let monitor = NWPathMonitor()
    init(store: any UploadStore, session: SessionStore, monitorNetwork: Bool = true,
         build: @escaping @Sendable (UploadSnapshot) async throws -> UploadPayload = { try await UploadPayloadBuilder().build($0) }) {
        self.store = store; self.session = session; self.build = build
        if monitorNetwork {
            monitor.pathUpdateHandler = { [weak self] path in
                if path.status == .satisfied { Task { @MainActor [weak self] in self?.run() } }
            }
            monitor.start(queue: DispatchQueue(label: "RoomScanner.network"))
        }
    }
    deinit { monitor.cancel(); worker?.cancel(); retryTimer?.cancel() }
    func run() {
        guard session.session != nil, !session.isCapturing else { return }
        retryTimer?.cancel(); retryTimer = nil
        guard worker == nil else { rerun = true; return }
        worker = Task { await process() }
    }
    func stop() { retryTimer?.cancel(); retryTimer = nil; worker?.cancel() }
    func retry(locationID: UUID) async {
        guard let user = session.session?.user else { return }
        do { try await store.retryUpload(locationID: locationID, user: user); run() }
        catch { Log.persistence.error("Could not retry upload: \(error)") }
    }
    /// Deterministic entry point for tests; also useful to await a user-initiated flush.
    func waitUntilIdle() async { await worker?.value }

    private func process() async {
        defer {
            isUploading = false; worker = nil
            if rerun && session.session != nil { rerun = false; run() }
            else if session.session != nil && !Task.isCancelled {
                // Poll eligibility, not the network, so durable per-location backoff survives relaunch.
                retryTimer = Task { [weak self] in
                    do { try await Task.sleep(for: .seconds(30)); try Task.checkCancellation(); self?.run() } catch {}
                }
            }
        }
        guard let current = session.session, let client = session.client else { return }
        while !Task.isCancelled && !session.isCapturing && session.session?.token == current.token {
            let ids: [UUID]
            do { ids = try await store.readyUploadIDs(userID: current.user.id, now: .now) }
            catch { Log.persistence.error("Upload queue read failed: \(error)"); return }
            guard let id = ids.first else { return }
            isUploading = true
            var backgroundID = UIBackgroundTaskIdentifier.invalid
            backgroundID = UIApplication.shared.beginBackgroundTask(withName: "Measurement upload") { [weak self] in
                Task { @MainActor [weak self] in self?.worker?.cancel() }
            }
            defer { if backgroundID != .invalid { UIApplication.shared.endBackgroundTask(backgroundID) } }
            do {
                try Task.checkCancellation()
                try await store.markSync(locationID: id, status: .uploading, remoteID: nil, error: nil, countAttempt: false)
                guard let snapshot = try await store.uploadSnapshot(locationID: id) else {
                    // A queued location can be deleted, or can have corrupt/missing payload data.
                    try await store.markSync(locationID: id, status: .failed, remoteID: nil, error: String(localized: .syncPayloadError), countAttempt: true)
                    continue
                }
                let payload: UploadPayload
                do { payload = try await build(snapshot) }
                catch is CancellationError { throw CancellationError() }
                catch {
                    try await store.markSync(locationID: id, status: .failed, remoteID: nil, error: String(localized: .syncPayloadError), countAttempt: true)
                    continue
                }
                try Task.checkCancellation()
                let writer = Task.detached(priority: .utility) { try MultipartBodyWriter.write(metadata: payload.metadata, files: payload.files) }
                let body = try await withTaskCancellationHandler { try await writer.value } onCancel: { writer.cancel() }
                defer { body.remove() }
                try Task.checkCancellation()
                let remoteID = try await client.upload(file: body.url, boundary: body.boundary, token: current.token)
                try Task.checkCancellation()
                try await store.markSync(locationID: id, status: .uploaded, remoteID: remoteID, error: nil, countAttempt: false)
            } catch is CancellationError {
                try? await store.markSync(locationID: id, status: .pending, remoteID: nil, error: nil, countAttempt: false)
                return
            } catch APIError.unauthorized {
                try? await store.markSync(locationID: id, status: .pending, remoteID: nil, error: nil, countAttempt: false)
                if session.session?.token == current.token { session.loseSession() }
                return
            } catch {
                var permanent = false
                var message = error.localizedDescription
                if case APIError.server(let status, _, let serverMessage) = error {
                    permanent = (400..<500).contains(status) && ![408, 429].contains(status)
                    message = status == 409 ? String(localized: .syncConflict) : serverMessage
                }
                do {
                    try await store.markSync(locationID: id, status: permanent ? .failed : .pending, remoteID: nil, error: message, countAttempt: true)
                } catch {
                    Log.persistence.error("Could not persist upload failure: \(error)")
                    return
                }
                // Retry other eligible records; this one's persisted backoff keeps it out of the next pass.
            }
        }
    }
}
private struct UploadQueueKey: EnvironmentKey { static let defaultValue: UploadQueue? = nil }
extension EnvironmentValues {
    var uploadQueue: UploadQueue? {
        get { self[UploadQueueKey.self] }
        set { self[UploadQueueKey.self] = newValue }
    }
}
