#if DEBUG
import CoreData
import SwiftUI

/// An in-memory store seeded with `SampleGeometry`, for SwiftUI previews.
@MainActor
enum PreviewData {
    static let controller: PersistenceController = {
        let controller = PersistenceController(inMemory: true)
        seed(controller.viewContext)
        return controller
    }()

    /// The two-room sample apartment.
    static var apartmentID: UUID { location(named: "Apartment")?.id ?? UUID() }
    /// A draft with two rooms but no raw data.
    static var draftID: UUID { location(named: "Office")?.id ?? UUID() }

    static func location(named name: String) -> Location? {
        let request = Location.fetchRequest()
        request.predicate = NSPredicate(format: "name == %@", name)
        return try? controller.viewContext.fetch(request).first
    }

    private static func seed(_ context: NSManagedObjectContext) {
        let apartment = SampleGeometry.twoRoomApartment()
        CoreDataLocationRepository.insertSample(
            apartment, name: "Apartment",
            thumbnail: FloorPlanImageRenderer.thumbnailPNG(for: apartment), in: context)

        let studio = SampleGeometry.rotated(SampleGeometry.lShapedRoom(), by: 0.4)
        CoreDataLocationRepository.insertSample(
            studio, name: "Studio",
            thumbnail: FloorPlanImageRenderer.thumbnailPNG(for: studio),
            createdAt: .now.addingTimeInterval(-86_400 * 3), in: context)

        let draft = Location(context: context)
        draft.id = UUID()
        draft.name = "Office"
        draft.createdAt = .now.addingTimeInterval(-86_400 * 7)
        draft.updatedAt = draft.createdAt
        draft.status = .draft
        draft.roomCount = 2
        draft.payload = LocationPayload(context: context)
        for index in 0..<2 {
            let room = Room(context: context)
            room.id = UUID()
            room.index = Int16(index)
            room.name = "Room \(index + 1)"
            room.capturedAt = draft.createdAt
            room.location = draft
        }

        do {
            try context.save()
        } catch {
            Log.persistence.error("Preview seeding failed: \(error)")
        }
    }
}

extension View {
    /// Injects the seeded in-memory store for previews.
    func previewPersistence() -> some View {
        persistence(PreviewData.controller)
    }
}
#endif
