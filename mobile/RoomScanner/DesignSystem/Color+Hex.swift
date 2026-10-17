import SwiftUI

/// Hex and light/dark color initializers, so brand tokens can be written the way they appear in
/// the web theme (`web/src/constants/brand.ts`, `web/src/theme.ts`).
extension Color {
    /// Creates a color from a `#RRGGBB` or `#RRGGBBAA` hex string.
    init(hex: String) {
        let trimmed = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: trimmed).scanHexInt64(&value)
        let r, g, b, a: UInt64
        switch trimmed.count {
        case 6: (r, g, b, a) = (value >> 16, value >> 8 & 0xFF, value & 0xFF, 255)
        case 8: (r, g, b, a) = (value >> 24, value >> 16 & 0xFF, value >> 8 & 0xFF, value & 0xFF)
        default: (r, g, b, a) = (0, 0, 0, 255)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255,
                  opacity: Double(a) / 255)
    }

    /// A color that resolves differently in light and dark mode.
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light) })
    }

    /// Convenience for the common case of two hex strings.
    init(light lightHex: String, dark darkHex: String) {
        self.init(light: Color(hex: lightHex), dark: Color(hex: darkHex))
    }
}
