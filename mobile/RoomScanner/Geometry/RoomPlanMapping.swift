import Foundation
import RoomPlan
import simd

/// A captured room and the id it's stored under (`Room.id` == `RoomGeometry.id`).
struct CapturedRoomEntry: Sendable {
    var id: UUID
    var room: CapturedRoom
}

/// Converts RoomPlan output to `ScanGeometry` (§6). Apart from `Capture/`, this is the only place
/// that uses RoomPlan types.
enum RoomPlanMapping {
    /// Maps captured rooms, and the merged structure if there is one, to the render model.
    /// Computes `planRotation` from the walls that will be drawn.
    static func makeGeometry(rooms: [CapturedRoomEntry], structure: CapturedStructure?) -> ScanGeometry {
        let sources = alignedRooms(rooms, with: structure)
        let roomGeometries = sources.map { makeRoomGeometry($0.room, id: $0.id) }
        let merged = structure.map { structure in
            MergedGeometry(
                walls: structure.walls.compactMap(surface),
                doors: structure.doors.compactMap(surface),
                windows: structure.windows.compactMap(surface),
                openings: structure.openings.compactMap(surface),
                objects: structure.objects.map(object)
            )
        }
        var geometry = ScanGeometry(rooms: roomGeometries, merged: merged, planRotation: 0)
        geometry.planRotation = GeometryMath.planRotation(for: geometry.renderWalls)
        return geometry
    }

    /// StructureBuilder can adjust room positions while it merges. When it does, use its copy of each
    /// room so that floors line up with the merged walls. Rooms are matched by identifier, then by order.
    private static func alignedRooms(_ rooms: [CapturedRoomEntry], with structure: CapturedStructure?) -> [CapturedRoomEntry] {
        guard let structure, !structure.rooms.isEmpty else { return rooms }
        let byIdentifier = Dictionary(structure.rooms.map { ($0.identifier, $0) }, uniquingKeysWith: { first, _ in first })
        let sameCount = structure.rooms.count == rooms.count
        return rooms.enumerated().map { index, entry in
            if let match = byIdentifier[entry.room.identifier] {
                return CapturedRoomEntry(id: entry.id, room: match)
            }
            if sameCount {
                return CapturedRoomEntry(id: entry.id, room: structure.rooms[index])
            }
            return entry
        }
    }

    static func makeRoomGeometry(_ room: CapturedRoom, id: UUID) -> RoomGeometry {
        let walls = room.walls.compactMap(surface)
        let (polygon, approximate) = floorPolygon(of: room, walls: walls)
        let section = room.sections.first { roomType(for: $0.label) != nil } ?? room.sections.first
        let labelPosition = section.map { SIMD2($0.center.x, $0.center.z) } ?? GeometryMath.centroid(polygon)
        return RoomGeometry(
            id: id,
            detectedType: section.flatMap { roomType(for: $0.label) },
            floorPolygon: polygon,
            isFloorApproximate: approximate,
            labelPosition: labelPosition,
            walls: walls,
            doors: room.doors.compactMap(surface),
            windows: room.windows.compactMap(surface),
            openings: room.openings.compactMap(surface),
            objects: room.objects.map(object)
        )
    }

    /// §6.3, in order of preference.
    static func floorPolygon(of room: CapturedRoom, walls: [SurfaceGeometry]) -> (points: [SIMD2<Float>], approximate: Bool) {
        // 1–2. The largest floor surface: its polygon corners, or its rectangle.
        if let floor = room.floors.max(by: { $0.dimensions.x * $0.dimensions.y < $1.dimensions.x * $1.dimensions.y }) {
            let corners: [SIMD3<Float>]
            if !floor.polygonCorners.isEmpty {
                corners = floor.polygonCorners
            } else {
                let w = floor.dimensions.x / 2
                let h = floor.dimensions.y / 2
                corners = [SIMD3(-w, -h, 0), SIMD3(w, -h, 0), SIMD3(w, h, 0), SIMD3(-w, h, 0)]
            }
            let points = corners.map { corner -> SIMD2<Float> in
                let world = floor.transform * SIMD4(corner, 1)
                return SIMD2(world.x, world.z)
            }
            if points.count >= 3 {
                return (points, false)
            }
        }
        // 3. The convex hull of the wall endpoints.
        let endpoints = walls.flatMap { wall -> [SIMD2<Float>] in
            let segment = wall.planSegment
            return [segment.start, segment.end]
        }
        let hull = GeometryMath.convexHull(endpoints)
        // 4. Nothing usable.
        return hull.count >= 3 ? (hull, true) : ([], true)
    }

    static func surface(_ surface: CapturedRoom.Surface) -> SurfaceGeometry? {
        let kind: SurfaceGeometry.Kind
        var isOpen: Bool?
        switch surface.category {
        case .wall: kind = .wall
        case .door(let open):
            kind = .door
            isOpen = open
        case .window: kind = .window
        case .opening: kind = .opening
        case .floor: return nil
        @unknown default: return nil
        }
        return SurfaceGeometry(id: surface.identifier, kind: kind, isOpen: isOpen,
                               transform: Transform(surface.transform), dimensions: surface.dimensions)
    }

    static func object(_ object: CapturedRoom.Object) -> ObjectGeometry {
        ObjectGeometry(id: object.identifier, category: category(for: object.category),
                       transform: Transform(object.transform), dimensions: object.dimensions)
    }

    /// §6.5. `.unidentified` and unknown labels have no type.
    static func roomType(for label: CapturedRoom.Section.Label) -> RoomType? {
        switch label {
        case .bedroom: .bedroom
        case .bathroom: .bathroom
        case .kitchen: .kitchen
        case .livingRoom: .livingRoom
        case .diningRoom: .diningRoom
        case .unidentified: nil
        @unknown default: nil
        }
    }

    static func category(for category: CapturedRoom.Object.Category) -> ObjectCategory {
        switch category {
        case .storage: .storage
        case .refrigerator: .refrigerator
        case .stove: .stove
        case .bed: .bed
        case .sink: .sink
        case .washerDryer: .washerDryer
        case .toilet: .toilet
        case .bathtub: .bathtub
        case .oven: .oven
        case .dishwasher: .dishwasher
        case .table: .table
        case .sofa: .sofa
        case .chair: .chair
        case .fireplace: .fireplace
        case .television: .television
        case .stairs: .stairs
        @unknown default: .other
        }
    }
}

/// JSON coding for raw RoomPlan values stored in Core Data.
enum RoomPlanCoding {
    static func encode(_ room: CapturedRoom) throws -> Data {
        try JSONEncoder().encode(room)
    }

    static func decodeRoom(from data: Data) throws -> CapturedRoom {
        try JSONDecoder().decode(CapturedRoom.self, from: data)
    }

    static func encode(_ structure: CapturedStructure) throws -> Data {
        try JSONEncoder().encode(structure)
    }

    static func decodeStructure(from data: Data) throws -> CapturedStructure {
        try JSONDecoder().decode(CapturedStructure.self, from: data)
    }
}
