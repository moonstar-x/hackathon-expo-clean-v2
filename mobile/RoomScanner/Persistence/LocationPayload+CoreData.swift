import CoreData
import Foundation

/// Large blobs for a location, kept apart so the Home list never faults them in (§5.1).
@objc(LocationPayload)
final class LocationPayload: NSManagedObject {
    /// Encoded `ScanGeometry`. nil while the location is a draft.
    @NSManaged var geometryJSON: Data?
    /// Encoded `CapturedStructure`. nil for single-room scans, failed merges and sample data.
    @NSManaged var structureJSON: Data?
    @NSManaged var location: Location?

    @nonobjc class func fetchRequest() -> NSFetchRequest<LocationPayload> {
        NSFetchRequest<LocationPayload>(entityName: "LocationPayload")
    }
}
