import Foundation
import Testing
@testable import RoomScanner

@Suite("UnitFormatting")
struct UnitFormattingTests {
    private let enUS = Locale(identifier: "en_US")
    private var metric: UnitFormatter { UnitFormatter(system: .metric, locale: enUS) }
    private var imperial: UnitFormatter { UnitFormatter(system: .imperial, locale: enUS) }

    @Test(arguments: [
        (1.0, "1.00 m", "3′ 3½″"),
        (3.4167, "3.42 m", "11′ 2½″"),
        (3.6449, "3.64 m", "11′ 11½″"),
        (3.6560, "3.66 m", "12′ 0″"),
    ])
    func lengths(meters: Double, metricText: String, imperialText: String) {
        #expect(metric.length(meters) == metricText)
        #expect(imperial.length(meters) == imperialText)
    }

    @Test(arguments: [
        (10.0, "10.0 m²", "108 ft²"),
        (12.345, "12.3 m²", "133 ft²"),
    ])
    func areas(squareMeters: Double, metricText: String, imperialText: String) {
        #expect(metric.area(squareMeters) == metricText)
        #expect(imperial.area(squareMeters) == imperialText)
    }

    @Test func inchesNeverReachTwelve() {
        // 11′ 11.8″ rounds up into the next foot.
        let meters = (11 * 12 + 11.8) * UnitFormatter.metersPerInch
        #expect(imperial.length(meters) == "12′ 0″")
    }

    @Test func objectSizes() {
        #expect(metric.size(width: 2.10, depth: 0.90, height: 0.85) == "2.10 × 0.90 × 0.85 m")
        #expect(imperial.size(width: 2.10, depth: 0.90, height: 0.85) == "6′ 10½″ × 2′ 11½″ × 2′ 9½″")
    }

    @Test func approximateAndUnknownAreas() {
        #expect(metric.area(Float(12.34), approximate: true) == "≈ 12.3 m²")
        #expect(metric.area(nil, approximate: false) == "—")
    }

    @Test func spokenValues() {
        #expect(metric.spokenLength(3.42) == "3.42 meters")
        #expect(imperial.spokenLength(3.4167) == "11 feet 2 and a half inches")
        #expect(metric.spokenArea(12.345) == "12.3 square meters")
        #expect(imperial.spokenArea(10.0) == "108 square feet")
    }

    @Test func usesLocaleDecimalSeparator() {
        let german = UnitFormatter(system: .metric, locale: Locale(identifier: "de_DE"))
        #expect(german.length(3.4167) == "3,42 m")
    }

    @Test func automaticResolvesByLocale() {
        #expect(UnitSystem.automatic.resolved(for: Locale(identifier: "en_US")) == .imperial)
        #expect(UnitSystem.automatic.resolved(for: Locale(identifier: "es_EC")) == .metric)
        #expect(UnitSystem.metric.resolved(for: Locale(identifier: "en_US")) == .metric)
        #expect(UnitSystem.imperial.resolved(for: Locale(identifier: "es_EC")) == .imperial)
    }

    @Test func scaleBar() {
        #expect(metric.scaleBar.label == "1 m")
        #expect(imperial.scaleBar.label == "3 ft")
        #expect(abs(imperial.scaleBar.meters - 0.9144) < 1e-9)
    }
}
