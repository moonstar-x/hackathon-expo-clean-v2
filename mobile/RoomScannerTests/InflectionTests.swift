import Testing
@testable import RoomScanner

@Suite("Counted")
struct CountedTests {
    @Test func agreesWithTheCount() {
        #expect(Counted.rooms(1) == "1 habitación")
        #expect(Counted.rooms(3) == "3 habitaciones")
        #expect(Counted.walls(1) == "1 pared")
        #expect(Counted.walls(4) == "4 paredes")
        #expect(Counted.windows(2) == "2 ventanas")
    }
}
