import CoreData
import Foundation

enum LocationStatus: String, Sendable {
    case draft, complete
}

/// A scanned location. Codegen is Manual/None, so this subclass is written by hand (§5.1).
///
/// The attributes are non-optional in the model. They are optional on the Swift side so that
/// SwiftUI rows don't crash when they read a deleted or faulted object. Use the safe accessors below.
@objc(Location)
final class Location: NSManagedObject {
    @NSManaged var quoteScheduleCode: String?
    @NSManaged var quoteDaysPerMonth: Int16
    @NSManaged var quoteTrafficRaw: String?

    @NSManaged var syncStatusRaw: String?
    @NSManaged var ownerUserID: Int64
    @NSManaged var ownerEmail: String?
    @NSManaged var remoteID: Int64
    @NSManaged var uploadedAt: Date?
    @NSManaged var lastUploadError: String?
    @NSManaged var uploadAttempts: Int16
    @NSManaged var lastUploadAttemptAt: Date?
    var syncStatus: SyncStatus {
        get { SyncStatus(rawValue: syncStatusRaw ?? "") ?? .localOnly }
        set { syncStatusRaw = newValue.rawValue }
    }
    @NSManaged var id: UUID?
    @NSManaged var name: String?
    @NSManaged var createdAt: Date?
    @NSManaged var updatedAt: Date?
    @NSManaged var statusRaw: String?
    @NSManaged var roomCount: Int16
    /// m²
    @NSManaged var totalFloorArea: Double
    @NSManaged var thumbnailPNG: Data?
    @NSManaged var rooms: Set<Room>?
    @NSManaged var payload: LocationPayload?

    @nonobjc class func fetchRequest() -> NSFetchRequest<Location> {
        NSFetchRequest<Location>(entityName: "Location")
    }

    var status: LocationStatus {
        get { LocationStatus(rawValue: statusRaw ?? "") ?? .draft }
        set { statusRaw = newValue.rawValue }
    }

    var displayName: String { name ?? "" }

    var sortedRooms: [Room] {
        (rooms ?? []).sorted { $0.index < $1.index }
    }

    /// `"Scan " + createdAt.formatted(date: .abbreviated, time: .shortened)` (§5.1).
    static func defaultName(for date: Date) -> String {
        String(localized: .locationDefaultName(date: date.formatted(date: .abbreviated, time: .shortened)))
    }
}
