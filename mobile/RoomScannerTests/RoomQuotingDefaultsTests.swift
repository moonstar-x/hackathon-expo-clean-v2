import Foundation
import Testing
@testable import RoomScanner

@Suite("Room quoting defaults")
struct RoomQuotingDefaultsTests {
    @Test func bathroomWithoutObjectsStillAsksForCounts() {
        let value = RoomQuotingInputs.defaults(type: .bathroom, room: nil)
        #expect(value.fixtures == QuoteFixtures())
        #expect(value.traffic == nil)
        #expect(value.fixedPosts == 0)
        #expect(RoomQuotingInputs.defaults(type: .lockerRoom, room: nil).fixtures != nil)
        #expect(RoomQuotingInputs.defaults(type: .office, room: nil).fixtures == nil)
    }
    @Test func countsSinksAndToiletsFromRoomGeometry() throws {
        let url = try #require(Bundle(for: PersistenceController.self).url(forResource: "RoomScanner", withExtension: "momd"))
        #expect(FileManager.default.fileExists(atPath: url.path))
        var room = SampleGeometry.twoRoomApartment().rooms[0]
        let object = try #require(room.objects.first)
        do {
            room.objects = [ObjectGeometry(id: object.id, category: .toilet, transform: object.transform, dimensions: object.dimensions),
                            ObjectGeometry(id: UUID(), category: .sink, transform: object.transform, dimensions: object.dimensions),
                            ObjectGeometry(id: UUID(), category: .bathtub, transform: object.transform, dimensions: object.dimensions)]
            #expect(RoomQuotingInputs.defaults(type: .office, room: room).fixtures == QuoteFixtures(toilets: 1, urinals: 0, sinks: 1))
        }
    }
}
