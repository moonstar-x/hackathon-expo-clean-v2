import Foundation
import simd

/// Pure 2D and 3D helpers for plan geometry. Plan points are world `(x, z)` pairs stored in `SIMD2<Float>`.
enum GeometryMath {
    // MARK: Polygons

    /// Signed shoelace area: positive for counter-clockwise polygons in (x, z).
    static func signedArea(_ polygon: [SIMD2<Float>]) -> Float {
        guard polygon.count >= 3 else { return 0 }
        var sum: Float = 0
        for i in polygon.indices {
            let a = polygon[i]
            let b = polygon[(i + 1) % polygon.count]
            sum += a.x * b.y - b.x * a.y
        }
        return sum / 2
    }

    /// `½·|Σ(xᵢ·zᵢ₊₁ − xᵢ₊₁·zᵢ)|`. nil when the polygon has fewer than 3 points.
    static func area(_ polygon: [SIMD2<Float>]) -> Float? {
        guard polygon.count >= 3 else { return nil }
        return abs(signedArea(polygon))
    }

    /// Length of the closed outline.
    static func perimeter(_ polygon: [SIMD2<Float>]) -> Float {
        guard polygon.count >= 2 else { return 0 }
        var sum: Float = 0
        for i in polygon.indices {
            sum += simd_distance(polygon[i], polygon[(i + 1) % polygon.count])
        }
        return sum
    }

    /// Area-weighted centroid. Falls back to the vertex mean for degenerate polygons.
    static func centroid(_ polygon: [SIMD2<Float>]) -> SIMD2<Float>? {
        guard !polygon.isEmpty else { return nil }
        let signed = signedArea(polygon)
        guard abs(signed) > 1e-6 else {
            return polygon.reduce(.zero, +) / Float(polygon.count)
        }
        var c = SIMD2<Float>.zero
        for i in polygon.indices {
            let a = polygon[i]
            let b = polygon[(i + 1) % polygon.count]
            let cross = a.x * b.y - b.x * a.y
            c += (a + b) * cross
        }
        return c / (6 * signed)
    }

    /// Convex hull (Andrew's monotone chain), counter-clockwise, without collinear points.
    static func convexHull(_ points: [SIMD2<Float>]) -> [SIMD2<Float>] {
        let sorted = points.sorted { $0.x != $1.x ? $0.x < $1.x : $0.y < $1.y }
        guard sorted.count >= 3 else { return sorted }

        func cross(_ o: SIMD2<Float>, _ a: SIMD2<Float>, _ b: SIMD2<Float>) -> Float {
            (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
        }

        var lower: [SIMD2<Float>] = []
        for p in sorted {
            while lower.count >= 2, cross(lower[lower.count - 2], lower[lower.count - 1], p) <= 1e-9 {
                lower.removeLast()
            }
            lower.append(p)
        }
        var upper: [SIMD2<Float>] = []
        for p in sorted.reversed() {
            while upper.count >= 2, cross(upper[upper.count - 2], upper[upper.count - 1], p) <= 1e-9 {
                upper.removeLast()
            }
            upper.append(p)
        }
        return Array(lower.dropLast() + upper.dropLast())
    }

    /// Even-odd ray casting. Points exactly on an edge may fall either way.
    static func contains(_ polygon: [SIMD2<Float>], point p: SIMD2<Float>) -> Bool {
        guard polygon.count >= 3 else { return false }
        var inside = false
        var j = polygon.count - 1
        for i in polygon.indices {
            let a = polygon[i]
            let b = polygon[j]
            if (a.y > p.y) != (b.y > p.y) {
                let xCross = (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x
                if p.x < xCross { inside.toggle() }
            }
            j = i
        }
        return inside
    }

    // MARK: Rotation

    /// Rotates a plan point by `angle` radians in the (x, z) plane: the angle `atan2(z, x)` grows by `angle`.
    static func rotate(_ p: SIMD2<Float>, by angle: Float) -> SIMD2<Float> {
        let c = cos(angle)
        let s = sin(angle)
        return SIMD2(p.x * c - p.y * s, p.x * s + p.y * c)
    }

    /// The 3D rotation about +Y that acts on (x, z) exactly like `rotate(_:by:)`.
    static func planRotationMatrix(_ angle: Float) -> simd_float4x4 {
        let c = cos(angle)
        let s = sin(angle)
        return simd_float4x4(
            SIMD4(c, 0, s, 0),
            SIMD4(0, 1, 0, 0),
            SIMD4(-s, 0, c, 0),
            SIMD4(0, 0, 0, 1)
        )
    }

    /// Plan rotation (§6.4): the length-weighted circular mean of wall angles modulo 90°, negated.
    static func planRotation(for walls: [SurfaceGeometry]) -> Float {
        var c: Float = 0
        var s: Float = 0
        for wall in walls {
            let length = wall.dimensions.x
            guard length > 0, let axis = wall.planAxis else { continue }
            let theta = atan2(axis.y, axis.x)
            c += length * cos(4 * theta)
            s += length * sin(4 * theta)
        }
        guard abs(c) > 1e-9 || abs(s) > 1e-9 else { return 0 }
        return -(atan2(s, c) / 4)
    }

    /// Axis-aligned bounds of a set of plan points.
    static func bounds(_ points: [SIMD2<Float>]) -> (min: SIMD2<Float>, max: SIMD2<Float>)? {
        guard let first = points.first else { return nil }
        var lo = first
        var hi = first
        for p in points.dropFirst() {
            lo = simd_min(lo, p)
            hi = simd_max(hi, p)
        }
        return (lo, hi)
    }
}

// MARK: - Surface and object projection (§6.2)

extension SurfaceGeometry {
    /// Plan center `(m.c3.x, m.c3.z)`.
    var planCenter: SIMD2<Float> {
        SIMD2(transform.c3.x, transform.c3.z)
    }

    /// Unit direction along the surface in plan, from the transform's first column.
    var planAxis: SIMD2<Float>? {
        let axis = SIMD2(transform.c0.x, transform.c0.z)
        let length = simd_length(axis)
        guard length > 1e-6 else { return nil }
        return axis / length
    }

    /// Endpoints `center ± axis · width / 2`.
    var planSegment: (start: SIMD2<Float>, end: SIMD2<Float>) {
        let axis = planAxis ?? SIMD2(1, 0)
        let half = axis * (dimensions.x / 2)
        return (planCenter - half, planCenter + half)
    }

    var length: Float { dimensions.x }
    var height: Float { dimensions.y }

    /// `m.c3.y − height / 2`.
    var baseElevation: Float { transform.c3.y - dimensions.y / 2 }
}

extension ObjectGeometry {
    /// The four footprint corners projected to (x, z), in loop order.
    var footprint: [SIMD2<Float>] {
        let m = transform.matrix
        let w = dimensions.x / 2
        let d = dimensions.z / 2
        return [SIMD2(-w, -d), SIMD2(w, -d), SIMD2(w, d), SIMD2(-w, d)].map { corner in
            let p = m * SIMD4(corner.x, 0, corner.y, 1)
            return SIMD2(p.x, p.z)
        }
    }

    var width: Float { dimensions.x }
    var height: Float { dimensions.y }
    var depth: Float { dimensions.z }
}
