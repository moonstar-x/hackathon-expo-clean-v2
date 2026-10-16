import Foundation

/// The user's unit preference, stored in `@AppStorage("unitSystem")`.
enum UnitSystem: String, CaseIterable, Identifiable, Sendable {
    case automatic, metric, imperial

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .automatic: String(localized: "units.automatic")
        case .metric: String(localized: "units.metric")
        case .imperial: String(localized: "units.imperial")
        }
    }

    /// Automatic resolves to imperial for locales that use the US measurement system.
    func resolved(for locale: Locale = .current) -> ResolvedUnitSystem {
        switch self {
        case .metric: .metric
        case .imperial: .imperial
        case .automatic: locale.measurementSystem == .us ? .imperial : .metric
        }
    }

    static let storageKey = "unitSystem"
}

enum ResolvedUnitSystem: Sendable {
    case metric, imperial
}

/// Formats lengths and areas for display (§6.6). Inputs are always meters and square meters.
struct UnitFormatter: Sendable {
    static let metersPerInch = 0.0254
    static let squareFeetPerSquareMeter = 10.7639

    var system: ResolvedUnitSystem
    var locale: Locale

    init(system: ResolvedUnitSystem, locale: Locale = .current) {
        self.system = system
        self.locale = locale
    }

    init(_ preference: UnitSystem, locale: Locale = .current) {
        self.init(system: preference.resolved(for: locale), locale: locale)
    }

    // MARK: Lengths

    /// `3.42 m` or `11′ 2½″`.
    func length(_ meters: Double) -> String {
        switch system {
        case .metric:
            return "\(decimal(meters, digits: 2)) m"
        case .imperial:
            return feetAndInches(meters)
        }
    }

    func length(_ meters: Float) -> String { length(Double(meters)) }

    /// `3.42 m × 2.51 m`, as used for walls (length × height) and doors (width × height).
    func lengthPair(_ a: Float, _ b: Float) -> String {
        "\(length(a)) × \(length(b))"
    }

    /// Object sizes as W × D × H: `2.10 × 0.90 × 0.85 m` or `6′ 10½″ × 2′ 11½″ × 2′ 9½″`.
    func size(width: Float, depth: Float, height: Float) -> String {
        switch system {
        case .metric:
            let parts = [width, depth, height].map { decimal(Double($0), digits: 2) }
            return parts.joined(separator: " × ") + " m"
        case .imperial:
            return [width, depth, height].map { feetAndInches(Double($0)) }.joined(separator: " × ")
        }
    }

    // MARK: Areas

    /// `12.4 m²` or `133 ft²`.
    func area(_ squareMeters: Double) -> String {
        switch system {
        case .metric:
            return "\(decimal(squareMeters, digits: 1)) m²"
        case .imperial:
            return "\(decimal(squareMeters * Self.squareFeetPerSquareMeter, digits: 0)) ft²"
        }
    }

    func area(_ squareMeters: Float) -> String { area(Double(squareMeters)) }

    /// Area with a "≈" prefix when the value is approximate, or "—" when unknown.
    func area(_ squareMeters: Float?, approximate: Bool) -> String {
        guard let squareMeters else { return "—" }
        return approximate ? "≈ \(area(squareMeters))" : area(squareMeters)
    }

    // MARK: Spoken (VoiceOver) variants

    /// "3.42 metros" or "11 pies 2 pulgadas y media".
    func spokenLength(_ meters: Double) -> String {
        switch system {
        case .metric:
            return String(localized: "units.spoken.meters \(decimal(meters, digits: 2))")
        case .imperial:
            let (feet, inches, half) = feetInchesHalves(meters)
            let inchText = half ? String(localized: "units.spoken.inchesAndHalf \(inches)") : String(localized: "units.spoken.inches \(inches)")
            return String(localized: "units.spoken.feetAndInches \(feet) \(inchText)")
        }
    }

    func spokenLength(_ meters: Float) -> String { spokenLength(Double(meters)) }

    /// "12.4 metros cuadrados" or "133 pies cuadrados".
    func spokenArea(_ squareMeters: Double) -> String {
        switch system {
        case .metric:
            return String(localized: "units.spoken.squareMeters \(decimal(squareMeters, digits: 1))")
        case .imperial:
            return String(localized: "units.spoken.squareFeet \(decimal(squareMeters * Self.squareFeetPerSquareMeter, digits: 0))")
        }
    }

    func spokenArea(_ squareMeters: Float) -> String { spokenArea(Double(squareMeters)) }

    // MARK: Helpers

    /// The length of the scale bar: 1 m, or 3 ft in imperial.
    var scaleBar: (meters: Double, label: String) {
        switch system {
        case .metric: (1, "1 m")
        case .imperial: (3 * 12 * Self.metersPerInch, "3 ft")
        }
    }

    private func decimal(_ value: Double, digits: Int) -> String {
        value.formatted(.number.precision(.fractionLength(digits)).locale(locale))
    }

    /// Rounds to the nearest half inch and carries 12″ into the feet.
    private func feetInchesHalves(_ meters: Double) -> (feet: Int, inches: Int, half: Bool) {
        let halfInches = Int((abs(meters) / Self.metersPerInch * 2).rounded())
        let feet = halfInches / 24
        let remainder = halfInches % 24
        return (feet, remainder / 2, remainder % 2 == 1)
    }

    private func feetAndInches(_ meters: Double) -> String {
        let (feet, inches, half) = feetInchesHalves(meters)
        let inchText: String
        if half {
            inchText = inches == 0 ? "½" : "\(inches)½"
        } else {
            inchText = "\(inches)"
        }
        return "\(feet)′ \(inchText)″"
    }
}
