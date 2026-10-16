import CoreData
import Foundation
import Testing
@testable import RoomScanner

/// Uses an in-memory store per test.
@Suite("LocationRepository")
struct LocationRepositoryTests {
    let persistence = PersistenceController(inMemory: true)
    var repository: CoreDataLocationRepository { persistence.repository }

    private func count(_ entityName: String) throws -> Int {
        let context = persistence.container.newBackgroundContext()
        return try context.performAndWait {
            try context.count(for: NSFetchRequest<NSFetchRequestResult>(entityName: entityName))
        }
    }

    private func fetchLocation(_ id: UUID) throws -> (status: LocationStatus, roomCount: Int, area: Double, name: String, hasThumbnail: Bool)? {
        let context = persistence.container.newBackgroundContext()
        return try context.performAndWait {
            let request = Location.fetchRequest()
            request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
            guard let location = try context.fetch(request).first else { return nil }
            return (location.status, Int(location.roomCount), location.totalFloorArea, location.displayName,
                    location.thumbnailPNG != nil)
        }
    }

    /// A draft with the sample apartment's two rooms appended, as the capture flow does it.
    private func makeDraftWithTwoRooms() async throws -> (UUID, ScanGeometry) {
        let geometry = SampleGeometry.twoRoomApartment()
        let id = try await repository.createDraft(name: "Draft", createdAt: .now)
        for (index, room) in geometry.rooms.enumerated() {
            try await repository.appendRoom(locationID: id, roomID: room.id, index: index, name: "Room \(index + 1)",
                                            type: index == 0 ? .operatingRoom : nil,
                                            capturedRoomJSON: Data("{}".utf8),
                                            floorArea: Double(RoomMetrics.floorArea(of: room) ?? 0),
                                            capturedAt: .now)
        }
        return (id, geometry)
    }

    @Test func createAppendFinalizeAndFetch() async throws {
        let (id, geometry) = try await makeDraftWithTwoRooms()

        let draft = try #require(try fetchLocation(id))
        #expect(draft.status == .draft)
        #expect(draft.roomCount == 2)
        #expect(try await repository.loadGeometry(locationID: id) == nil, "Drafts have no geometry")

        try await repository.finalize(locationID: id, geometry: geometry, structureJSON: nil, thumbnail: Data([1, 2, 3]))

        let location = try #require(try fetchLocation(id))
        #expect(location.status == .complete)
        #expect(location.roomCount == 2)
        #expect(abs(location.area - 34) < 1e-4)
        #expect(location.hasThumbnail)
        #expect(try await repository.loadGeometry(locationID: id) == geometry)

        let raw = try await repository.loadRawData(locationID: id)
        #expect(raw.rooms.map(\.id) == geometry.rooms.map(\.id), "Rooms come back in capture order")
        #expect(raw.canRebuild)
        #expect(raw.structureJSON == nil)
    }

    @Test func appendSetAndClearRoomType() async throws {
        let (_, geometry) = try await makeDraftWithTwoRooms()
        let context = persistence.container.newBackgroundContext()
        let storedType = { (roomID: UUID) in
            try context.performAndWait {
                let request = Room.fetchRequest()
                request.predicate = NSPredicate(format: "id == %@", roomID as CVarArg)
                return try context.fetch(request).first?.typeRaw
            }
        }
        let first = geometry.rooms[0].id, second = geometry.rooms[1].id
        #expect(try storedType(first) == "operatingRoom", "appendRoom stores the type")
        #expect(try storedType(second) == nil)

        try await repository.setRoomType(roomID: second, to: .hallway)
        #expect(try storedType(second) == "hallway")

        try await repository.setRoomType(roomID: first, to: nil)
        #expect(try storedType(first) == nil)
    }

    @Test func renameLocationAndRoom() async throws {
        let (id, geometry) = try await makeDraftWithTwoRooms()
        try await repository.rename(locationID: id, to: "Apartment")
        try await repository.renameRoom(roomID: geometry.rooms[1].id, to: "Guest Room")

        #expect(try fetchLocation(id)?.name == "Apartment")
        let raw = try await repository.loadRawData(locationID: id)
        #expect(raw.rooms.map(\.name) == ["Room 1", "Guest Room"])
    }

    @Test func deleteRoomUpdatesTotals() async throws {
        let (id, geometry) = try await makeDraftWithTwoRooms()
        try await repository.deleteRoom(roomID: geometry.rooms[1].id)
        let location = try #require(try fetchLocation(id))
        #expect(location.roomCount == 1)
        #expect(abs(location.area - 20) < 1e-4)
        #expect(try count("Room") == 1)
    }

    @Test func deleteCascades() async throws {
        let (id, geometry) = try await makeDraftWithTwoRooms()
        try await repository.finalize(locationID: id, geometry: geometry, structureJSON: Data("{}".utf8), thumbnail: nil)
        #expect(try count("Room") == 2)
        #expect(try count("LocationPayload") == 1)

        try await repository.delete(locationID: id)
        #expect(try count("Location") == 0)
        #expect(try count("Room") == 0)
        #expect(try count("LocationPayload") == 0)
    }

    @Test func launchCleanupRemovesEmptyDrafts() async throws {
        let empty = try await repository.createDraft(name: "Empty", createdAt: .now)
        let (kept, _) = try await makeDraftWithTwoRooms()
        let sample = try await repository.insertSample(SampleGeometry.lShapedRoom(), name: "Sample", thumbnail: nil)

        let removed = try await repository.deleteEmptyDrafts()
        #expect(removed == 1)
        #expect(try fetchLocation(empty) == nil)
        #expect(try fetchLocation(kept) != nil)
        #expect(try fetchLocation(sample) != nil)
        #expect(try count("LocationPayload") == 2, "The empty draft's payload went with it")
    }

    @Test func insertSampleIsComplete() async throws {
        let geometry = SampleGeometry.twoRoomApartment()
        let id = try await repository.insertSample(geometry, name: "Apartment", thumbnail: nil)
        let location = try #require(try fetchLocation(id))
        #expect(location.status == .complete)
        #expect(location.roomCount == 2)
        #expect(abs(location.area - 34) < 1e-4)
        let raw = try await repository.loadRawData(locationID: id)
        #expect(raw.rooms.map(\.name) == ["Sala", "Dormitorio"])
        #expect(!raw.canRebuild, "Samples have no raw RoomPlan data")
    }

    @Test func unknownLocationThrows() async {
        await #expect(throws: RepositoryError.self) {
            try await repository.rename(locationID: UUID(), to: "Nope")
        }
    }

    @Test func newerGeometryVersionThrowsOnLoad() async throws {
        var geometry = SampleGeometry.lShapedRoom()
        geometry.version = ScanGeometry.currentVersion + 1
        let id = try await repository.insertSample(geometry, name: "Future", thumbnail: nil)
        await #expect(throws: ScanGeometryError.self) {
            _ = try await repository.loadGeometry(locationID: id)
        }
    }
}
