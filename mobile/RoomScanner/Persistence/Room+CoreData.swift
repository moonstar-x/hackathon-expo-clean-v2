import CoreData
import Foundation

/// One captured room. `id` equals `RoomGeometry.id`.
@objc(Room)
final class Room: NSManagedObject {
    @NSManaged var quoteTrafficRaw: String?
    @NSManaged var quoteFixedPosts: Int16
    @NSManaged var quoteFixturesEnabled: Bool
    @NSManaged var quoteToilets: Int16
    @NSManaged var quoteUrinals: Int16
    @NSManaged var quoteSinks: Int16

    @NSManaged var id: UUID?
    /// 0-based capture order.
    @NSManaged var index: Int16
    @NSManaged var name: String?
    /// `LocationType` raw value. nil when the user didn't pick a type.
    @NSManaged var typeRaw: String?
    @NSManaged var capturedAt: Date?
    /// m²
    @NSManaged var floorArea: Double
    /// Encoded `CapturedRoom` (raw RoomPlan output), kept so the location can be rebuilt or re-exported.
    @NSManaged var capturedRoomJSON: Data?
    @NSManaged var location: Location?

    @nonobjc class func fetchRequest() -> NSFetchRequest<Room> {
        NSFetchRequest<Room>(entityName: "Room")
    }

    /// nil when no type was picked, or the stored value is unknown.
    var type: LocationType? {
        get { typeRaw.flatMap(LocationType.init(rawValue:)) }
        set { typeRaw = newValue?.rawValue }
    }

    var displayName: String { name ?? "" }
}
