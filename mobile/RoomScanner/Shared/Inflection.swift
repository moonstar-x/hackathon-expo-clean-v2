import Foundation

/// Counted nouns ("1 habitación", "3 habitaciones") using automatic grammar agreement.
/// `String(localized:)` doesn't apply inflection, so these go through `AttributedString`.
enum Counted {
    static func rooms(_ n: Int) -> String { inflected(AttributedString(localized: .countRooms(count: n))) }
    static func walls(_ n: Int) -> String { inflected(AttributedString(localized: .countWalls(count: n))) }
    static func doors(_ n: Int) -> String { inflected(AttributedString(localized: .countDoors(count: n))) }
    static func windows(_ n: Int) -> String { inflected(AttributedString(localized: .countWindows(count: n))) }
    static func objects(_ n: Int) -> String { inflected(AttributedString(localized: .countObjects(count: n))) }

    private static func inflected(_ string: AttributedString) -> String {
        String(string.characters)
    }
}
