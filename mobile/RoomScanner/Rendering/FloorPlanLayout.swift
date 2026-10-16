import CoreGraphics
import Foundation
import simd

/// Maps world `(x, z)` to view points and back (§9.1). Pure and unit-tested.
///
/// 1. Rotate by `planRotation` about the origin.
/// 2. Fit the rotated bounds into the view minus padding with a uniform scale, centered.
/// 3. Apply the user's zoom (about the view center) and pan.
struct FloorPlanLayout: Equatable {
    /// Rotation applied before fitting, in radians.
    let rotation: Float
    /// Bounds of the content after rotation, in meters.
    let worldMin: SIMD2<Float>
    let worldMax: SIMD2<Float>
    /// Points per meter, including zoom.
    let scale: CGFloat
    /// View-space position of the rotated world origin.
    let offset: CGPoint

    static let minimumExtent: Float = 1

    init(geometry: ScanGeometry, size: CGSize, padding: CGFloat,
         zoom: CGFloat = 1, pan: CGSize = .zero) {
        self.init(points: Self.contentPoints(of: geometry), rotation: geometry.planRotation,
                  size: size, padding: padding, zoom: zoom, pan: pan)
    }

    init(points: [SIMD2<Float>], rotation: Float, size: CGSize, padding: CGFloat,
         zoom: CGFloat = 1, pan: CGSize = .zero) {
        self.rotation = rotation
        let rotated = points.map { GeometryMath.rotate($0, by: rotation) }
        var (lo, hi) = GeometryMath.bounds(rotated) ?? (SIMD2(-1, -1), SIMD2(1, 1))
        // Give degenerate content (a single point or line) a minimum size so the scale stays finite.
        let center = (lo + hi) / 2
        let extent = simd_max(hi - lo, SIMD2(repeating: Self.minimumExtent))
        lo = center - extent / 2
        hi = center + extent / 2
        worldMin = lo
        worldMax = hi

        let available = CGSize(width: max(size.width - 2 * padding, 1),
                               height: max(size.height - 2 * padding, 1))
        let fitScale = min(available.width / CGFloat(extent.x), available.height / CGFloat(extent.y))
        let viewCenter = CGPoint(x: size.width / 2, y: size.height / 2)
        // Offset that puts the content center at the view center at zoom 1.
        let fitOffset = CGPoint(x: viewCenter.x - CGFloat(center.x) * fitScale,
                                y: viewCenter.y - CGFloat(center.y) * fitScale)
        scale = fitScale * zoom
        offset = CGPoint(x: viewCenter.x + (fitOffset.x - viewCenter.x) * zoom + pan.width,
                         y: viewCenter.y + (fitOffset.y - viewCenter.y) * zoom + pan.height)
    }

    /// World `(x, z)` to a view point.
    func apply(_ p: SIMD2<Float>) -> CGPoint {
        let r = GeometryMath.rotate(p, by: rotation)
        return CGPoint(x: CGFloat(r.x) * scale + offset.x, y: CGFloat(r.y) * scale + offset.y)
    }

    /// A view point back to world `(x, z)`, for hit-testing.
    func inverse(_ point: CGPoint) -> SIMD2<Float> {
        let r = SIMD2(Float((point.x - offset.x) / scale), Float((point.y - offset.y) / scale))
        return GeometryMath.rotate(r, by: -rotation)
    }

    /// The view rect covered by the fitted content bounds.
    var contentRect: CGRect {
        let a = CGPoint(x: CGFloat(worldMin.x) * scale + offset.x, y: CGFloat(worldMin.y) * scale + offset.y)
        let b = CGPoint(x: CGFloat(worldMax.x) * scale + offset.x, y: CGFloat(worldMax.y) * scale + offset.y)
        return CGRect(x: min(a.x, b.x), y: min(a.y, b.y), width: abs(b.x - a.x), height: abs(b.y - a.y))
    }

    /// Converts a world length in meters to points.
    func points(_ meters: Float) -> CGFloat { CGFloat(meters) * scale }

    /// Floor polygons, wall endpoints and object footprints: everything the plan can draw.
    static func contentPoints(of geometry: ScanGeometry) -> [SIMD2<Float>] {
        var points = geometry.rooms.flatMap(\.floorPolygon)
        for wall in geometry.renderWalls {
            let segment = wall.planSegment
            points.append(segment.start)
            points.append(segment.end)
        }
        points += geometry.renderObjects.flatMap(\.footprint)
        return points
    }
}
