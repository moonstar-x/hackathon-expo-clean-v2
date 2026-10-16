import Foundation

/// Counted nouns ("1 habitación", "3 habitaciones") using automatic grammar agreement.
/// `String(localized:)` doesn't apply inflection, so these go through `AttributedString`.
enum Counted {
    static func rooms(_ n: Int) -> String { inflected(AttributedString(localized: "count.rooms \(n)")) }
    static func walls(_ n: Int) -> String { inflected(AttributedString(localized: "count.walls \(n)")) }
    static func doors(_ n: Int) -> String { inflected(AttributedString(localized: "count.doors \(n)")) }
    static func windows(_ n: Int) -> String { inflected(AttributedString(localized: "count.windows \(n)")) }
    static func objects(_ n: Int) -> String { inflected(AttributedString(localized: "count.objects \(n)")) }

    private static func inflected(_ string: AttributedString) -> String {
        String(string.characters)
    }
}
