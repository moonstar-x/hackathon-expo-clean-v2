import Foundation

/// Counted nouns ("1 room", "3 rooms") using automatic grammar agreement.
/// `String(localized:)` doesn't apply inflection, so these go through `AttributedString`.
enum Counted {
    static func rooms(_ n: Int) -> String { inflected(AttributedString(localized: "^[\(n) room](inflect: true)")) }
    static func walls(_ n: Int) -> String { inflected(AttributedString(localized: "^[\(n) wall](inflect: true)")) }
    static func doors(_ n: Int) -> String { inflected(AttributedString(localized: "^[\(n) door](inflect: true)")) }
    static func windows(_ n: Int) -> String { inflected(AttributedString(localized: "^[\(n) window](inflect: true)")) }
    static func objects(_ n: Int) -> String { inflected(AttributedString(localized: "^[\(n) object](inflect: true)")) }

    private static func inflected(_ string: AttributedString) -> String {
        String(string.characters)
    }
}
