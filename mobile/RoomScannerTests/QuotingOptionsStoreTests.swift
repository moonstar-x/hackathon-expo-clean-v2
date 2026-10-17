import Foundation
import Testing
@testable import RoomScanner

private final class OptionsCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var count = 0
    func increment() { lock.withLock { count += 1 } }
    var value: Int { lock.withLock { count } }
}
@Suite("Quoting options") @MainActor
struct QuotingOptionsStoreTests {
    private var options: QuotingOptions {
        QuotingOptions(revision: 14, traffic: ["low", "medium", "high"], schedules: [.init(code: "diurno-8h", name: "Diurno 8 h", serviceHoursPerDay: 8)],
                       defaults: .init(traffic: "medium", scheduleCode: "diurno-8h", daysPerMonth: 22))
    }
    @Test func decodingMatchesServerContract() throws {
        let data = Data(#"{"revision":14,"traffic":["low","medium","high"],"schedules":[{"code":"diurno-8h","name":"Diurno 8 h","serviceHoursPerDay":8}],"defaults":{"traffic":"medium","scheduleCode":"diurno-8h","daysPerMonth":22}}"#.utf8)
        #expect(try JSONDecoder().decode(QuotingOptions.self, from: data) == options)
    }
    @Test func cachesAndThrottlesForOneHour() async throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: folder) }
        let counter = OptionsCounter()
        let client = StubAPIClient(options: options, onOptions: { counter.increment() })
        let storage = MemorySessionStorage()
        try storage.save(APICoding.encoder().encode(client.session))
        let session = SessionStore(value: "http://localhost:4000", storage: storage, defaults: UserDefaults(suiteName: UUID().uuidString)!, makeClient: { _ in client })
        let url = folder.appendingPathComponent("options.json")
        let store = QuotingOptionsStore(cacheURL: url)
        let now = Date()
        await store.refresh(session: session, now: now)
        await store.refresh(session: session, now: now.addingTimeInterval(3599))
        #expect(counter.value == 1)
        #expect(QuotingOptionsStore(cacheURL: url).options == options)
        await store.refresh(session: session, now: now.addingTimeInterval(3600))
        #expect(counter.value == 2)
    }
    @Test func unauthorizedLosesSessionAndOtherErrorsRetainCache() async throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: url) }
        for error in [APIError.network, .unauthorized] {
            let client = StubAPIClient(error: error)
            let storage = MemorySessionStorage()
            try storage.save(APICoding.encoder().encode(client.session))
            let session = SessionStore(value: "http://localhost:4000", storage: storage, defaults: UserDefaults(suiteName: UUID().uuidString)!, makeClient: { _ in client })
            let store = QuotingOptionsStore(cacheURL: url)
            await store.refresh(session: session)
            #expect((session.session == nil) == (error == .unauthorized))
        }
    }
}
