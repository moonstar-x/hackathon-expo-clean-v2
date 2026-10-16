import Foundation

struct AppConfiguration: Equatable, Sendable {
    let baseURL: URL
    enum ConfigurationError: Error { case invalidURL(String) }

    init(value: String?) throws {
        guard let value, let components = URLComponents(string: value),
              ["http", "https"].contains(components.scheme?.lowercased() ?? ""),
              let host = components.host, !host.isEmpty,
              components.user == nil, components.password == nil,
              components.query == nil, components.fragment == nil,
              let url = components.url else {
            throw ConfigurationError.invalidURL(value ?? "(missing)")
        }
        baseURL = URL(string: url.absoluteString.replacingOccurrences(of: "/+$", with: "", options: .regularExpression))!
    }
    static func launchValue(bundle: Bundle = .main, defaults: UserDefaults = .standard) -> String? {
        #if DEBUG
        if let override = defaults.string(forKey: "apiBaseURLOverride") { return override }
        #endif
        return bundle.object(forInfoDictionaryKey: "APIBaseURL") as? String
    }
    func url(_ path: String) -> URL {
        // appendingPathComponent preserves a reverse-proxy prefix.
        baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    }
}
