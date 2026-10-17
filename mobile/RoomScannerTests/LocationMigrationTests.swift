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

    @Test func versionTwoStoreMigratesWithDefaultQuotingInputs() async throws {
        let bundle = Bundle(for: PersistenceController.self)
        let directory = try #require(bundle.url(forResource: "RoomScanner", withExtension: "momd"))
        let oldModel = try #require(NSManagedObjectModel(contentsOf: directory.appendingPathComponent("RoomScanner 2.mom")))
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = folder.appendingPathComponent("v2.sqlite")
        let coordinator = NSPersistentStoreCoordinator(managedObjectModel: oldModel)
        let oldStore = try coordinator.addPersistentStore(type: .sqlite, at: url)
        let context = NSManagedObjectContext(concurrencyType: .privateQueueConcurrencyType)
        context.persistentStoreCoordinator = coordinator
        try await context.perform {
            let location = NSEntityDescription.insertNewObject(forEntityName: "Location", into: context)
            location.setValue(UUID(), forKey: "id"); location.setValue("Anterior", forKey: "name")
            location.setValue(Date(), forKey: "createdAt"); location.setValue(Date(), forKey: "updatedAt")
            location.setValue("complete", forKey: "statusRaw")
            let room = NSEntityDescription.insertNewObject(forEntityName: "Room", into: context)
            room.setValue(UUID(), forKey: "id"); room.setValue("Baño", forKey: "name")
            room.setValue("bathroom", forKey: "typeRaw"); room.setValue(Date(), forKey: "capturedAt")
            room.setValue(location, forKey: "location")
            try context.save(); context.reset()
        }
        try coordinator.remove(oldStore)
        let current = NSPersistentStoreCoordinator(managedObjectModel: PersistenceController.model)
        let migrated = try current.addPersistentStore(type: .sqlite, at: url, options: [NSMigratePersistentStoresAutomaticallyOption: true, NSInferMappingModelAutomaticallyOption: true])
        defer { try? current.remove(migrated) }
        let reader = NSManagedObjectContext(concurrencyType: .privateQueueConcurrencyType)
        reader.persistentStoreCoordinator = current
        try await reader.perform {
            let location = try #require(try reader.fetch(Location.fetchRequest()).first)
            let room = try #require(location.sortedRooms.first)
            #expect(location.quoteScheduleCode == nil); #expect(location.quoteDaysPerMonth == 0); #expect(location.quoteTrafficRaw == nil)
            #expect(room.quoteTrafficRaw == nil); #expect(room.quoteFixedPosts == 0); #expect(!room.quoteFixturesEnabled)
            #expect(room.quoteToilets == 0); #expect(room.quoteUrinals == 0); #expect(room.quoteSinks == 0)
            #expect(room.type == .bathroom)
        }
    }
}
