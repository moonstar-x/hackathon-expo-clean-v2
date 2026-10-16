import Foundation

enum APIError: Error, Equatable, LocalizedError, Sendable {
    case unauthorized
    case network
    case server(status: Int, code: String, message: String)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .unauthorized: String(localized: .sessionExpired)
        case .network: String(localized: .networkConnectionError)
        case .server(_, _, let message): message
        case .invalidResponse: String(localized: .networkInvalidResponse)
        }
    }
    var loginMessage: String {
        switch self {
        case .server(401, "INVALID_CREDENTIALS", _), .unauthorized: String(localized: .loginInvalidCredentials)
        case .server(429, _, _): String(localized: .loginRateLimited)
        case .network: String(localized: .networkConnectionError)
        case .server(let status, _, _): String(localized: .loginError(status: status))
        default: String(localized: .loginError(status: 0))
        }
    }
}
