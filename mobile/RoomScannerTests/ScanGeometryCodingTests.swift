import Foundation
import Testing
@testable import RoomScanner

@Suite("ScanGeometry coding")
struct ScanGeometryCodingTests {
    @Test(arguments: [
        SampleGeometry.twoRoomApartment(),
        SampleGeometry.lShapedRoom(),
        SampleGeometry.rotated(SampleGeometry.twoRoomApartment(), by: 0.5),
    ])
    func roundTripIsEqual(geometry: ScanGeometry) throws {
        let decoded = try ScanGeometry.decode(from: try geometry.encoded())
        #expect(decoded == geometry)
    }

    @Test func unknownObjectCategoryDecodesToOther() throws {
        let json = Data(#"["sofa", "hotTub", "television"]"#.utf8)
        let categories = try JSONDecoder().decode([ObjectCategory].self, from: json)
        #expect(categories == [.sofa, .other, .television])
    }

    @Test func unknownCategoryInsideGeometryDecodes() throws {
        var geometry = SampleGeometry.twoRoomApartment()
        geometry.merged = nil
        let data = try geometry.encoded()
        let text = try #require(String(data: data, encoding: .utf8))
        let patched = Data(text.replacingOccurrences(of: #""category":"sofa""#, with: #""category":"piano""#).utf8)
        let decoded = try ScanGeometry.decode(from: patched)
        #expect(decoded.rooms[0].objects.contains { $0.category == .other })
    }

    @Test func newerVersionIsDetected() throws {
        var geometry = SampleGeometry.lShapedRoom()
        geometry.version = ScanGeometry.currentVersion + 1
        let data = try geometry.encoded()
        #expect(throws: ScanGeometryError.unsupportedVersion(ScanGeometry.currentVersion + 1)) {
            try ScanGeometry.decode(from: data)
        }
    }

    @Test func garbageFailsToDecode() {
        #expect(throws: (any Error).self) {
            try ScanGeometry.decode(from: Data("not json".utf8))
        }
    }
}
