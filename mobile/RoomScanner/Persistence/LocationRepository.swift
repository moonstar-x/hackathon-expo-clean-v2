import CoreData
import Foundation

/// Raw RoomPlan data for one stored room.
struct StoredRoom: Sendable, Equatable {
    var id: UUID
    var index: Int
    var name: String
    /// Encoded `CapturedRoom`. nil for sample data.
    var capturedRoomJSON: Data?
}

/// The raw RoomPlan data stored for a location, used to finish drafts, rebuild and export.
struct StoredRawData: Sendable, Equatable {
    /// Encoded `CapturedStructure`, if the rooms were merged.
    var structureJSON: Data?
    var rooms: [StoredRoom]

    /// True when every room has raw data, so the location can be finished or rebuilt.
    var canRebuild: Bool {
        !rooms.isEmpty && rooms.allSatisfy { $0.capturedRoomJSON != nil }
    }
}

enum RepositoryError: Error, LocalizedError {
    case locationNotFound(UUID)

    var errorDescription: String? {
        switch self {
        case .locationNotFound: String(localized: "The scan couldn't be found.")
        }
    }
}

/// Every write to the store goes through this protocol (§10.1).
///
/// RoomPlan values cross this boundary as encoded JSON (`Data`) rather than `CapturedRoom`, so the
/// persistence layer has no RoomPlan dependency and can be tested without a device.
protocol LocationRepository: Sendable {
    func createDraft(name: String, createdAt: Date) async throws -> UUID
    func appendRoom(locationID: UUID, roomID: UUID, index: Int, name: String,
                    capturedRoomJSON: Data?, floorArea: Double, capturedAt: Date) async throws
    func deleteRoom(roomID: UUID) async throws
    func renameRoom(roomID: UUID, to name: String) async throws
    func finalize(locationID: UUID, geometry: ScanGeometry, structureJSON: Data?,
                  thumbnail: Data?) async throws
    /// nil when the location has no geometry yet (a draft). Throws when the data can't be decoded.
    func loadGeometry(locationID: UUID) async throws -> ScanGeometry?
    func loadRawData(locationID: UUID) async throws -> StoredRawData
    func rename(locationID: UUID, to name: String) async throws
    func delete(locationID: UUID) async throws
    func deleteAll() async throws
    /// Launch cleanup (§10.2): removes drafts that have no rooms. Returns the number removed.
    @discardableResult
    func deleteEmptyDrafts() async throws -> Int
    #if DEBUG
    func insertSample(_ geometry: ScanGeometry, name: String, thumbnail: Data?) async throws -> UUID
    #endif
}

final class CoreDataLocationRepository: LocationRepository, @unchecked Sendable {
    private let container: NSPersistentContainer

    init(container: NSPersistentContainer) {
        self.container = container
    }

    // MARK: Drafts and rooms

    func createDraft(name: String, createdAt: Date = .now) async throws -> UUID {
        try await write { context in
            let location = Location(context: context)
            let id = UUID()
            location.id = id
            location.name = name
            location.createdAt = createdAt
            location.updatedAt = createdAt
            location.status = .draft
            location.roomCount = 0
            location.totalFloorArea = 0
            location.payload = LocationPayload(context: context)
            return id
        }
    }

    func appendRoom(locationID: UUID, roomID: UUID, index: Int, name: String,
                    capturedRoomJSON: Data?, floorArea: Double, capturedAt: Date = .now) async throws {
        try await write { context in
            let location = try Self.location(locationID, in: context)
            let room = Room(context: context)
            room.id = roomID
            room.index = Int16(clamping: index)
            room.name = name
            room.capturedAt = capturedAt
            room.floorArea = floorArea
            room.capturedRoomJSON = capturedRoomJSON
            room.location = location
            Self.refreshTotals(of: location)
        }
    }

    func deleteRoom(roomID: UUID) async throws {
        try await write { context in
            guard let room = try Self.room(roomID, in: context) else { return }
            let location = room.location
            context.delete(room)
            if let location {
                location.removeFromRooms(room)
                Self.refreshTotals(of: location)
            }
        }
    }

    func renameRoom(roomID: UUID, to name: String) async throws {
        try await write { context in
            guard let room = try Self.room(roomID, in: context) else { return }
            room.name = name
            room.location?.updatedAt = .now
        }
    }

    // MARK: Finalize and load

    func finalize(locationID: UUID, geometry: ScanGeometry, structureJSON: Data?,
                  thumbnail: Data?) async throws {
        try await write { context in
            let location = try Self.location(locationID, in: context)
            let payload = location.payload ?? LocationPayload(context: context)
            payload.geometryJSON = try geometry.encoded()
            payload.structureJSON = structureJSON
            location.payload = payload

            let areas = Dictionary(uniqueKeysWithValues: geometry.rooms.map {
                ($0.id, Double(RoomMetrics.floorArea(of: $0) ?? 0))
            })
            for room in location.rooms ?? [] {
                if let id = room.id, let area = areas[id] { room.floorArea = area }
            }
            location.roomCount = Int16(clamping: geometry.rooms.count)
            location.totalFloorArea = Double(LocationMetrics.totalFloorArea(of: geometry))
            location.thumbnailPNG = thumbnail
            location.status = .complete
            location.updatedAt = .now
        }
    }

