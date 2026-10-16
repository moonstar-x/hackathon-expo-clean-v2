import Foundation
import simd

/// Per-room measurements (§6.2).
enum RoomMetrics {
    /// Shoelace area of the floor polygon in m². nil when the polygon has fewer than 3 points.
    static func floorArea(of room: RoomGeometry) -> Float? {
        GeometryMath.area(room.floorPolygon)
    }

    /// Floor polygon perimeter, or the sum of wall lengths when there is no polygon.
    static func perimeter(of room: RoomGeometry) -> Float {
        if room.floorPolygon.count >= 3 {
            return GeometryMath.perimeter(room.floorPolygon)
        }
        return room.walls.reduce(0) { $0 + $1.length }
    }

    /// The tallest wall in the room. nil when the room has no walls.
    static func ceilingHeight(of room: RoomGeometry) -> Float? {
        room.walls.map(\.height).max()
    }

    /// The lowest wall base, used to place the floor in 3D. 0 when the room has no walls.
    static func floorElevation(of room: RoomGeometry) -> Float {
        room.walls.map(\.baseElevation).min() ?? 0
    }

    /// The section center if known, otherwise the area-weighted centroid of the floor polygon.
    static func labelPosition(of room: RoomGeometry) -> SIMD2<Float>? {
        room.labelPosition ?? GeometryMath.centroid(room.floorPolygon)
    }
}

/// Location-wide measurements.
enum LocationMetrics {
    /// The sum of the known room floor areas, in m².
    static func totalFloorArea(of geometry: ScanGeometry) -> Float {
        totalFloorArea(of: geometry.rooms)
    }

    static func totalFloorArea(of rooms: [RoomGeometry]) -> Float {
        rooms.reduce(0) { $0 + (RoomMetrics.floorArea(of: $1) ?? 0) }
    }

    /// True if any room's area is a convex-hull approximation.
    static func isAreaApproximate(_ geometry: ScanGeometry) -> Bool {
        geometry.rooms.contains(where: \.isFloorApproximate)
    }

    /// The W × L footprint: the bounding box of all wall endpoints after the plan rotation.
    static func footprint(of geometry: ScanGeometry) -> (width: Float, length: Float)? {
        let points = geometry.renderWalls.flatMap { wall -> [SIMD2<Float>] in
            let segment = wall.planSegment
            return [segment.start, segment.end].map { GeometryMath.rotate($0, by: geometry.planRotation) }
        }
        guard let bounds = GeometryMath.bounds(points) else { return nil }
        let size = bounds.max - bounds.min
        return (size.x, size.y)
    }
}

/// Default room names (§6.5).
enum RoomNaming {
    /// The display name for the room at `index`, given the detected types of all rooms so far.
    /// The second room of a type gets a suffix (`Bedroom 2`). Unknown types are `Room N`.
    static func defaultName(for type: RoomType?, index: Int, previousTypes: [RoomType?]) -> String {
        guard let type else {
            return String(localized: "Room \(index + 1)")
        }
        let sameTypeBefore = previousTypes.prefix(index).filter { $0 == type }.count
        return sameTypeBefore == 0 ? type.displayName : "\(type.displayName) \(sameTypeBefore + 1)"
    }

    static func defaultNames(for types: [RoomType?]) -> [String] {
        types.enumerated().map { index, type in
            defaultName(for: type, index: index, previousTypes: types)
        }
    }
}
