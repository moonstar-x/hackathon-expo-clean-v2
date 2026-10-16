import Foundation
import Testing
@testable import RoomScanner

@Suite("Multipart body writer")
struct MultipartBodyWriterTests {
    @Test func exactBytes() throws {
        let body = try MultipartBodyWriter.write(metadata: Data("{}".utf8), files: [.init(name: "geometry", filename: "geometry.json", contentType: "application/json", data: Data("[]".utf8))], boundary: "RoomScanner-test")
        defer { body.remove() }
        let expected = "--RoomScanner-test\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n{}\r\n--RoomScanner-test\r\nContent-Disposition: form-data; name=\"geometry\"; filename=\"geometry.json\"\r\nContent-Type: application/json\r\n\r\n[]\r\n--RoomScanner-test--\r\n"
        #expect(try Data(contentsOf: body.url) == Data(expected.utf8))
    }
    @Test func avoidsContentCollisions() throws {
        let body = try MultipartBodyWriter.write(metadata: Data("RoomScanner-collision".utf8), files: [], boundary: "RoomScanner-collision")
        defer { body.remove() }
        #expect(body.boundary != "RoomScanner-collision")
        #expect(try String(contentsOf: body.url, encoding: .utf8).hasSuffix("--\(body.boundary)--\r\n"))
    }
}
