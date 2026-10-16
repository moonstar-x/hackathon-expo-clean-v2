import AVFoundation
import RoomPlan
import UIKit

enum DeviceCapabilities {
    /// True on devices with a LiDAR scanner that RoomPlan supports. Always false in the Simulator.
    static var supportsRoomCapture: Bool {
        RoomCaptureSession.isSupported
    }

    /// True when the USDZ export from RoomPlan can run. It needs a real device.
    static var supportsUSDZExport: Bool {
        #if targetEnvironment(simulator)
        false
        #else
        true
        #endif
    }
}

enum CameraPermission {
    enum Status { case authorized, denied }

    /// Checks camera access and asks for it when the user hasn't decided yet (CAP-1).
    static func request() async -> Status {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return .authorized
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            return granted ? .authorized : .denied
        case .denied, .restricted:
            return .denied
        @unknown default:
            return .denied
        }
    }

    @MainActor
    static func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}
