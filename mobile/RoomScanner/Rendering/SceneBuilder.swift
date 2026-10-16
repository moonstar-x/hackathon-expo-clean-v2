import SceneKit
import UIKit
import simd

/// Builds the 3D model of a location from `ScanGeometry` (§9.2).
///
/// SceneKit is deprecated, so it's confined to this file and `SceneKitView.swift`.
enum SceneBuilder {
    static let objectsNodeName = "objects"
    static let cameraNodeName = "initialCamera"

    struct Result {
        var scene: SCNScene
        /// The initial camera. `SceneKitView` uses copies of it, so this node keeps its starting pose.
        var camera: SCNNode
        /// The point the camera orbits around, in world space.
        var target: SIMD3<Float>
    }

    static func makeScene(_ geometry: ScanGeometry, showObjects: Bool) -> SCNScene {
        build(geometry, showObjects: showObjects).scene
    }

    static func build(_ geometry: ScanGeometry, showObjects: Bool) -> Result {
        let scene = SCNScene()
        scene.background.contents = UIColor.systemBackground

        // Everything is placed under one node turned by the plan rotation, so the model is drawn
        // square to the screen, like the floor plan.
        let content = SCNNode()
        content.simdTransform = GeometryMath.planRotationMatrix(geometry.planRotation)
        scene.rootNode.addChildNode(content)

        for (index, room) in geometry.rooms.enumerated() {
            if let floor = floorNode(room, tint: roomTint(index)) {
                content.addChildNode(floor)
            }
        }
        for wall in geometry.renderWalls {
            content.addChildNode(surfaceNode(wall, depth: 0.10, material: material(wallColor)))
        }
        for door in geometry.renderDoors {
            content.addChildNode(surfaceNode(door, depth: 0.14, material: material(doorColor)))
        }
        for window in geometry.renderWindows {
            content.addChildNode(surfaceNode(window, depth: 0.14,
                                             material: material(windowColor, transparency: 0.5)))
        }
        let objects = SCNNode()
        objects.name = objectsNodeName
        objects.isHidden = !showObjects
        for object in geometry.renderObjects {
            objects.addChildNode(objectNode(object))
        }
        content.addChildNode(objects)

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 400
        scene.rootNode.addChildNode(ambient)

        let (center, extent) = bounds(of: geometry)
        let camera = makeCamera(lookingAt: center, extent: extent)
        scene.rootNode.addChildNode(camera)
        return Result(scene: scene, camera: camera, target: center)
    }

    // MARK: Nodes

    private static func surfaceNode(_ surface: SurfaceGeometry, depth: CGFloat, material: SCNMaterial) -> SCNNode {
        let box = SCNBox(width: CGFloat(surface.dimensions.x), height: CGFloat(surface.dimensions.y),
                         length: depth, chamferRadius: 0)
        box.materials = [material]
        let node = SCNNode(geometry: box)
        node.simdTransform = surface.transform.matrix
        return node
    }

    private static func objectNode(_ object: ObjectGeometry) -> SCNNode {
        let box = SCNBox(width: CGFloat(object.width), height: CGFloat(object.height),
                         length: CGFloat(object.depth), chamferRadius: 0.01)
        let color: UIColor = switch object.category.group {
        case .furniture: UIColor(red: 0.55, green: 0.62, blue: 0.72, alpha: 1)
        case .appliance: UIColor(red: 0.62, green: 0.68, blue: 0.62, alpha: 1)
        case .fixture: UIColor(red: 0.72, green: 0.66, blue: 0.58, alpha: 1)
        }
        box.materials = [material(color, transparency: 0.9)]
        let node = SCNNode(geometry: box)
        node.simdTransform = object.transform.matrix
        return node
    }

    /// The floor as an extruded `SCNShape`. The path uses `(x, −z)` because rotating −90° about X
    /// maps local `(px, py, 0)` to world `(px, 0, −py)`.
    private static func floorNode(_ room: RoomGeometry, tint: UIColor) -> SCNNode? {
        guard room.floorPolygon.count >= 3, let first = room.floorPolygon.first else { return nil }
        let path = UIBezierPath()
        path.move(to: CGPoint(x: CGFloat(first.x), y: CGFloat(-first.y)))
        for point in room.floorPolygon.dropFirst() {
            path.addLine(to: CGPoint(x: CGFloat(point.x), y: CGFloat(-point.y)))
        }
        path.close()
        // The default flatness (0.6) is coarse for room-sized shapes.
        path.flatness = 0.01

        let shape = SCNShape(path: path, extrusionDepth: 0.02)
        shape.materials = [material(tint)]
        let node = SCNNode(geometry: shape)
        node.eulerAngles.x = -.pi / 2
        node.simdPosition.y = RoomMetrics.floorElevation(of: room)
        return node
    }

    private static func makeCamera(lookingAt center: SIMD3<Float>, extent: Float) -> SCNNode {
        let camera = SCNCamera()
        camera.fieldOfView = 45
        // Apply the field of view across the narrow (portrait) side, so the whole model fits.
        camera.projectionDirection = .horizontal
        camera.zNear = 0.05
        camera.zFar = Double(max(extent * 10, 100))
        let node = SCNNode()
        node.name = cameraNodeName
        node.camera = camera
        let direction = simd_normalize(SIMD3<Float>(1, 1.2, 1))
        node.simdPosition = center + direction * (1.6 * extent)
        node.simdLook(at: center)
        return node
    }

    // MARK: Helpers

    private static let wallColor = UIColor(white: 0.86, alpha: 1)
    private static let doorColor = UIColor(red: 0.62, green: 0.43, blue: 0.28, alpha: 1)
    private static let windowColor = UIColor(red: 0.62, green: 0.82, blue: 1.0, alpha: 1)

    /// The world-space bounding box center and largest extent, after the plan rotation.
    static func bounds(of geometry: ScanGeometry) -> (center: SIMD3<Float>, extent: Float) {
        let points = FloorPlanLayout.contentPoints(of: geometry)
            .map { GeometryMath.rotate($0, by: geometry.planRotation) }
        guard let plan = GeometryMath.bounds(points) else { return (.zero, 4) }
        let walls = geometry.renderWalls
        let bottom = walls.map(\.baseElevation).min() ?? 0
        let top = walls.map { $0.baseElevation + $0.height }.max() ?? (bottom + 2.5)
        let center = SIMD3((plan.min.x + plan.max.x) / 2, (bottom + top) / 2, (plan.min.y + plan.max.y) / 2)
        let extent = max(plan.max.x - plan.min.x, plan.max.y - plan.min.y, top - bottom, 1)
        return (center, extent)
    }

    private static func material(_ color: UIColor, transparency: CGFloat = 1) -> SCNMaterial {
        let material = SCNMaterial()
        material.lightingModel = .blinn
        material.diffuse.contents = color
        material.transparency = transparency
        material.isDoubleSided = true
        return material
    }

    private static func roomTint(_ index: Int) -> UIColor {
        let palette: [UIColor] = [.systemBlue, .systemGreen, .systemOrange, .systemPurple,
                                  .systemPink, .systemTeal, .systemYellow, .systemMint]
        return palette[index % palette.count].withAlphaComponent(0.6)
    }
}
