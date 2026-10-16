import Foundation
import Observation
import SwiftUI

@Observable @MainActor
final class SessionStore {
    private(set) var session: Session?
    private(set) var configuration: AppConfiguration?
    private(set) var configurationValue: String
    private(set) var client: (any APIClientProtocol)?
    var isCapturing = false
    var isLoggingIn = false
    var loginError: String?
    private(set) var lastLoginEmail: String
    private let storage: any SessionStorage
    private let defaults: UserDefaults
    private let makeClient: (AppConfiguration) -> any APIClientProtocol
    var onSessionChange: (() -> Void)?

    init(value: String? = AppConfiguration.launchValue(), storage: any SessionStorage = KeychainStore(),
         defaults: UserDefaults = .standard,
         makeClient: @escaping (AppConfiguration) -> any APIClientProtocol = { APIClient(configuration: $0) }) {
        self.storage = storage; self.defaults = defaults; self.makeClient = makeClient
        configurationValue = value ?? "(missing)"
        let parsedConfiguration = try? AppConfiguration(value: value)
        configuration = parsedConfiguration
        client = parsedConfiguration.map(makeClient)
        lastLoginEmail = defaults.string(forKey: "lastLoginEmail") ?? ""
        restore()
    }
    func restore(now: Date = .now) {
        guard let data = try? storage.read(), let stored = try? APICoding.decoder().decode(Session.self, from: data),
              stored.expiresAt.timeIntervalSince(now) > 60 else {
            try? storage.delete(); session = nil; return
        }
        session = stored
    }
    func refresh() async {
        guard let current = session, let client else { return }
        do {
            let user = try await client.me(token: current.token)
            guard session?.token == current.token else { return }
            var updated = current; updated.user = user
            try storage.save(APICoding.encoder().encode(updated)); session = updated
        } catch APIError.unauthorized { if session?.token == current.token { loseSession() } }
        catch { /* Offline launch retains the locally valid session. */ }
    }
    func login(email: String, password: String) async -> Bool {
        guard let client, !isLoggingIn else { return false }
        isLoggingIn = true; loginError = nil
        defer { isLoggingIn = false }
        do {
            let result = try await client.login(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
            try storage.save(APICoding.encoder().encode(result))
            defaults.set(result.user.email, forKey: "lastLoginEmail"); lastLoginEmail = result.user.email
            session = result; onSessionChange?(); return true
        } catch { loginError = (error as? APIError)?.loginMessage ?? String(localized: .loginError(status: 0)); return false }
    }
    func loseSession() {
        try? storage.delete(); session = nil
        loginError = String(localized: .sessionExpired); onSessionChange?()
    }
    func logout() { try? storage.delete(); session = nil; loginError = nil; onSessionChange?() }
    #if DEBUG
    func changeServer(to value: String?) throws {
        let effective = value ?? (Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String)
        let config = try AppConfiguration(value: effective)
        logout()
        defaults.set(value, forKey: "apiBaseURLOverride")
        configurationValue = config.baseURL.absoluteString; configuration = config; client = makeClient(config)
    }
    #endif
}
private struct SessionStoreKey: EnvironmentKey {
    static let defaultValue: SessionStore? = nil
}
extension EnvironmentValues {
    var sessionStore: SessionStore? {
        get { self[SessionStoreKey.self] }
        set { self[SessionStoreKey.self] = newValue }
    }
}
