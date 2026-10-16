import Foundation
import UIKit

struct UploadMetadata: Codable, Sendable {
    struct Footprint: Codable, Sendable { var width: Float; var length: Float }
    struct Room: Codable, Sendable {
        var id: UUID; var index: Int; var name: String; var type: String?
        var floorArea: Float?; var isFloorApproximate: Bool; var perimeter: Float; var ceilingHeight: Float?
        var wallCount: Int; var doorCount: Int; var windowCount: Int; var openingCount: Int; var objectCount: Int
        // Contract requires explicit nulls for unknown values (JSONEncoder omits nil by default).
        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(id, forKey: .id); try c.encode(index, forKey: .index); try c.encode(name, forKey: .name)
            try c.encode(type, forKey: .type); try c.encode(floorArea, forKey: .floorArea)
            try c.encode(isFloorApproximate, forKey: .isFloorApproximate); try c.encode(perimeter, forKey: .perimeter)
            try c.encode(ceilingHeight, forKey: .ceilingHeight); try c.encode(wallCount, forKey: .wallCount)
            try c.encode(doorCount, forKey: .doorCount); try c.encode(windowCount, forKey: .windowCount)
            try c.encode(openingCount, forKey: .openingCount); try c.encode(objectCount, forKey: .objectCount)
        }
    }
    var clientId: UUID; var name: String; var scannedAt: Date; var footprint: Footprint?
    var isMerged: Bool; var geometryVersion: Int; var rooms: [Room]; var appVersion: String; var deviceModel: String
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(clientId, forKey: .clientId); try c.encode(name, forKey: .name); try c.encode(scannedAt, forKey: .scannedAt)
        try c.encode(footprint, forKey: .footprint); try c.encode(isMerged, forKey: .isMerged)
        try c.encode(geometryVersion, forKey: .geometryVersion); try c.encode(rooms, forKey: .rooms)
        try c.encode(appVersion, forKey: .appVersion); try c.encode(deviceModel, forKey: .deviceModel)
    }
}
struct UploadPayload: Sendable {
    var metadata: Data
    var files: [UploadFile]
}
struct UploadPayloadBuilder: Sendable {
    enum BuildError: Error, LocalizedError {
        case missingGeometry, renderingFailed
        var errorDescription: String? { String(localized: .syncPayloadError) }
    }
    func build(_ snapshot: UploadSnapshot) async throws -> UploadPayload {
        let geometry: ScanGeometry
        do { geometry = try ScanGeometry.decode(from: snapshot.geometryJSON) }
        catch { throw BuildError.missingGeometry }
        let names = Dictionary(snapshot.raw.rooms.map { ($0.id, $0.name) }, uniquingKeysWith: { first, _ in first })
        let defaults = RoomNaming.defaultNames(for: geometry.rooms.map(\.detectedType))
        let roomNames = geometry.rooms.enumerated().map { names[$0.element.id] ?? defaults[$0.offset] }
        // Only image rendering hops to the main actor; JSON, CSV and USDZ work runs on this executor.
        guard let plan = await FloorPlanImageRenderer.exportPNG(for: geometry, roomNames: Dictionary(zip(geometry.rooms.map(\.id), roomNames), uniquingKeysWith: { first, _ in first }), unitSystem: .metric) else { throw BuildError.renderingFailed }
        let footprint = LocationMetrics.footprint(of: geometry).map { UploadMetadata.Footprint(width: $0.width, length: $0.length) }
        let info = Bundle.main.infoDictionary ?? [:]
        var machine = utsname(); uname(&machine)
        let device = withUnsafeBytes(of: machine.machine) { String(decoding: $0.prefix(while: { $0 != 0 }), as: UTF8.self) }
        let metadata = UploadMetadata(clientId: snapshot.id, name: snapshot.name, scannedAt: snapshot.createdAt, footprint: footprint,
            isMerged: geometry.merged != nil, geometryVersion: geometry.version,
            rooms: geometry.rooms.enumerated().map { i, r in
                UploadMetadata.Room(id: r.id, index: i, name: roomNames[i], type: r.detectedType?.rawValue,
                    floorArea: RoomMetrics.floorArea(of: r), isFloorApproximate: r.isFloorApproximate,
                    perimeter: RoomMetrics.perimeter(of: r), ceilingHeight: RoomMetrics.ceilingHeight(of: r),
                    wallCount: r.walls.count, doorCount: r.doors.count, windowCount: r.windows.count,
                    openingCount: r.openings.count, objectCount: r.objects.count)
            }, appVersion: "\(info["CFBundleShortVersionString"] as? String ?? "?") (\(info["CFBundleVersion"] as? String ?? "?"))", deviceModel: device)
        var files = [UploadFile(name: "geometry", filename: "geometry.json", contentType: "application/json", data: snapshot.geometryJSON),
                     UploadFile(name: "floorPlan", filename: "floor-plan.png", contentType: "image/png", data: plan)]
        if let thumbnail = snapshot.thumbnailPNG { files.append(.init(name: "thumbnail", filename: "thumbnail.png", contentType: "image/png", data: thumbnail)) }
        files.append(.init(name: "csv", filename: "measurements.csv", contentType: "text/csv; charset=utf-8", data: Data(MeasurementsCSV.make(geometry: geometry, roomNames: roomNames).utf8)))
        if USDZExporter.canExport(snapshot.raw) {
            do {
                let url = try USDZExporter.export(snapshot.raw, fileName: "upload-\(UUID())")
                defer { try? FileManager.default.removeItem(at: url) }
                files.append(.init(name: "model", filename: "model.usdz", contentType: "model/vnd.usdz+zip", data: try Data(contentsOf: url)))
            } catch { Log.capture.error("Upload USDZ export failed: \(error)") }
        }
        let rawRooms: [[String: Any]] = try snapshot.raw.rooms.compactMap { room in
            guard let data = room.capturedRoomJSON else { return nil }
            return ["id": room.id.uuidString, "capturedRoom": try JSONSerialization.jsonObject(with: data)]
        }
        let structure = try snapshot.raw.structureJSON.map { try JSONSerialization.jsonObject(with: $0) }
        if structure != nil || !rawRooms.isEmpty {
            let raw: [String: Any] = ["format": "roomplan-raw", "version": 1, "structure": structure ?? NSNull(), "rooms": rawRooms]
            files.append(.init(name: "raw", filename: "raw.json", contentType: "application/json", data: try JSONSerialization.data(withJSONObject: raw, options: [.sortedKeys])))
        }
        return UploadPayload(metadata: try APICoding.encoder().encode(metadata), files: files)
    }
}
