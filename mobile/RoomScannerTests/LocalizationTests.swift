import Foundation
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

@Suite("Localized strings")
struct LocalizedStringsTests {
    @Test func symbolsResolveToSpanish() {
        #expect(String(localized: .homeNewScan) == "Nuevo escaneo")
        #expect(String(localized: .liveOverlayRoomReadout(number: 2, summary: "3 paredes")) == "Habitación 2: 3 paredes")
    }

    @Test func scanTipKeepsItsMarkdown() {
        let tip = AttributedString(localized: .scanTipsOneRoomAtATime)
        let bold = tip.runs.filter { $0.inlinePresentationIntent == .stronglyEmphasized }
            .map { String(tip[$0.range].characters) }
        #expect(bold == ["Listo", "Comenzar"])
    }
}
