import SwiftUI
import UIKit

/// Renders `FloorPlanCanvas` to PNG for Home thumbnails and the floor plan export.
@MainActor
enum FloorPlanImageRenderer {
    static let thumbnailSize = CGSize(width: 120, height: 120)
    static let exportLongestSide: CGFloat = 1600
    static let exportPadding: CGFloat = 120

    /// A 120 × 120 pt thumbnail at 3× on white, without labels (§9.1).
    static func thumbnailPNG(for geometry: ScanGeometry) -> Data? {
        let view = FloorPlanCanvas(geometry: geometry, style: .thumbnail, background: .white)
            .frame(width: thumbnailSize.width, height: thumbnailSize.height)
            .environment(\.colorScheme, .light)
        return render(view, scale: 3)
    }

    /// The full plan at 1600 pt on the longest side, 3× scale, on white (§7.7.4).
    static func exportPNG(for geometry: ScanGeometry, roomNames: [UUID: String],
                          unitSystem: ResolvedUnitSystem) -> Data? {
        let probe = FloorPlanLayout(geometry: geometry, size: CGSize(width: 1000, height: 1000), padding: 0)
        let extent = probe.worldMax - probe.worldMin
        let aspect = CGFloat(extent.y / max(extent.x, .ulpOfOne))
        // Size the image around the plan, with room for the labels and the scale bar.
        let inner = exportLongestSide - 2 * exportPadding
        let size = aspect <= 1
            ? CGSize(width: exportLongestSide, height: inner * aspect + 2 * exportPadding)
            : CGSize(width: inner / aspect + 2 * exportPadding, height: exportLongestSide)

        let view = FloorPlanCanvas(geometry: geometry, style: .full, roomNames: roomNames,
                                   background: .white, unitSystem: unitSystem, contentPadding: exportPadding)
            .frame(width: size.width, height: size.height)
            .environment(\.colorScheme, .light)
            // The labels are sized for a phone screen; scale them up for a 1600 pt image.
            .environment(\.dynamicTypeSize, .accessibility3)
        return render(view, scale: 3)
    }

    private static func render(_ view: some View, scale: CGFloat) -> Data? {
        let renderer = ImageRenderer(content: view)
        renderer.scale = scale
        renderer.isOpaque = true
        guard let data = renderer.uiImage?.pngData() else {
            Log.ui.error("Floor plan rendering failed")
            return nil
        }
        return data
    }
}
