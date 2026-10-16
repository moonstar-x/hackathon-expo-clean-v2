import Testing
@testable import RoomScanner

@Suite("LocationType")
struct LocationTypeTests {
    @Test func everyTypeIsInExactlyOneCategory() {
        let grouped = LocationTypeCategory.allCases.flatMap(\.types)
        #expect(grouped.count == LocationType.allCases.count)
        #expect(Set(grouped) == Set(LocationType.allCases))
    }

    @Test func preselectsTheDetectedRoomType() {
        #expect(LocationType(detected: .bathroom) == .bathroom)
        #expect(LocationType(detected: .livingRoom) == .livingRoom)
        #expect(LocationType(detected: nil) == nil)
        for detected in RoomType.allCases {
            #expect(LocationType(detected: detected)?.rawValue == detected.rawValue)
        }
    }

    @Test func namesResolveToSpanish() {
        #expect(LocationType.operatingRoom.displayName == "Quirófano")
        #expect(LocationType.hallway.displayName == "Pasillo")
        #expect(LocationTypeCategory.healthcare.displayName == "Salud")
        #expect(Set(LocationType.allCases.map(\.displayName)).count == LocationType.allCases.count,
                "Every type has its own name")
    }
}
