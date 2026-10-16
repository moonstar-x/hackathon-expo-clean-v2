import CoreGraphics
import Foundation
import Testing
import simd
@testable import RoomScanner

@Suite("FloorPlanLayout")
struct FloorPlanLayoutTests {
    static let sizes = [CGSize(width: 390, height: 600), CGSize(width: 600, height: 300), CGSize(width: 120, height: 120)]

    private func contentRect(_ layout: FloorPlanLayout, _ geometry: ScanGeometry) -> CGRect {
        let points = FloorPlanLayout.contentPoints(of: geometry).map(layout.apply)
        let xs = points.map(\.x)
        let ys = points.map(\.y)
        return CGRect(x: xs.min() ?? 0, y: ys.min() ?? 0,
                      width: (xs.max() ?? 0) - (xs.min() ?? 0), height: (ys.max() ?? 0) - (ys.min() ?? 0))
    }

    @Test(arguments: sizes)
    func fittedContentStaysInsidePadding(size: CGSize) {
        let geometry = SampleGeometry.twoRoomApartment()
        let padding: CGFloat = 24
        let layout = FloorPlanLayout(geometry: geometry, size: size, padding: padding)
        let allowed = CGRect(origin: .zero, size: size).insetBy(dx: padding - 0.01, dy: padding - 0.01)
        let rect = contentRect(layout, geometry)
        #expect(allowed.contains(rect), "\(rect) is outside \(allowed)")
        // The content fills the limiting dimension.
        let fillsWidth = abs(rect.width - (size.width - 2 * padding)) < 0.5
        let fillsHeight = abs(rect.height - (size.height - 2 * padding)) < 0.5
        #expect(fillsWidth || fillsHeight)
    }

    @Test(arguments: sizes)
    func aspectRatioIsPreserved(size: CGSize) {
        let geometry = SampleGeometry.twoRoomApartment()
        let layout = FloorPlanLayout(geometry: geometry, size: size, padding: 8)
        let rect = contentRect(layout, geometry)
        // The apartment is 8.5 × 4.0 m.
        #expect(abs(rect.width / rect.height - 8.5 / 4.0) < 0.001)
    }

    @Test(arguments: sizes)
    func contentIsCentered(size: CGSize) {
        let geometry = SampleGeometry.rotated(SampleGeometry.lShapedRoom(), by: 0.3)
        let layout = FloorPlanLayout(geometry: geometry, size: size, padding: 24)
        let rect = contentRect(layout, geometry)
        #expect(abs(rect.midX - size.width / 2) < 0.01)
        #expect(abs(rect.midY - size.height / 2) < 0.01)
    }

    @Test func inverseUndoesApply() {
        let geometry = SampleGeometry.rotated(SampleGeometry.twoRoomApartment(), by: 0.45)
        let layout = FloorPlanLayout(geometry: geometry, size: CGSize(width: 390, height: 500), padding: 24,
                                     zoom: 2.5, pan: CGSize(width: -40, height: 17))
        for point in [SIMD2<Float>(0, 0), SIMD2(3.2, -1.7), SIMD2(8.5, 4), SIMD2(-2, 6)] {
            #expect(simd_distance(layout.inverse(layout.apply(point)), point) < 1e-4)
        }
    }

    @Test func zoomScalesAboutTheViewCenter() {
        let geometry = SampleGeometry.twoRoomApartment()
        let size = CGSize(width: 400, height: 400)
        let fitted = FloorPlanLayout(geometry: geometry, size: size, padding: 24)
        let zoomed = FloorPlanLayout(geometry: geometry, size: size, padding: 24, zoom: 2)
        #expect(abs(zoomed.scale - fitted.scale * 2) < 1e-6)
        // The world point at the view center stays put.
        let center = fitted.inverse(CGPoint(x: 200, y: 200))
        let p = zoomed.apply(center)
        #expect(abs(p.x - 200) < 1e-3 && abs(p.y - 200) < 1e-3)
    }

    @Test func emptyGeometryHasFiniteScale() {
        let layout = FloorPlanLayout(geometry: .empty, size: CGSize(width: 100, height: 100), padding: 8)
        #expect(layout.scale.isFinite && layout.scale > 0)
    }

    @Test func rotationSquaresUpThePlan() {
        let geometry = SampleGeometry.rotated(SampleGeometry.twoRoomApartment(), by: 0.5)
        let layout = FloorPlanLayout(geometry: geometry, size: CGSize(width: 400, height: 400), padding: 0)
        let extent = layout.worldMax - layout.worldMin
        let sides = [extent.x, extent.y].sorted()
        #expect(abs(sides[0] - 4.0) < 0.05)
        #expect(abs(sides[1] - 8.5) < 0.05)
    }
}
