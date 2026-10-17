import Foundation

enum QuoteTraffic: String, CaseIterable, Codable, Sendable {
    case low, medium, high
    var displayName: String {
        switch self {
        case .low: String(localized: .quoteTrafficLow)
        case .medium: String(localized: .quoteTrafficMedium)
        case .high: String(localized: .quoteTrafficHigh)
        }
    }
}
struct QuoteFixtures: Codable, Sendable, Equatable {
    var toilets = 0
    var urinals = 0
    var sinks = 0
}
struct RoomQuotingInputs: Codable, Sendable, Equatable {
    var traffic: String?
    var fixedPosts = 0
    var fixtures: QuoteFixtures?
    var isEmpty: Bool { traffic == nil && fixedPosts == 0 && fixtures == nil }
    static func defaults(type: LocationType?, room: RoomGeometry?) -> Self {
        let toilets = room?.objects.filter { $0.category == .toilet }.count ?? 0
        let sinks = room?.objects.filter { $0.category == .sink }.count ?? 0
        let enabled = type == .bathroom || type == .lockerRoom || toilets > 0 || sinks > 0
        return Self(fixtures: enabled ? QuoteFixtures(toilets: toilets, urinals: 0, sinks: sinks) : nil)
    }
}
struct LocationQuotingInputs: Codable, Sendable, Equatable {
    var scheduleCode: String?
    var daysPerMonth: Int?
    var traffic: String?
    var isEmpty: Bool { scheduleCode == nil && daysPerMonth == nil && traffic == nil }
}
