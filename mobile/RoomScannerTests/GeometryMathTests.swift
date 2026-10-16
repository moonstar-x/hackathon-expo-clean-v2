import Foundation
import Testing
import simd
@testable import RoomScanner

private func approx(_ a: Float, _ b: Float, tolerance: Float = 1e-4) -> Bool {
    abs(a - b) <= tolerance
}

private func approx(_ a: SIMD2<Float>, _ b: SIMD2<Float>, tolerance: Float = 1e-4) -> Bool {
    simd_distance(a, b) <= tolerance
}

private let rectangle: [SIMD2<Float>] = [SIMD2(0, 0), SIMD2(5, 0), SIMD2(5, 4), SIMD2(0, 4)]
private let lShape: [SIMD2<Float>] = [SIMD2(0, 0), SIMD2(4, 0), SIMD2(4, 2), SIMD2(2, 2), SIMD2(2, 5), SIMD2(0, 5)]

@Suite("GeometryMath")
struct GeometryMathTests {
    @Test func shoelaceAreaOfRectangle() throws {
        let area = try #require(GeometryMath.area(rectangle))
        #expect(approx(area, 20.0))
    }

    @Test func lShapeAreaAndPerimeter() throws {
        let area = try #require(GeometryMath.area(lShape))
        #expect(approx(area, 14.0))
        #expect(approx(GeometryMath.perimeter(lShape), 18.0))
    }

    @Test func areaIgnoresWinding() throws {
        let clockwise = try #require(GeometryMath.area(Array(lShape.reversed())))
        let counterClockwise = try #require(GeometryMath.area(lShape))
        #expect(approx(clockwise, counterClockwise))
        #expect(GeometryMath.signedArea(lShape) == -GeometryMath.signedArea(Array(lShape.reversed())))
    }

    @Test func areaNeedsThreePoints() {
        #expect(GeometryMath.area([]) == nil)
        #expect(GeometryMath.area([SIMD2(0, 0), SIMD2(1, 0)]) == nil)
    }

    @Test func centroidOfRectangleIsItsCenter() throws {
        let centroid = try #require(GeometryMath.centroid(rectangle))
        #expect(approx(centroid, SIMD2(2.5, 2)))
        let reversed = try #require(GeometryMath.centroid(Array(rectangle.reversed())))
        #expect(approx(reversed, SIMD2(2.5, 2)))
    }

    @Test func centroidOfLShapeIsAreaWeighted() throws {
        // Split into [0,4]×[0,2] (area 8, center (2,1)) and [0,2]×[2,5] (area 6, center (1,3.5)).
        let expected = (SIMD2<Float>(2, 1) * 8 + SIMD2<Float>(1, 3.5) * 6) / 14
        let centroid = try #require(GeometryMath.centroid(lShape))
        #expect(approx(centroid, expected))
    }

    @Test func convexHullOfPointCloud() {
        var points: [SIMD2<Float>] = [SIMD2(0, 0), SIMD2(4, 0), SIMD2(4, 3), SIMD2(0, 3)]
        // Interior points, a duplicate and a collinear edge point must be dropped.
        points += [SIMD2(1, 1), SIMD2(2, 2), SIMD2(3, 1.5), SIMD2(4, 0), SIMD2(2, 0)]
        let hull = GeometryMath.convexHull(points.shuffled())
        #expect(hull.count == 4)
        for corner in [SIMD2<Float>(0, 0), SIMD2(4, 0), SIMD2(4, 3), SIMD2(0, 3)] {
            #expect(hull.contains { approx($0, corner) })
        }
        #expect(GeometryMath.signedArea(hull) > 0, "The hull is counter-clockwise")
    }

    @Test(arguments: [
        (SIMD2<Float>(1, 1), true),     // inside the bottom bar
        (SIMD2<Float>(1, 4), true),     // inside the vertical bar
        (SIMD2<Float>(3, 4), false),    // in the notch
        (SIMD2<Float>(5, 1), false),    // outside, to the right
        (SIMD2<Float>(-1, 2), false),   // outside, to the left
    ])
    func pointInLShape(point: SIMD2<Float>, inside: Bool) {
        #expect(GeometryMath.contains(lShape, point: point) == inside)
    }

    @Test func rotationMatrixMatches2DRotation() {
        let angle: Float = 0.7
        let m = GeometryMath.planRotationMatrix(angle)
        let p = SIMD2<Float>(3, -2)
        let rotated = m * SIMD4(p.x, 1.5, p.y, 1)
        #expect(approx(SIMD2(rotated.x, rotated.z), GeometryMath.rotate(p, by: angle)))
        #expect(approx(rotated.y, 1.5))
    }
}

@Suite("Surface projection")
struct SurfaceProjectionTests {
    @Test func wallRotated90DegreesProjectsToVerticalSegment() {
        // A 4 m wide wall centered at (1, 1.25, 2), rotated 90° about +Y.
        var m = simd_float4x4(simd_quatf(angle: .pi / 2, axis: SIMD3(0, 1, 0)))
        m.columns.3 = SIMD4(1, 1.25, 2, 1)
        let wall = SurfaceGeometry(id: UUID(), kind: .wall, isOpen: nil, transform: Transform(m),
                                   dimensions: SIMD3(4, 2.5, 0))
        let segment = wall.planSegment
        let expected: [SIMD2<Float>] = [SIMD2(1, 0), SIMD2(1, 4)]
        // Compare as an unordered set.
        #expect(expected.allSatisfy { e in approx(segment.start, e) || approx(segment.end, e) })
        #expect(!approx(segment.start, segment.end))
        #expect(approx(wall.baseElevation, 0))
    }

    @Test func objectFootprintAfterRotation() {
        // A 2 × 1 m object at (3, 0.4, 3), turned 90° in plan.
        let object = SampleGeometry.object(.table, center: SIMD2(3, 3), yaw: .pi / 2,
                                           width: 2, height: 0.8, depth: 1)
        let footprint = object.footprint
        #expect(footprint.count == 4)
        let expected: [SIMD2<Float>] = [SIMD2(2.5, 2), SIMD2(3.5, 2), SIMD2(3.5, 4), SIMD2(2.5, 4)]
        for corner in expected {
            #expect(footprint.contains { approx($0, corner) }, "Missing corner \(corner)")
        }
    }
}

@Suite("Plan rotation")
struct PlanRotationTests {
    @Test(arguments: [Float(30), 12, -40, 75])
    func rotatedApartmentIsSquaredUp(degrees: Float) {
        let geometry = SampleGeometry.rotated(SampleGeometry.twoRoomApartment(), by: degrees * .pi / 180)
        let rotation = GeometryMath.planRotation(for: geometry.renderWalls)
        for wall in geometry.renderWalls {
            guard let axis = wall.planAxis else { continue }
            let squared = GeometryMath.rotate(axis, by: rotation)
            var angle = atan2(squared.y, squared.x) * 180 / .pi
            angle = angle.truncatingRemainder(dividingBy: 90)
            if angle < 0 { angle += 90 }
            let offAxis = min(angle, 90 - angle)
            #expect(offAxis < 0.5, "Wall is \(offAxis)° off axis")
        }
    }

    @Test func noWallsMeansNoRotation() {
        #expect(GeometryMath.planRotation(for: []) == 0)
    }

    @Test func alignedApartmentNeedsNoRotation() {
        let rotation = GeometryMath.planRotation(for: SampleGeometry.twoRoomApartment().renderWalls)
        #expect(abs(rotation) < 1e-5)
    }
}
