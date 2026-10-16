import CoreData
import SwiftUI

/// Owns the Core Data stack (§10.1). The UI reads through `viewContext`; all writes go through `repository`.
final class PersistenceController: @unchecked Sendable {
    static let shared = PersistenceController()

    /// Loaded once and shared by every container, so in-memory stores used in tests and previews
    /// don't register the entity classes more than once.
    static let model: NSManagedObjectModel = {
        let bundle = Bundle(for: PersistenceController.self)
        if let url = bundle.url(forResource: "RoomScanner", withExtension: "momd"),
           let model = NSManagedObjectModel(contentsOf: url) {
            return model
        }
        Log.persistence.fault("RoomScanner.momd is missing from the bundle")
        return NSManagedObjectModel()
    }()

    let container: NSPersistentContainer
    let repository: CoreDataLocationRepository

    var viewContext: NSManagedObjectContext { container.viewContext }

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "RoomScanner", managedObjectModel: Self.model)
        if inMemory, let description = container.persistentStoreDescriptions.first {
            description.url = URL(fileURLWithPath: "/dev/null")
        }
        for description in container.persistentStoreDescriptions {
            description.shouldMigrateStoreAutomatically = true
            description.shouldInferMappingModelAutomatically = true
        }
        container.loadPersistentStores { description, error in
            if let error {
                Log.persistence.error("Failed to load store at \(description.url?.path ?? "?"): \(error)")
            }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        repository = CoreDataLocationRepository(container: container)
    }
}

// MARK: - Environment

private struct PersistenceKey: EnvironmentKey {
    static var defaultValue: PersistenceController { .shared }
}

extension EnvironmentValues {
    var persistence: PersistenceController {
        get { self[PersistenceKey.self] }
        set { self[PersistenceKey.self] = newValue }
    }
}

extension View {
    /// Injects a persistence controller and its view context.
    func persistence(_ controller: PersistenceController) -> some View {
        environment(\.persistence, controller)
            .environment(\.managedObjectContext, controller.viewContext)
    }
}
