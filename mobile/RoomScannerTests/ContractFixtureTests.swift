import Foundation
import Testing
@testable import RoomScanner

@Suite("Shared measurement contract")
struct ContractFixtureTests {
    /// Opt in through the scheme's Test environment to regenerate contract files and real PNGs.
    @Test @MainActor func exportFixtureWhenRequested() async throws {
        guard ProcessInfo.processInfo.environment["ROOMSCANNER_EXPORT_FIXTURE"] == "1" else { return }
        let geometry = SampleGeometry.twoRoomApartment()
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
        let json = try encoder.encode(geometry)
        let names = RoomNaming.defaultNames(for: geometry.rooms.map(\.detectedType))
        let raw = StoredRawData(structureJSON: nil, rooms: geometry.rooms.enumerated().map { index, room in
            StoredRoom(id: room.id, index: index, name: names[index], capturedRoomJSON: nil)
        })
        let snapshot = UploadSnapshot(id: UUID(), name: "Apartamento de ejemplo", createdAt: .now, geometryJSON: json,
            thumbnailPNG: FloorPlanImageRenderer.thumbnailPNG(for: geometry), raw: raw)
        let payload = try await UploadPayloadBuilder().build(snapshot)
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("sample-measurement-\(UUID())")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try json.write(to: directory.appendingPathComponent("two-room-apartment.geometry.json"))
        try json.write(to: directory.appendingPathComponent("geometry.json"))
        try payload.metadata.write(to: directory.appendingPathComponent("metadata.json"))
        for file in payload.files { try file.data.write(to: directory.appendingPathComponent(file.filename)) }
        print("ROOMSCANNER_FIXTURE_EXPORT: \(directory.path)")
    }

    @Test func fixtureMatchesMetrics() throws {
        let bundle = Bundle(for: FixtureBundle.self)
        let url = try #require(bundle.url(forResource: "two-room-apartment.geometry", withExtension: "json", subdirectory: "Fixtures") ?? bundle.url(forResource: "two-room-apartment.geometry", withExtension: "json"))
        let geometry = try ScanGeometry.decode(from: Data(contentsOf: url))
        #expect(geometry.rooms.count == 2); #expect(geometry.merged != nil)
        #expect(geometry.rooms.map { RoomMetrics.floorArea(of: $0) } == [20, 14])
        #expect(LocationMetrics.totalFloorArea(of: geometry) == 34)
        #expect(LocationMetrics.footprint(of: geometry)?.width == 8.5)
        #expect(LocationMetrics.footprint(of: geometry)?.length == 4)
    }
}
private final class FixtureBundle {}
