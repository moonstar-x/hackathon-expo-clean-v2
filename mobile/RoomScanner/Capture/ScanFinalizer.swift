import Foundation
import RoomPlan

enum FinalizeError: Error, LocalizedError {
    case noRoomData

    var errorDescription: String? {
        switch self {
        case .noRoomData: String(localized: .captureErrorNoRoomData)
        }
    }
}

/// Merges rooms, maps them to `ScanGeometry` and persists the result (§8.5).
///
/// The Save sheet, "Finish with N rooms" on drafts and "Rebuild" all use this.
struct ScanFinalizer: Sendable {
    let repository: any LocationRepository

    @MainActor
    @discardableResult
    func finalize(locationID: UUID, rooms: [CapturedRoomEntry],
                  existingStructure: CapturedStructure? = nil) async throws -> ScanGeometry {
        guard !rooms.isEmpty else { throw FinalizeError.noRoomData }

        // Merging, mapping and encoding run off the main actor.
        let (geometry, structureJSON) = try await Task.detached(priority: .userInitiated) {
            var structure = existingStructure
            if structure == nil, rooms.count > 1 {
                do {
                    structure = try await StructureBuilder(options: [.beautifyObjects])
                        .capturedStructure(from: rooms.map(\.room))
                } catch {
                    // Fall back to unmerged rooms. The detail view shows a banner (DET-4).
                    Log.capture.error("StructureBuilder failed: \(error)")
                }
            }
            let geometry = RoomPlanMapping.makeGeometry(rooms: rooms, structure: structure)
            let structureJSON = try structure.map(RoomPlanCoding.encode)
            return (geometry, structureJSON)
        }.value

        // ImageRenderer runs on the main actor.
        let thumbnail = FloorPlanImageRenderer.thumbnailPNG(for: geometry)
        try await repository.finalize(locationID: locationID, geometry: geometry,
                                      structureJSON: structureJSON, thumbnail: thumbnail)
        Log.capture.info("Finalized location with \(rooms.count) room(s), merged: \(structureJSON != nil)")
        return geometry
    }

    /// Finishes a draft, or rebuilds a location, from the raw `CapturedRoom` data in the store.
    /// A stored merged structure is reused when `reuseStructure` is true.
    @MainActor
    @discardableResult
    func finalizeFromStore(locationID: UUID, reuseStructure: Bool) async throws -> ScanGeometry {
        let raw = try await repository.loadRawData(locationID: locationID)
        let (rooms, structure) = try await Task.detached(priority: .userInitiated) {
            let rooms = try raw.rooms.map { stored -> CapturedRoomEntry in
                guard let json = stored.capturedRoomJSON else { throw FinalizeError.noRoomData }
                return CapturedRoomEntry(id: stored.id, room: try RoomPlanCoding.decodeRoom(from: json))
            }
            var structure: CapturedStructure?
            if reuseStructure, let json = raw.structureJSON {
                structure = try? RoomPlanCoding.decodeStructure(from: json)
            }
            return (rooms, structure)
        }.value
        return try await finalize(locationID: locationID, rooms: rooms, existingStructure: structure)
    }
}
