import SwiftUI

@main
struct RoomScannerApp: App {
    private let persistence = PersistenceController.shared

    @State private var session: SessionStore
    @State private var queue: UploadQueue
    init() {
        let session = SessionStore()
        PersistenceController.shared.repository.setCurrentOwner(session.session?.user)
        _session = State(initialValue: session)
        _queue = State(initialValue: UploadQueue(store: PersistenceController.shared.repository, session: session))
    }

    var body: some Scene {
        WindowGroup {
            RootView(session: session, queue: queue)
                .persistence(persistence)
                .task {
                    // §10.2: defensive cleanup of drafts that never got a room.
                    do {
                        try await persistence.repository.deleteEmptyDrafts()
                    } catch {
                        Log.persistence.error("Launch cleanup failed: \(error)")
                    }
                }
        }
    }
}
