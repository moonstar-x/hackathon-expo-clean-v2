import Foundation
import simd

#if DEBUG
/// Fixtures built directly as `ScanGeometry`, with no RoomPlan types (§13.3).
/// Used by SwiftUI previews, the DEBUG "Add sample location" action and the unit tests.
enum SampleGeometry {
    static let wallHeight: Float = 2.5

    /// A 5.0 × 4.0 m living room and a 3.5 × 4.0 m bedroom that share the wall at x = 5.0.
    ///
    /// z = 0 is the north wall and z = 4 is the south wall (south is toward the bottom of the plan).
    static func twoRoomApartment() -> ScanGeometry {
        let h = wallHeight

        // Living room walls.
        let livingNorth = wall(from: SIMD2(0, 0), to: SIMD2(5, 0), height: h)
        let livingSouth = wall(from: SIMD2(5, 4), to: SIMD2(0, 4), height: h)
        let livingWest = wall(from: SIMD2(0, 4), to: SIMD2(0, 0), height: h)
        let livingShared = wall(from: SIMD2(5, 0), to: SIMD2(5, 4), height: h)

        // Bedroom walls. Its copy of the shared wall is deduplicated in `merged`.
        let bedroomNorth = wall(from: SIMD2(5, 0), to: SIMD2(8.5, 0), height: h)
        let bedroomEast = wall(from: SIMD2(8.5, 0), to: SIMD2(8.5, 4), height: h)
        let bedroomSouth = wall(from: SIMD2(8.5, 4), to: SIMD2(5, 4), height: h)
        let bedroomShared = wall(from: SIMD2(5, 4), to: SIMD2(5, 0), height: h)

        let sharedDoor = surface(.door, center: SIMD2(5, 2), along: SIMD2(0, 1),
                                 width: 0.9, height: 2.0, base: 0, isOpen: true)
        let sharedDoorBedroomCopy = surface(.door, center: SIMD2(5, 2), along: SIMD2(0, -1),
                                            width: 0.9, height: 2.0, base: 0, isOpen: true)
        let entryDoor = surface(.door, center: SIMD2(1.2, 4), along: SIMD2(-1, 0),
                                width: 0.9, height: 2.0, base: 0, isOpen: false)
        let livingWindow = surface(.window, center: SIMD2(2.5, 0), along: SIMD2(1, 0),
                                   width: 1.6, height: 1.2, base: 0.9)
        let bedroomWindow = surface(.window, center: SIMD2(8.5, 2), along: SIMD2(0, 1),
                                    width: 1.2, height: 1.2, base: 0.9)

        let sofa = object(.sofa, center: SIMD2(2.6, 3.4), yaw: 0, width: 2.1, height: 0.85, depth: 0.9)
        let table = object(.table, center: SIMD2(2.6, 1.8), yaw: 0, width: 1.2, height: 0.75, depth: 0.8)
        let bed = object(.bed, center: SIMD2(6.9, 1.1), yaw: 0, width: 1.6, height: 0.55, depth: 2.0)

        let living = RoomGeometry(
            id: UUID(),
            detectedType: .livingRoom,
            floorPolygon: [SIMD2(0, 0), SIMD2(5, 0), SIMD2(5, 4), SIMD2(0, 4)],
            isFloorApproximate: false,
            labelPosition: SIMD2(2.5, 2.6),
            walls: [livingNorth, livingShared, livingSouth, livingWest],
            doors: [sharedDoor, entryDoor],
            windows: [livingWindow],
            openings: [],
            objects: [sofa, table]
        )
        let bedroom = RoomGeometry(
            id: UUID(),
            detectedType: .bedroom,
            floorPolygon: [SIMD2(5, 0), SIMD2(8.5, 0), SIMD2(8.5, 4), SIMD2(5, 4)],
            isFloorApproximate: false,
            labelPosition: SIMD2(6.75, 2.9),
            walls: [bedroomNorth, bedroomEast, bedroomSouth, bedroomShared],
            doors: [sharedDoorBedroomCopy],
            windows: [bedroomWindow],
            openings: [],
            objects: [bed]
        )
        let merged = MergedGeometry(
            walls: [livingNorth, livingShared, livingSouth, livingWest, bedroomNorth, bedroomEast, bedroomSouth],
            doors: [sharedDoor, entryDoor],
            windows: [livingWindow, bedroomWindow],
            openings: [],
            objects: [sofa, table, bed]
        )
        return ScanGeometry(rooms: [living, bedroom], merged: merged, planRotation: 0)
    }

