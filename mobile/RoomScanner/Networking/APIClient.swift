import Foundation

protocol APIClientProtocol: Sendable {
    func login(email: String, password: String) async throws -> Session
    func me(token: String) async throws -> Session.User
    func health() async throws
    func quotingOptions(token: String) async throws -> QuotingOptions
    func upload(file: URL, boundary: String, token: String) async throws -> Int64
}
final class APIClient: APIClientProtocol, @unchecked Sendable {
    let configuration: AppConfiguration
    private let session: URLSession
    private let uploadSession: URLSession
    init(configuration: AppConfiguration, session: URLSession? = nil) {
        self.configuration = configuration
        let json = URLSessionConfiguration.default
        json.timeoutIntervalForRequest = 30
        json.urlCache = nil
        json.requestCachePolicy = .reloadIgnoringLocalCacheData
        json.httpCookieStorage = nil
        self.session = session ?? URLSession(configuration: json)
        let upload = URLSessionConfiguration.default
        upload.timeoutIntervalForRequest = 60
        upload.urlCache = nil
        upload.httpCookieStorage = nil
        upload.timeoutIntervalForResource = 15 * 60
        uploadSession = session ?? URLSession(configuration: upload)
    }
    private func request(_ path: String, token: String? = nil) -> URLRequest {
        var request = URLRequest(url: configuration.url(path), timeoutInterval: 30)
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return request
    }
    private func checked(_ data: Data, _ response: URLResponse, login: Bool = false) throws -> Data {
        guard let response = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(response.statusCode) else {
            struct Body: Decodable { var message: String; var code: String; var errors: [String: String]? }
            if response.statusCode == 401 && !login { throw APIError.unauthorized }
            let body = try? JSONDecoder().decode(Body.self, from: data)
            let message = [body?.message, body?.errors?.sorted(by: { $0.key < $1.key }).first?.value].compactMap { $0 }.joined(separator: ": ")
            throw APIError.server(status: response.statusCode, code: body?.code ?? "UNKNOWN", message: message.isEmpty ? String(localized: .networkInvalidResponse) : message)
        }
        return data
    }
    private func data(_ request: URLRequest, login: Bool = false) async throws -> Data {
        do { let (data, response) = try await session.data(for: request); return try checked(data, response, login: login) }
        catch let error as URLError { if error.code == .cancelled { throw CancellationError() }; throw APIError.network }
    }
    func login(email: String, password: String) async throws -> Session {
        var request = request("/api/auth/login"); request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": email.trimmingCharacters(in: .whitespacesAndNewlines), "password": password])
        return try APICoding.decoder().decode(Session.self, from: await data(request, login: true))
    }
    func me(token: String) async throws -> Session.User {
        try APICoding.decoder().decode(Session.User.self, from: await data(request("/api/auth/me", token: token)))
    }
    func quotingOptions(token: String) async throws -> QuotingOptions {
        try APICoding.decoder().decode(QuotingOptions.self, from: await data(request("/api/quoting/options", token: token)))
    }
    func health() async throws { _ = try await data(request("/health")) }
    func upload(file: URL, boundary: String, token: String) async throws -> Int64 {
        var request = request("/api/measurements", token: token)
        request.httpMethod = "POST"; request.timeoutInterval = 60
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        do {
            let (data, response) = try await uploadSession.upload(for: request, fromFile: file)
            struct Record: Decodable { let id: Int64 }
            return try JSONDecoder().decode(Record.self, from: checked(data, response)).id
        } catch let error as URLError { if error.code == .cancelled { throw CancellationError() }; throw APIError.network }
    }
}
