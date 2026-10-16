import CoreData
import Foundation
import Testing
@testable import RoomScanner

@Suite("Location migration")
struct LocationMigrationTests {
    @Test func versionOneStoreMigratesWithoutLosingScans() async throws {
        let bundle = Bundle(for: PersistenceController.self)
        let directory = try #require(bundle.url(forResource: "RoomScanner", withExtension: "momd"))
        let oldModel = try #require(NSManagedObjectModel(contentsOf: directory.appendingPathComponent("RoomScanner.mom")))
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = folder.appendingPathComponent("old.sqlite")
        let coordinator = NSPersistentStoreCoordinator(managedObjectModel: oldModel)
        let oldStore = try coordinator.addPersistentStore(type: .sqlite, at: url)
        let context = NSManagedObjectContext(concurrencyType: .privateQueueConcurrencyType); context.persistentStoreCoordinator = coordinator
        let id = UUID()
        try await context.perform {
            let object = NSEntityDescription.insertNewObject(forEntityName: "Location", into: context)
            object.setValue(id, forKey: "id"); object.setValue("Anterior", forKey: "name")
            object.setValue(Date(), forKey: "createdAt"); object.setValue(Date(), forKey: "updatedAt")
            object.setValue("complete", forKey: "statusRaw")
            try context.save(); context.reset()
        }
        try coordinator.remove(oldStore)
        let current = NSPersistentStoreCoordinator(managedObjectModel: PersistenceController.model)
        let migrated = try current.addPersistentStore(type: .sqlite, at: url, options: [NSMigratePersistentStoresAutomaticallyOption: true, NSInferMappingModelAutomaticallyOption: true])
        defer { try? current.remove(migrated) }
        let reader = NSManagedObjectContext(concurrencyType: .privateQueueConcurrencyType); reader.persistentStoreCoordinator = current
        try await reader.perform {
            let request = Location.fetchRequest(); let location = try #require(try reader.fetch(request).first)
            #expect(location.id == id); #expect(location.displayName == "Anterior")
            #expect(location.syncStatus == .localOnly); #expect(location.ownerUserID == 0)
        }
    }
}
