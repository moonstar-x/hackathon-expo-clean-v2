import CoreData
import Foundation
import Testing
@testable import RoomScanner

@Suite("Upload queue") @MainActor
struct UploadQueueTests {
    private func setup(error: APIError? = nil) async throws -> (PersistenceController, SessionStore, UploadQueue, UUID) {
        let persistence = PersistenceController(inMemory: true)
        let stub = StubAPIClient(error: nil)
        let storage = MemorySessionStorage()
        try storage.save(APICoding.encoder().encode(stub.session))
        let session = SessionStore(value: "https://api.example.com", storage: storage,
            defaults: UserDefaults(suiteName: "UploadTests-\(UUID())")!, makeClient: { _ in StubAPIClient(error: error) })
        persistence.repository.setCurrentOwner(stub.session.user)
        let id = try await persistence.repository.insertSample(SampleGeometry.twoRoomApartment(), name: "Sample", thumbnail: nil)
        let queue = UploadQueue(store: persistence.repository, session: session, monitorNetwork: false, build: { _ in UploadPayload(metadata: Data("{}".utf8), files: []) })
        return (persistence, session, queue, id)
    }
    private func state(_ persistence: PersistenceController, _ id: UUID) throws -> (SyncStatus, Int64, Int16, String?) {
        let context = persistence.container.newBackgroundContext()
        return try context.performAndWait {
            let request = Location.fetchRequest(); request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
            let location = try #require(try context.fetch(request).first)
            return (location.syncStatus, location.remoteID, location.uploadAttempts, location.lastUploadError)
        }
    }
    @Test func successAndReplayStoreRemoteID() async throws {
        // APIClient normalizes both 200 and 201 into the returned remote id.
        for _ in 0..<2 {
            let (persistence, _, queue, id) = try await setup()
            queue.run(); await queue.waitUntilIdle(); queue.stop()
            let value = try state(persistence, id)
            #expect(value.0 == .uploaded); #expect(value.1 == 12); #expect(value.2 == 0); #expect(value.3 == nil)
        }
    }
    @Test func unauthorizedRetainsPendingAndClearsSession() async throws {
        let (persistence, session, queue, id) = try await setup(error: .unauthorized)
        queue.run(); await queue.waitUntilIdle(); queue.stop()
        #expect(try state(persistence, id).0 == .pending); #expect(session.session == nil)
    }
    @Test(arguments: [APIError.network, .server(status: 500, code: "INTERNAL_ERROR", message: "Server down"), .server(status: 429, code: "RATE_LIMITED", message: "Try later")])
    func transientErrorsBackOff(_ error: APIError) async throws {
        let (persistence, _, queue, id) = try await setup(error: error)
        queue.run(); await queue.waitUntilIdle(); queue.stop()
        let value = try state(persistence, id)
        #expect(value.0 == .pending); #expect(value.2 == 1); #expect(value.3 != nil)
        #expect(try await persistence.repository.readyUploadIDs(userID: 1, now: .now).isEmpty)
        #expect(try await persistence.repository.readyUploadIDs(userID: 1, now: .now.addingTimeInterval(31)) == [id])
    }
    @Test func permanentErrorRequiresRetry() async throws {
        let (persistence, _, queue, id) = try await setup(error: .server(status: 422, code: "VALIDATION_ERROR", message: "Bad geometry"))
        queue.run(); await queue.waitUntilIdle(); queue.stop()
        let value = try state(persistence, id)
        #expect(value.0 == .failed); #expect(value.3 == "Bad geometry")
        try await persistence.repository.retryUpload(locationID: id, user: .init(id: 1, email: "ana@example.com", name: nil))
        #expect(try state(persistence, id).2 == 0)
    }
    @Test func isolationDraftsAndLaunchReset() async throws {
        let (persistence, _, queue, id) = try await setup()
        let draft = try await persistence.repository.createDraft(name: "Draft", createdAt: .now)
        persistence.repository.setCurrentOwner(.init(id: 2, email: "other@example.com", name: nil))
        let other = try await persistence.repository.insertSample(SampleGeometry.twoRoomApartment(), name: "Other", thumbnail: nil)
        try await persistence.repository.markSync(locationID: id, status: .uploading)
        try await persistence.repository.resetUploading()
        #expect(try state(persistence, id).0 == .pending)
        queue.run(); await queue.waitUntilIdle(); queue.stop()
        #expect(try state(persistence, id).0 == .uploaded)
        #expect(try state(persistence, other).0 == .pending)
        #expect(try state(persistence, draft).0 == .localOnly)
        try await persistence.repository.retryUpload(locationID: other, user: .init(id: 1, email: "ana@example.com", name: nil))
        #expect(try await persistence.repository.readyUploadIDs(userID: 1, now: .now).isEmpty)
    }
}
