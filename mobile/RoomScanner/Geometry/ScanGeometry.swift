import Foundation
import simd

/// The render and measurement model for a location (§5.2).
///
/// All values are in ARKit world space, in meters, +Y up. This is the only geometry type that
/// rendering, measurements and the UI consume, so none of them depend on RoomPlan.
struct ScanGeometry: Codable, Equatable, Sendable {
    static let currentVersion = 1

    var version: Int = Self.currentVersion
    var rooms: [RoomGeometry]
    /// Location-wide surfaces from StructureBuilder. nil for single-room scans or failed merges.
    var merged: MergedGeometry?
    /// Rotation in radians about +Y that aligns the dominant wall direction with the screen axes (§6.4).
    var planRotation: Float
}

struct RoomGeometry: Codable, Equatable, Identifiable, Sendable {
    var id: UUID
    var detectedType: RoomType?
    /// World XZ. Empty if unknown.
    var floorPolygon: [SIMD2<Float>]
    /// True when the polygon is the convex-hull fallback (§6.3).
    var isFloorApproximate: Bool
    /// World XZ.
    var labelPosition: SIMD2<Float>?
    var walls: [SurfaceGeometry]
    var doors: [SurfaceGeometry]
    var windows: [SurfaceGeometry]
    var openings: [SurfaceGeometry]
    var objects: [ObjectGeometry]
}

struct MergedGeometry: Codable, Equatable, Sendable {
    var walls: [SurfaceGeometry]
    var doors: [SurfaceGeometry]
    var windows: [SurfaceGeometry]
    var openings: [SurfaceGeometry]
    var objects: [ObjectGeometry]
}

struct SurfaceGeometry: Codable, Equatable, Identifiable, Sendable {
    enum Kind: String, Codable, Sendable { case wall, door, window, opening }

    var id: UUID
    var kind: Kind
    /// Doors only.
    var isOpen: Bool?
    /// World transform of the surface center.
    var transform: Transform
    /// x = width (length along the wall), y = height.
    var dimensions: SIMD3<Float>
}

struct ObjectGeometry: Codable, Equatable, Identifiable, Sendable {
    var id: UUID
    var category: ObjectCategory
    var transform: Transform
    /// x = width, y = height, z = depth.
    var dimensions: SIMD3<Float>
}

/// A `Codable` wrapper for `simd_float4x4`.
struct Transform: Codable, Equatable, Sendable {
    var c0, c1, c2, c3: SIMD4<Float>

    init(_ m: simd_float4x4) {
        (c0, c1, c2, c3) = (m.columns.0, m.columns.1, m.columns.2, m.columns.3)
    }

    var matrix: simd_float4x4 { simd_float4x4(c0, c1, c2, c3) }

    static let identity = Transform(matrix_identity_float4x4)
}

enum RoomType: String, Codable, CaseIterable, Sendable {
    case bedroom, bathroom, kitchen, livingRoom, diningRoom

    var displayName: String {
        switch self {
        case .bedroom: String(localized: .roomTypeBedroom)
        case .bathroom: String(localized: .roomTypeBathroom)
        case .kitchen: String(localized: .roomTypeKitchen)
        case .livingRoom: String(localized: .roomTypeLivingRoom)
        case .diningRoom: String(localized: .roomTypeDiningRoom)
        }
    }
}

enum ObjectCategory: String, Codable, CaseIterable, Sendable {
    case storage, refrigerator, stove, bed, sink, washerDryer, toilet, bathtub, oven,
         dishwasher, table, sofa, chair, fireplace, television, stairs, other

    /// Unknown raw values (for example from a newer app version) decode to `.other`.
    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = ObjectCategory(rawValue: raw) ?? .other
    }

    var displayName: String {
        switch self {
        case .storage: String(localized: .objectStorage)
        case .refrigerator: String(localized: .objectRefrigerator)
        case .stove: String(localized: .objectStove)
        case .bed: String(localized: .objectBed)
        case .sink: String(localized: .objectSink)
        case .washerDryer: String(localized: .objectWasherDryer)
        case .toilet: String(localized: .objectToilet)
        case .bathtub: String(localized: .objectBathtub)
        case .oven: String(localized: .objectOven)
        case .dishwasher: String(localized: .objectDishwasher)
        case .table: String(localized: .objectTable)
        case .sofa: String(localized: .objectSofa)
        case .chair: String(localized: .objectChair)
        case .fireplace: String(localized: .objectFireplace)
        case .television: String(localized: .objectTelevision)
        case .stairs: String(localized: .objectStairs)
        case .other: String(localized: .objectOther)
        }
    }

    enum Group: Sendable { case furniture, appliance, fixture }

    var group: Group {
        switch self {
        case .storage, .bed, .table, .sofa, .chair: .furniture
        case .refrigerator, .stove, .washerDryer, .oven, .dishwasher, .television: .appliance
        case .sink, .toilet, .bathtub, .fireplace, .stairs, .other: .fixture
        }
    }
}

// MARK: - Render source

extension ScanGeometry {
    /// Walls to draw: the merged walls when present, otherwise every room's walls (§5.2).
    var renderWalls: [SurfaceGeometry] { merged?.walls ?? rooms.flatMap(\.walls) }
    var renderDoors: [SurfaceGeometry] { merged?.doors ?? rooms.flatMap(\.doors) }
    var renderWindows: [SurfaceGeometry] { merged?.windows ?? rooms.flatMap(\.windows) }
    var renderOpenings: [SurfaceGeometry] { merged?.openings ?? rooms.flatMap(\.openings) }
    var renderObjects: [ObjectGeometry] { merged?.objects ?? rooms.flatMap(\.objects) }

    static let empty = ScanGeometry(rooms: [], merged: nil, planRotation: 0)
}

// MARK: - Coding

enum ScanGeometryError: Error, Equatable {
    case unsupportedVersion(Int)
}

extension ScanGeometry {
    private struct VersionProbe: Decodable { var version: Int }

    /// Decodes geometry, throwing `ScanGeometryError.unsupportedVersion` for data from a newer app.
    static func decode(from data: Data) throws -> ScanGeometry {
        let decoder = JSONDecoder()
        let probe = try decoder.decode(VersionProbe.self, from: data)
        guard probe.version <= currentVersion else {
            throw ScanGeometryError.unsupportedVersion(probe.version)
        }
        return try decoder.decode(ScanGeometry.self, from: data)
    }

    func encoded() throws -> Data {
        try JSONEncoder().encode(self)
    }
}