    func loadGeometry(locationID: UUID) async throws -> ScanGeometry? {
        let context = container.newBackgroundContext()
        return try await context.perform {
            let location = try Self.location(locationID, in: context)
            guard let data = location.payload?.geometryJSON else { return nil }
            return try ScanGeometry.decode(from: data)
        }
    }

    func loadRawData(locationID: UUID) async throws -> StoredRawData {
        let context = container.newBackgroundContext()
        return try await context.perform {
            let location = try Self.location(locationID, in: context)
            let rooms = location.sortedRooms.compactMap { room -> StoredRoom? in
                guard let id = room.id else { return nil }
                return StoredRoom(id: id, index: Int(room.index), name: room.displayName,
                                  capturedRoomJSON: room.capturedRoomJSON)
            }
            return StoredRawData(structureJSON: location.payload?.structureJSON, rooms: rooms)
        }
    }

    // MARK: Location management

    func rename(locationID: UUID, to name: String) async throws {
        try await write { context in
            let location = try Self.location(locationID, in: context)
            location.name = name
            location.updatedAt = .now
        }
    }

    func delete(locationID: UUID) async throws {
        try await write { context in
            let request = Location.fetchRequest()
            request.predicate = NSPredicate(format: "id == %@", locationID as CVarArg)
            for location in try context.fetch(request) {
                context.delete(location)
            }
        }
    }

    func deleteAll() async throws {
        try await write { context in
            for location in try context.fetch(Location.fetchRequest()) {
                context.delete(location)
            }
        }
    }

    @discardableResult
    func deleteEmptyDrafts() async throws -> Int {
        try await write { context in
            let request = Location.fetchRequest()
            request.predicate = NSPredicate(format: "statusRaw == %@ AND rooms.@count == 0",
                                            LocationStatus.draft.rawValue)
            let drafts = try context.fetch(request)
            drafts.forEach(context.delete)
            if !drafts.isEmpty {
                Log.persistence.info("Removed \(drafts.count) empty draft(s)")
            }
            return drafts.count
        }
    }

    #if DEBUG
    func insertSample(_ geometry: ScanGeometry, name: String, thumbnail: Data?) async throws -> UUID {
        try await write { context in
            Self.insertSample(geometry, name: name, thumbnail: thumbnail, in: context)
        }
    }

    /// Inserts a complete location built from sample geometry. Also used synchronously by previews.
    @discardableResult
    static func insertSample(_ geometry: ScanGeometry, name: String, thumbnail: Data?,
                             createdAt: Date = .now, in context: NSManagedObjectContext) -> UUID {
        let location = Location(context: context)
        let id = UUID()
        location.id = id
        location.name = name
        location.createdAt = createdAt
        location.updatedAt = createdAt
        location.status = .complete
        location.thumbnailPNG = thumbnail
        let payload = LocationPayload(context: context)
        payload.geometryJSON = try? geometry.encoded()
        location.payload = payload

        let names = RoomNaming.defaultNames(for: geometry.rooms.map(\.detectedType))
        for (index, roomGeometry) in geometry.rooms.enumerated() {
            let room = Room(context: context)
            room.id = roomGeometry.id
            room.index = Int16(clamping: index)
            room.name = names[index]
            room.capturedAt = createdAt
            room.floorArea = Double(RoomMetrics.floorArea(of: roomGeometry) ?? 0)
            room.location = location
        }
        location.roomCount = Int16(clamping: geometry.rooms.count)
        location.totalFloorArea = Double(LocationMetrics.totalFloorArea(of: geometry))
        return id
    }
    #endif

    // MARK: Helpers

    private func write<T: Sendable>(_ body: @escaping @Sendable (NSManagedObjectContext) throws -> T) async throws -> T {
        let context = container.newBackgroundContext()
        context.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        return try await context.perform {
            do {
                let result = try body(context)
                if context.hasChanges { try context.save() }
                return result
            } catch {
                context.rollback()
                Log.persistence.error("Write failed: \(error)")
                throw error
            }
        }
    }

    private static func location(_ id: UUID, in context: NSManagedObjectContext) throws -> Location {
        let request = Location.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
        request.fetchLimit = 1
        guard let location = try context.fetch(request).first else {
            throw RepositoryError.locationNotFound(id)
        }
        return location
    }

    private static func room(_ id: UUID, in context: NSManagedObjectContext) throws -> Room? {
        let request = Room.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
        request.fetchLimit = 1
        return try context.fetch(request).first
    }

    /// Keeps the denormalized Home list values in sync while the location is a draft.
    private static func refreshTotals(of location: Location) {
        let rooms = location.rooms ?? []
        location.roomCount = Int16(clamping: rooms.count)
        location.totalFloorArea = rooms.reduce(0) { $0 + $1.floorArea }
        location.updatedAt = .now
    }
}

extension Location {
    @objc(removeRoomsObject:)
    @NSManaged func removeFromRooms(_ value: Room)
}
