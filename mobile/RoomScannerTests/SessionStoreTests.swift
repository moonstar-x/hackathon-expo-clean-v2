import Foundation
import Testing
@testable import RoomScanner

final class MemorySessionStorage: SessionStorage, @unchecked Sendable {
    private let lock = NSLock()
    private var value: Data?
    func read() throws -> Data? { lock.withLock { value } }
    func save(_ data: Data) throws { lock.withLock { value = data } }
    func delete() throws { lock.withLock { value = nil } }
}
struct StubAPIClient: APIClientProtocol {
    var options: QuotingOptions?
    var onOptions: (@Sendable () -> Void)?
    func quotingOptions(token: String) async throws -> QuotingOptions {
        onOptions?()
        if let error { throw error }; guard let options else { throw APIError.network }; return options
    }
    var session = Session(token: "test-token", expiresAt: .now.addingTimeInterval(3600), user: .init(id: 1, email: "ana@example.com", name: "Ana"))
    var error: APIError?
    var remoteID: Int64 = 12
    func login(email: String, password: String) async throws -> Session { if let error { throw error }; return session }
    func me(token: String) async throws -> Session.User { if let error { throw error }; return session.user }
    func health() async throws { if let error { throw error } }
    func upload(file: URL, boundary: String, token: String) async throws -> Int64 { if let error { throw error }; return remoteID }
}
@Suite("Session store") @MainActor
struct SessionStoreTests {
    private func defaults() -> UserDefaults { UserDefaults(suiteName: "SessionTests-\(UUID())")! }
    @Test func loginPersistsAndLogoutKeepsEmail() async throws {
        let storage = MemorySessionStorage(), defaults = defaults()
        let store = SessionStore(value: "http://localhost:4000", storage: storage, defaults: defaults, makeClient: { _ in StubAPIClient() })
        #expect(await store.login(email: "ana@example.com", password: "password"))
        #expect(try storage.read() != nil)
        #expect(store.session?.user.id == 1)
        store.logout()
        #expect(try storage.read() == nil)
        #expect(defaults.string(forKey: "lastLoginEmail") == "ana@example.com")
    }
    @Test func restoresValidSessionAndDropsExpired() throws {
        let storage = MemorySessionStorage(), client = StubAPIClient()
        try storage.save(APICoding.encoder().encode(client.session))
        let store = SessionStore(value: "http://localhost:4000", storage: storage, defaults: defaults(), makeClient: { _ in client })
        #expect(store.session == client.session)
        store.restore(now: .now.addingTimeInterval(3600))
        #expect(store.session == nil); #expect(try storage.read() == nil)
    }
    @Test func unauthorizedRefreshLosesSessionButNetworkErrorKeepsIt() async throws {
        for error in [APIError.unauthorized, .network] {
            let storage = MemorySessionStorage(), client = StubAPIClient(error: error)
            try storage.save(APICoding.encoder().encode(client.session))
            let store = SessionStore(value: "http://localhost:4000", storage: storage, defaults: defaults(), makeClient: { _ in client })
            await store.refresh()
            #expect((store.session == nil) == (error == .unauthorized))
        }
    }
}
