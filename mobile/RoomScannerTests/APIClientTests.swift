import Foundation
import Testing
@testable import RoomScanner

final class APIStubProtocol: URLProtocol, @unchecked Sendable {
    // Isolated by each request's unique URL host; no shared mutable per-test handler.
    static let lock = NSLock()
    private static var handlers: [String: @Sendable (URLRequest) throws -> (Int, Data)] = [:]
    static func register(host: String, handler: @escaping @Sendable (URLRequest) throws -> (Int, Data)) { lock.withLock { handlers[host] = handler } }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let handler = Self.lock.withLock { Self.handlers[request.url!.host!]! }
            let (status, data) = try handler(request)
            client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
@Suite("API client")
struct APIClientTests {
    private func client(_ handler: @escaping @Sendable (URLRequest) throws -> (Int, Data)) throws -> APIClient {
        let host = "test-\(UUID().uuidString.lowercased()).invalid"
        APIStubProtocol.register(host: host, handler: handler)
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [APIStubProtocol.self]
        return APIClient(configuration: try AppConfiguration(value: "https://\(host)/prefix"), session: URLSession(configuration: config))
    }
    @Test func loginAndBearer() async throws {
        let api = try client { request in
            if request.url!.path.hasSuffix("login") {
                #expect(request.httpMethod == "POST")
                #expect(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
                // URLSession may provide the HTTP body as a stream to URLProtocol.
                if let body = request.httpBody {
                    let json = try JSONSerialization.jsonObject(with: body) as! [String: String]
                    #expect(json["email"] == "ana@example.com"); #expect(json["password"] == "password")
                }
                return (200, Data(#"{"token":"abc","expiresAt":"2099-01-01T00:00:00.000Z","user":{"id":1,"email":"ana@example.com","name":"Ana"}}"#.utf8))
            }
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer abc")
            return (200, Data(#"{"id":1,"email":"ana@example.com","name":"Ana"}"#.utf8))
        }
        let session = try await api.login(email: " ana@example.com ", password: "password")
        #expect(session.token == "abc"); #expect(try await api.me(token: session.token).id == 1)
    }
    @Test(arguments: [200, 201]) func uploadAcceptsCreationAndReplay(_ status: Int) async throws {
        let api = try client { request in
            #expect(request.url?.path == "/prefix/api/measurements")
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer abc")
            #expect(request.value(forHTTPHeaderField: "Content-Type") == "multipart/form-data; boundary=RoomScanner-test")
            return (status, Data(#"{"id":12}"#.utf8))
        }
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try Data("body".utf8).write(to: file)
        defer { try? FileManager.default.removeItem(at: file) }
        #expect(try await api.upload(file: file, boundary: "RoomScanner-test", token: "abc") == 12)
    }
    @Test func mapsErrors() async throws {
        let forbidden = try client { _ in (422, Data(#"{"code":"VALIDATION_ERROR","message":"Bad input"}"#.utf8)) }
        await #expect(throws: APIError.server(status: 422, code: "VALIDATION_ERROR", message: "Bad input")) { try await forbidden.me(token: "abc") }
        let unauthorized = try client { _ in (401, Data()) }
        await #expect(throws: APIError.unauthorized) { try await unauthorized.me(token: "abc") }
        let offline = try client { _ in throw URLError(.notConnectedToInternet) }
        await #expect(throws: APIError.network) { try await offline.health() }
    }
}
