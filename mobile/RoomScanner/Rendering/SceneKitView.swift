import SceneKit
import SwiftUI

/// A `UIViewRepresentable` around `SCNView` with turntable camera control (§9.2).
struct SceneKitView: UIViewRepresentable {
    var model: SceneBuilder.Result
    var showObjects: Bool
    /// Change this value to put the camera back at its initial pose.
    var resetToken: Int
    var accessibilityLabel: String

    final class Coordinator {
        var resetToken: Int?
        var activeCamera: SCNNode?
        weak var scene: SCNScene?
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.backgroundColor = .systemBackground
        view.autoenablesDefaultLighting = true
        view.allowsCameraControl = true
        view.antialiasingMode = .multisampling4X
        view.defaultCameraController.interactionMode = .orbitTurntable
        view.defaultCameraController.maximumVerticalAngle = 89
        view.isAccessibilityElement = true
        view.accessibilityTraits = .image
        updateUIView(view, context: context)
        return view
    }

    func updateUIView(_ view: SCNView, context: Context) {
        let coordinator = context.coordinator
        if coordinator.scene !== model.scene {
            view.scene = model.scene
            coordinator.scene = model.scene
            coordinator.activeCamera = nil
            resetCamera(view, coordinator: coordinator)
        } else if coordinator.resetToken != resetToken {
            resetCamera(view, coordinator: coordinator)
        }
        coordinator.resetToken = resetToken
        model.scene.rootNode.childNode(withName: SceneBuilder.objectsNodeName, recursively: true)?
            .isHidden = !showObjects
        view.accessibilityLabel = accessibilityLabel
        view.accessibilityHint = String(localized: "common.seeMeasurementsHint")
    }

    /// Replaces the point of view with a fresh copy of the initial camera. There's no animation,
    /// which also respects Reduce Motion.
    private func resetCamera(_ view: SCNView, coordinator: Coordinator) {
        coordinator.activeCamera?.removeFromParentNode()
        let camera = model.camera.clone()
        camera.name = "activeCamera"
        camera.camera = model.camera.camera?.copy() as? SCNCamera
        model.scene.rootNode.addChildNode(camera)
        view.pointOfView = camera
        view.defaultCameraController.target = SCNVector3(model.target)
        coordinator.activeCamera = camera
    }
}

#Preview {
    SceneKitView(model: SceneBuilder.build(SampleGeometry.twoRoomApartment(), showObjects: true),
                 showObjects: true, resetToken: 0, accessibilityLabel: "Modelo 3D")
}
