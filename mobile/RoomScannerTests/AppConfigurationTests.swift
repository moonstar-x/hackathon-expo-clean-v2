import Foundation
import Testing
@testable import RoomScanner

@Suite("App configuration")
struct AppConfigurationTests {
    @Test func validURLs() throws {
        let config = try AppConfiguration(value: "https://example.com/prefix/")
        #expect(config.baseURL.absoluteString == "https://example.com/prefix")
        #expect(config.url("/api/auth/login").absoluteString == "https://example.com/prefix/api/auth/login")
        #expect(try AppConfiguration(value: "http://localhost:4000").baseURL.host == "localhost")
    }
    @Test(arguments: [nil, "", "/relative", "ftp://example.com", "https://u:p@example.com", "https://example.com?q=1"] as [String?])
    func invalidURLs(_ value: String?) {
        #expect(throws: AppConfiguration.ConfigurationError.self) { try AppConfiguration(value: value) }
    }
}
