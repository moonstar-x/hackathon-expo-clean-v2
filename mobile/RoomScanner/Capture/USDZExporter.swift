import Foundation
import RoomPlan

/// Exports the RoomPlan model as USDZ with parametric options (§7.7.4). Device only.
enum USDZExporter {
    enum ExportError: Error, LocalizedError {
        case nothingToExport

        var errorDescription: String? {
            String(localized: "capture.error.nothingToExport")
        }
    }

    /// The structure is exported when it exists. Otherwise a location with exactly one raw room
    /// exports that room. In every other case, the share item is hidden.
    static func canExport(_ raw: StoredRawData) -> Bool {
        guard DeviceCapabilities.supportsUSDZExport else { return false }
        if raw.structureJSON != nil { return true }
        return raw.rooms.count == 1 && raw.rooms[0].capturedRoomJSON != nil
    }

    static func export(_ raw: StoredRawData, fileName: String) throws -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(fileName)
            .appendingPathExtension("usdz")
        try? FileManager.default.removeItem(at: url)

        if let json = raw.structureJSON {
            let structure = try RoomPlanCoding.decodeStructure(from: json)
            try structure.export(to: url, exportOptions: .parametric)
        } else if raw.rooms.count == 1, let json = raw.rooms[0].capturedRoomJSON {
            let room = try RoomPlanCoding.decodeRoom(from: json)
            try room.export(to: url, exportOptions: .parametric)
        } else {
            throw ExportError.nothingToExport
        }
        return url
    }
}
