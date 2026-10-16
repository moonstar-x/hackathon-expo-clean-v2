import CoreTransferable
import SwiftUI
import UniformTypeIdentifiers

/// Share and export: floor plan PNG, measurements CSV and, on a device, the USDZ model (§7.7.4).
/// Files are produced only when the user picks a share target.
struct ShareMenu: View {
    var geometry: ScanGeometry
    var locationName: String
    var roomNames: [UUID: String]
    var unitSystem: ResolvedUnitSystem
    /// Raw data for the USDZ export, or nil to hide that item.
    var usdzSource: StoredRawData?

    var body: some View {
        Menu {
            ShareLink(item: FloorPlanImageExport(geometry: geometry, roomNames: roomNames,
                                                 unitSystem: unitSystem, fileName: baseFileName),
                      preview: SharePreview(String(localized: "share.floorPlan.preview \(locationName)"),
                                            image: Image(systemName: "map"))) {
                Label("share.floorPlan.menuItem", systemImage: "photo")
            }
            ShareLink(item: MeasurementsExport(csv: MeasurementsCSV.make(geometry: geometry, roomNames: orderedNames),
                                               fileName: baseFileName),
                      preview: SharePreview(String(localized: "share.measurements.preview \(locationName)"),
                                            image: Image(systemName: "tablecells"))) {
                Label("share.measurements.menuItem", systemImage: "tablecells")
            }
            if let usdzSource {
                ShareLink(item: ModelExport(raw: usdzSource, fileName: baseFileName),
                          preview: SharePreview(String(localized: "share.model.preview \(locationName)"),
                                                image: Image(systemName: "cube"))) {
                    Label("share.model.menuItem", systemImage: "cube")
                }
            }
        } label: {
            Label("share.menu", systemImage: "square.and.arrow.up")
        }
    }

    private var orderedNames: [String] {
        let defaults = RoomNaming.defaultNames(for: geometry.rooms.map(\.detectedType))
        return geometry.rooms.enumerated().map { index, room in roomNames[room.id] ?? defaults[index] }
    }

    /// The location name, made safe for a file name.
    private var baseFileName: String {
        let invalid = CharacterSet(charactersIn: "/\\?%*|\"<>:")
        let cleaned = locationName.components(separatedBy: invalid).joined(separator: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? String(localized: "share.defaultFileName") : cleaned
    }
}

// MARK: - Transferable exports

/// Writes `data` to a fresh file in the temporary directory.
private func temporaryFile(named name: String, data: Data) throws -> URL {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let url = directory.appendingPathComponent(name)
    try data.write(to: url, options: .atomic)
    return url
}

private enum ExportError: Error, LocalizedError {
    case renderingFailed

    var errorDescription: String? { String(localized: "share.error.imageFailed") }
}

/// The full floor plan at 1600 pt on the longest side, 3× scale, white background.
struct FloorPlanImageExport: Transferable {
    var geometry: ScanGeometry
    var roomNames: [UUID: String]
    var unitSystem: ResolvedUnitSystem
    var fileName: String

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .png) { item in
            let data = await MainActor.run {
                FloorPlanImageRenderer.exportPNG(for: item.geometry, roomNames: item.roomNames,
                                                 unitSystem: item.unitSystem)
            }
            guard let data else { throw ExportError.renderingFailed }
            return SentTransferredFile(try temporaryFile(named: String(localized: "share.floorPlan.fileName \(item.fileName)") + ".png", data: data))
        }
    }
}

struct MeasurementsExport: Transferable {
    var csv: String
    var fileName: String

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .commaSeparatedText) { item in
            SentTransferredFile(try temporaryFile(named: String(localized: "share.measurements.fileName \(item.fileName)") + ".csv", data: Data(item.csv.utf8)))
        }
    }
}

/// RoomPlan's parametric USDZ model. Device only.
struct ModelExport: Transferable {
    var raw: StoredRawData
    var fileName: String

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .usdz) { item in
            SentTransferredFile(try USDZExporter.export(item.raw, fileName: item.fileName))
        }
    }
}

#Preview {
    NavigationStack {
        Text("share.menu")
            .toolbar {
                ShareMenu(geometry: SampleGeometry.twoRoomApartment(), locationName: "Departamento",
                          roomNames: [:], unitSystem: .metric, usdzSource: nil)
            }
    }
}
