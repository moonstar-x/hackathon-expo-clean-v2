import Foundation
import Testing
@testable import RoomScanner

@Suite("MeasurementsCSV")
struct MeasurementsCSVTests {
    @Test func headerAndRows() {
        let csv = MeasurementsCSV.make(geometry: SampleGeometry.twoRoomApartment(), roomNames: ["Living Room", "Bedroom"])
        let lines = csv.split(separator: "\n").map(String.init)
        #expect(lines.first == "room,element,index,width_m,height_m,depth_m,area_m2")
        #expect(lines.contains("Living Room,floor,1,,,,20.00"))
        #expect(lines.contains("Living Room,wall,1,5.00,2.50,,"))
        #expect(lines.contains("Living Room,door,1,0.90,2.00,,"))
        #expect(lines.contains("Living Room,sofa,1,2.10,0.85,0.90,"))
        #expect(lines.contains("Bedroom,floor,1,,,,14.00"))
        #expect(lines.contains("Bedroom,bed,1,1.60,0.55,2.00,"))
        // 1 header + per room: floor, 4 walls, doors, windows, objects.
        #expect(lines.count == 1 + (1 + 4 + 2 + 1 + 2) + (1 + 4 + 1 + 1 + 1))
    }

    @Test func namesAreEscaped() {
        #expect(MeasurementsCSV.escape("Kitchen, north") == "\"Kitchen, north\"")
        #expect(MeasurementsCSV.escape("The \"big\" room") == "\"The \"\"big\"\" room\"")
        #expect(MeasurementsCSV.escape("Bedroom") == "Bedroom")
    }
}
