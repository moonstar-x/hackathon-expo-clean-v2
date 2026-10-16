import CoreData
import Foundation

/// One captured room. `id` equals `RoomGeometry.id`.
@objc(Room)
final class Room: NSManagedObject {
    @NSManaged var id: UUID?
    /// 0-based capture order.
    @NSManaged var index: Int16
    @NSManaged var name: String?
    @NSManaged var capturedAt: Date?
    /// m²
    @NSManaged var floorArea: Double
    /// Encoded `CapturedRoom` (raw RoomPlan output), kept so the location can be rebuilt or re-exported.
    @NSManaged var capturedRoomJSON: Data?
    @NSManaged var location: Location?

    @nonobjc class func fetchRequest() -> NSFetchRequest<Room> {
        NSFetchRequest<Room>(entityName: "Room")
    }

    var displayName: String { name ?? "" }
}
