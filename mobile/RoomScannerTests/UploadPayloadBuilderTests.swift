import Foundation
import Testing
@testable import RoomScanner

@Suite("Upload payload builder")
struct UploadPayloadBuilderTests {
    @Test @MainActor func sampleContract() async throws {
        let persistence = PersistenceController(inMemory: true), geometry = SampleGeometry.twoRoomApartment()
        persistence.repository.setCurrentOwner(.init(id: 1, email: "ana@example.com", name: nil))
        let id = try await persistence.repository.insertSample(geometry, name: "Apartamento", thumbnail: FloorPlanImageRenderer.thumbnailPNG(for: geometry))
        try await persistence.repository.renameRoom(roomID: geometry.rooms[0].id, to: "Mi sala")
        let snapshot = try #require(try await persistence.repository.uploadSnapshot(locationID: id))
        let payload = try await UploadPayloadBuilder().build(snapshot)
        let metadata = try APICoding.decoder().decode(UploadMetadata.self, from: payload.metadata)
        #expect(metadata.rooms.count == 2); #expect(metadata.rooms.map(\.floorArea) == [20, 14])
        #expect(metadata.rooms[0].name == "Mi sala"); #expect(metadata.rooms.map(\.wallCount) == [4, 4])
        #expect(metadata.rooms.map(\.doorCount) == [2, 1]); #expect(metadata.rooms.map(\.windowCount) == [1, 1])
        #expect(metadata.rooms.map(\.objectCount) == [2, 1]); #expect(metadata.isMerged)
        #expect(metadata.footprint?.width == 8.5); #expect(metadata.footprint?.length == 4)
        let pngSignature = Data([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        for kind in ["floorPlan", "thumbnail"] { #expect(payload.files.first(where: { $0.name == kind })?.data.prefix(8) == pngSignature) }
        #expect(payload.files.contains(where: { $0.name == "csv" }))
        #if targetEnvironment(simulator)
        #expect(!payload.files.contains(where: { $0.name == "model" }))
        #endif
        #expect(!payload.files.contains(where: { $0.name == "raw" }))
    }
}
