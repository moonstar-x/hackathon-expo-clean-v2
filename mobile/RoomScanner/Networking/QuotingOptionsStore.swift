import Foundation
import Observation
import SwiftUI

struct QuotingOptions: Codable, Sendable, Equatable {
    struct Schedule: Codable, Sendable, Equatable, Identifiable {
        var code: String
        var name: String
        var serviceHoursPerDay: Double
        var id: String { code }
    }
    struct Defaults: Codable, Sendable, Equatable {
        var traffic: String?
        var scheduleCode: String?
        var daysPerMonth: Double?
    }
    var revision: Int
    var traffic: [String]
    var schedules: [Schedule]
    var defaults: Defaults
}

@Observable @MainActor
final class QuotingOptionsStore {
    private(set) var options: QuotingOptions?
    private(set) var lastAttempt: Date?
    private var server: String?
    private var isFetching = false
    private let cacheURL: URL
    private struct Cache: Codable { var server: String; var options: QuotingOptions; var fetchedAt: Date }
    init(cacheURL: URL? = nil) {
        self.cacheURL = cacheURL ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("RoomScanner/quoting-options.json")
        if let data = try? Data(contentsOf: self.cacheURL), let cache = try? JSONDecoder().decode(Cache.self, from: data) {
            server = cache.server; options = cache.options; lastAttempt = cache.fetchedAt
        }
    }
    func refresh(session: SessionStore, now: Date = .now) async {
        guard let current = session.session, let client = session.client,
              let base = session.configuration?.baseURL.absoluteString, !isFetching else { return }
        if server != base { options = nil; lastAttempt = nil; server = base }
        guard lastAttempt.map({ now.timeIntervalSince($0) >= 3600 }) ?? true else { return }
        lastAttempt = now; isFetching = true
        defer { isFetching = false }
        do {
            let value = try await client.quotingOptions(token: current.token)
            guard session.session?.token == current.token, session.configuration?.baseURL.absoluteString == base else { return }
            options = value
            try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(Cache(server: base, options: value, fetchedAt: now)).write(to: cacheURL, options: .atomic)
        } catch APIError.unauthorized {
            if session.session?.token == current.token { session.loseSession() }
        } catch { /* Retain cached options while offline. */ }
    }
}
private struct QuotingOptionsKey: EnvironmentKey { static let defaultValue: QuotingOptionsStore? = nil }
extension EnvironmentValues {
    var quotingOptions: QuotingOptionsStore? {
        get { self[QuotingOptionsKey.self] }
        set { self[QuotingOptionsKey.self] = newValue }
    }
}