    /// A single L-shaped room with floor `(0,0) (4,0) (4,2) (2,2) (2,5) (0,5)`: 14.0 m², perimeter 18.0 m.
    /// It has no detected type and an opening on one side.
    static func lShapedRoom() -> ScanGeometry {
        let corners: [SIMD2<Float>] = [
            SIMD2(0, 0), SIMD2(4, 0), SIMD2(4, 2), SIMD2(2, 2), SIMD2(2, 5), SIMD2(0, 5),
        ]
        let walls = corners.indices.map { i in
            wall(from: corners[i], to: corners[(i + 1) % corners.count], height: 2.4)
        }
        let opening = surface(.opening, center: SIMD2(1, 5), along: SIMD2(-1, 0),
                              width: 1.0, height: 2.1, base: 0)
        let room = RoomGeometry(
            id: UUID(),
            detectedType: nil,
            floorPolygon: corners,
            isFloorApproximate: false,
            labelPosition: nil,
            walls: walls,
            doors: [],
            windows: [],
            openings: [opening],
            objects: []
        )
        return ScanGeometry(rooms: [room], merged: nil, planRotation: 0)
    }

    /// Rotates every transform, polygon and label about +Y by `radians`, then recomputes `planRotation`.
    static func rotated(_ geometry: ScanGeometry, by radians: Float) -> ScanGeometry {
        let r = GeometryMath.planRotationMatrix(radians)

        func rotate(_ s: SurfaceGeometry) -> SurfaceGeometry {
            var s = s
            s.transform = Transform(r * s.transform.matrix)
            return s
        }
        func rotate(_ o: ObjectGeometry) -> ObjectGeometry {
            var o = o
            o.transform = Transform(r * o.transform.matrix)
            return o
        }
        func rotate(_ p: SIMD2<Float>) -> SIMD2<Float> {
            GeometryMath.rotate(p, by: radians)
        }

        var result = geometry
        result.rooms = geometry.rooms.map { room in
            var room = room
            room.floorPolygon = room.floorPolygon.map(rotate)
            room.labelPosition = room.labelPosition.map(rotate)
            room.walls = room.walls.map(rotate)
            room.doors = room.doors.map(rotate)
            room.windows = room.windows.map(rotate)
            room.openings = room.openings.map(rotate)
            room.objects = room.objects.map(rotate)
            return room
        }
        if let merged = geometry.merged {
            result.merged = MergedGeometry(
                walls: merged.walls.map(rotate),
                doors: merged.doors.map(rotate),
                windows: merged.windows.map(rotate),
                openings: merged.openings.map(rotate),
                objects: merged.objects.map(rotate)
            )
        }
        result.planRotation = GeometryMath.planRotation(for: result.renderWalls)
        return result
    }

    // MARK: Builders

    /// A wall from `a` to `b` in plan, standing on y = 0.
    static func wall(from a: SIMD2<Float>, to b: SIMD2<Float>, height: Float) -> SurfaceGeometry {
        surface(.wall, center: (a + b) / 2, along: b - a, width: simd_distance(a, b), height: height, base: 0)
    }

    /// A vertical surface centered at `center` in plan, running along `along`.
    static func surface(_ kind: SurfaceGeometry.Kind, center: SIMD2<Float>, along: SIMD2<Float>,
                        width: Float, height: Float, base: Float, isOpen: Bool? = nil) -> SurfaceGeometry {
        let axis = simd_normalize(along)
        let x = SIMD3<Float>(axis.x, 0, axis.y)
        let y = SIMD3<Float>(0, 1, 0)
        let z = simd_cross(x, y)
        let m = simd_float4x4(
            SIMD4(x, 0),
            SIMD4(y, 0),
            SIMD4(z, 0),
            SIMD4(center.x, base + height / 2, center.y, 1)
        )
        return SurfaceGeometry(id: UUID(), kind: kind, isOpen: kind == .door ? (isOpen ?? false) : nil,
                               transform: Transform(m), dimensions: SIMD3(width, height, 0))
    }

    /// An object standing on the floor, rotated by `yaw` radians in plan.
    static func object(_ category: ObjectCategory, center: SIMD2<Float>, yaw: Float,
                       width: Float, height: Float, depth: Float) -> ObjectGeometry {
        var m = GeometryMath.planRotationMatrix(yaw)
        m.columns.3 = SIMD4(center.x, height / 2, center.y, 1)
        return ObjectGeometry(id: UUID(), category: category, transform: Transform(m),
                              dimensions: SIMD3(width, height, depth))
    }
}
#endif
