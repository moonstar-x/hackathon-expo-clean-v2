import Foundation

/// The measurements export (§7.7.4). Values are always in meters, whatever the unit setting.
enum MeasurementsCSV {
    static let header = "room,element,index,width_m,height_m,depth_m,area_m2"

    /// One row per room floor, wall, door, window, opening and object. `index` is 1-based within
    /// each element type of a room; objects use their category as the element.
    static func make(geometry: ScanGeometry, roomNames: [String]) -> String {
        var lines = [header]
        for (roomIndex, room) in geometry.rooms.enumerated() {
            let name = roomIndex < roomNames.count ? roomNames[roomIndex] : String(localized: .roomTypeUnknown(number: roomIndex + 1))
            lines.append(row(name, "floor", 1, area: RoomMetrics.floorArea(of: room)))
            for (kind, surfaces) in [("wall", room.walls), ("door", room.doors),
                                     ("window", room.windows), ("opening", room.openings)] {
                for (index, surface) in surfaces.enumerated() {
                    lines.append(row(name, kind, index + 1, width: surface.length, height: surface.height))
                }
            }
            var objectCounts: [ObjectCategory: Int] = [:]
            for object in room.objects {
                let index = (objectCounts[object.category] ?? 0) + 1
                objectCounts[object.category] = index
                lines.append(row(name, object.category.rawValue, index,
                                 width: object.width, height: object.height, depth: object.depth))
            }
        }
        return lines.joined(separator: "\n") + "\n"
    }

    private static func row(_ room: String, _ element: String, _ index: Int,
                            width: Float? = nil, height: Float? = nil, depth: Float? = nil,
                            area: Float? = nil) -> String {
        [escape(room), element, "\(index)", number(width), number(height), number(depth), number(area)]
            .joined(separator: ",")
    }

    /// Locale-independent, two decimals (centimeter precision, §6.7).
    private static func number(_ value: Float?) -> String {
        guard let value else { return "" }
        return String(format: "%.2f", locale: Locale(identifier: "en_US_POSIX"), Double(value))
    }

    /// RFC 4180 quoting for names that contain commas, quotes or line breaks.
    static func escape(_ field: String) -> String {
        guard field.contains(where: { $0 == "," || $0 == "\"" || $0.isNewline }) else { return field }
        return "\"" + field.replacingOccurrences(of: "\"", with: "\"\"") + "\""
    }
}
