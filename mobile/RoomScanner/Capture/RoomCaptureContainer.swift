import RoomPlan
import SwiftUI

/// Embeds the controller's `RoomCaptureView`, which provides RoomPlan's coaching and live 3D
/// visualization (CAP-2). It never creates a new view on updates.
struct RoomCaptureContainer: UIViewRepresentable {
    let captureView: RoomCaptureView

    func makeUIView(context: Context) -> RoomCaptureView {
        captureView
    }

    func updateUIView(_ uiView: RoomCaptureView, context: Context) {}
}
