import Foundation
import Testing
import simd
@testable import RoomScanner

@Suite("RoomMetrics")
struct RoomMetricsTests {
    @Test func ceilingHeightIsTallestWall() {
        var room = SampleGeometry.twoRoomApartment().rooms[0]
        room.walls[1] = SampleGeometry.wall(from: SIMD2(5, 0), to: SIMD2(5, 4), height: 2.8)
        #expect(RoomMetrics.ceilingHeight(of: room) == 2.8)
    }

    @Test func ceilingHeightIsUnknownWithoutWalls() {
        var room = SampleGeometry.twoRoomApartment().rooms[0]
        room.walls = []
        #expect(RoomMetrics.ceilingHeight(of: room) == nil)
    }

    @Test func totalAreaIsSumOfRooms() throws {
        let geometry = SampleGeometry.twoRoomApartment()
        let living = try #require(RoomMetrics.floorArea(of: geometry.rooms[0]))
        let bedroom = try #require(RoomMetrics.floorArea(of: geometry.rooms[1]))
        #expect(abs(living - 20) < 1e-4)
        #expect(abs(bedroom - 14) < 1e-4)
        #expect(abs(LocationMetrics.totalFloorArea(of: geometry) - 34) < 1e-4)
    }

    @Test func footprintOfSampleApartment() throws {
        let footprint = try #require(LocationMetrics.footprint(of: SampleGeometry.twoRoomApartment()))
        #expect(abs(footprint.width - 8.5) < 1e-4)
        #expect(abs(footprint.length - 4.0) < 1e-4)
    }

    @Test func footprintIgnoresWorldYaw() throws {
        let rotated = SampleGeometry.rotated(SampleGeometry.twoRoomApartment(), by: 0.6)
        let footprint = try #require(LocationMetrics.footprint(of: rotated))
        // The plan rotation squares the plan up again, possibly with W and L swapped.
        let sides = [footprint.width, footprint.length].sorted()
        #expect(abs(sides[0] - 4.0) < 0.01)
        #expect(abs(sides[1] - 8.5) < 0.01)
    }

    @Test func perimeterFallsBackToWallLengths() {
        var room = SampleGeometry.lShapedRoom().rooms[0]
        #expect(abs(RoomMetrics.perimeter(of: room) - 18) < 1e-4)
        room.floorPolygon = []
        #expect(abs(RoomMetrics.perimeter(of: room) - 18) < 1e-4)
        #expect(RoomMetrics.floorArea(of: room) == nil)
    }

    @Test func approximateFloorSetsTheFlag() {
        var geometry = SampleGeometry.twoRoomApartment()
        #expect(!LocationMetrics.isAreaApproximate(geometry))
        geometry.rooms[1].isFloorApproximate = true
        #expect(LocationMetrics.isAreaApproximate(geometry))
    }

    @Test func labelPositionFallsBackToCentroid() throws {
        var room = SampleGeometry.lShapedRoom().rooms[0]
        room.labelPosition = nil
        let position = try #require(RoomMetrics.labelPosition(of: room))
        let centroid = try #require(GeometryMath.centroid(room.floorPolygon))
        #expect(simd_distance(position, centroid) < 1e-5)
    }
}

@Suite("RoomNaming")
struct RoomNamingTests {
    @Test func defaultNamesFollowDetectedTypes() {
        let names = RoomNaming.defaultNames(for: [.livingRoom, .bedroom, nil, .bedroom, .bedroom])
        #expect(names == ["Sala", "Dormitorio", "Habitación 3", "Dormitorio 2", "Dormitorio 3"])
    }

    @Test func unknownTypeUsesIndex() {
        #expect(RoomNaming.defaultName(for: nil, index: 0, previousTypes: [nil]) == "Habitación 1")
    }
}
