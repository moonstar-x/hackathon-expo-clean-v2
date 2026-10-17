import SwiftUI

/// The CleanCode palette, mirrored from `web/src/constants/brand.ts`. Used only to build the
/// semantic tokens below — views should reach for the semantic names, never these raw hues.
enum Brand {
    static let navy = Color(hex: "0F172A")
    static let navyDeep = Color(hex: "0A1022")
    static let indigo = Color(hex: "4F46E5")
    static let indigoLight = Color(hex: "6366F1")
    static let indigoDeep = Color(hex: "312E81")
    static let sky = Color(hex: "38BDF8")
    static let skyDeep = Color(hex: "0EA5E9")
    static let white = Color(hex: "FFFFFF")
    static let mist = Color(hex: "EEF2FF")
    static let slate = Color(hex: "CBD5E1")
    static let slateLight = Color(hex: "E2E8F0")
}

/// Semantic color tokens. Every value adapts to light/dark the same way the web theme does
/// (`web/src/theme.ts`): indigo accents on light, sky on dark; navy paper in dark mode.
extension Color {
    /// Primary brand accent — indigo on light, sky on dark. Mirrors the asset-catalog `AccentColor`
    /// that drives the global `.tint`, so code and system chrome stay in sync.
    static let brandAccent = Color(light: Brand.indigo, dark: Brand.sky)
    /// A pressed/darker accent for interactive feedback.
    static let brandAccentPressed = Color(light: Color(hex: "4338CA"), dark: Brand.skyDeep)
    /// Soft accent wash for selection highlights and decorative fills.
    static let brandAccentSoft = Color(light: Brand.mist, dark: Brand.sky.opacity(0.16))

    /// App background (behind cards and lists).
    static let brandBackground = Color(light: Color(hex: "F8FAFC"), dark: Brand.navyDeep)
    /// Raised surface (cards, sheets, nav bars).
    static let brandSurface = Color(light: Brand.white, dark: Brand.navy)

    static let brandTextPrimary = Color(light: Brand.navy, dark: Color.white.opacity(0.88))
    static let brandTextSecondary = Color(light: Brand.navy.opacity(0.64), dark: Brand.slate.opacity(0.72))
    static let brandTextTertiary = Color(light: Brand.navy.opacity(0.42), dark: Brand.slate.opacity(0.5))

    static let brandDivider = Color(light: Brand.navy.opacity(0.12), dark: Color(hex: "94A3B8").opacity(0.18))
    static let brandField = Color(light: Brand.navy.opacity(0.04), dark: Color.white.opacity(0.06))

    // Status tones — desaturated, legible on both paper and navy, never neon. Status is always
    // carried by a word too (see `StatusBadge`), never color alone (`web/design.md §12`).
    static let brandSuccess = Color(light: Color(hex: "15803D"), dark: Color(hex: "4ADE80"))
    static let brandWarning = Color(light: Color(hex: "B45309"), dark: Color(hex: "FBBF24"))
    static let brandError = Color(light: Color(hex: "DC2626"), dark: Color(hex: "F87171"))
    static let brandInfo = brandAccent
}
