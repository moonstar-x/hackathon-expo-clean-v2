import Foundation
import SceneKit
import Testing
import UIKit
@testable import RoomScanner

@Suite("Rendering")
@MainActor
struct FloorPlanRenderingTests {
    @Test func thumbnailIs120PointsAt3x() throws {
        let data = try #require(FloorPlanImageRenderer.thumbnailPNG(for: SampleGeometry.twoRoomApartment()))
        let image = try #require(UIImage(data: data))
        #expect(image.size.width * image.scale == 360)
        #expect(image.size.height * image.scale == 360)
    }

    @Test func exportIs1600PointsOnTheLongestSide() throws {
        let data = try #require(FloorPlanImageRenderer.exportPNG(
            for: SampleGeometry.twoRoomApartment(), roomNames: [:], unitSystem: .metric))
        let image = try #require(UIImage(data: data))
        let pixels = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
        #expect(max(pixels.width, pixels.height) == 4800)
        // Kept for manual inspection when debugging the export.
        try data.write(to: FileManager.default.temporaryDirectory.appendingPathComponent("floorplan-export.png"))
    }

    @Test func sceneHasNodesForEverySurfaceAndACamera() {
        let geometry = SampleGeometry.twoRoomApartment()
        let result = SceneBuilder.build(geometry, showObjects: false)
        let objects = result.scene.rootNode.childNode(withName: SceneBuilder.objectsNodeName, recursively: true)
        #expect(objects?.isHidden == true)
        #expect(objects?.childNodes.count == geometry.renderObjects.count)
        #expect(result.camera.camera != nil)
        // Floors + walls + doors + windows + the objects group, under the rotated content node.
        let content = result.scene.rootNode.childNodes.first { $0.childNode(withName: SceneBuilder.objectsNodeName, recursively: false) != nil }
        let expected = geometry.rooms.count + geometry.renderWalls.count + geometry.renderDoors.count
            + geometry.renderWindows.count + 1
        #expect(content?.childNodes.count == expected)
    }
}
