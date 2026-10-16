import SwiftUI

@main
struct RoomScannerApp: App {
    private let persistence = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            HomeView()
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
