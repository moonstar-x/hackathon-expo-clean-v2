import SwiftUI

/// The type scale. The web brand uses Poppins (`web/src/theme.ts`); on iOS we use SF Pro **Rounded**
/// — Apple's native geometric face, the closest legible analog to Poppins — so text stays crisp at
/// small sizes and scales natively with Dynamic Type. The web's *treatment* is preserved: tight
/// negative tracking on large headings, semibold (600) non-uppercase buttons, overline tracking.
///
/// Every token is built on a text style (`.largeTitle`, `.body`, …) so it responds to Dynamic Type.
enum AppFont {
    static let design: Font.Design = .rounded

    /// Screen titles (`h1`). Bold, tight tracking.
    static let display = Font.system(.largeTitle, design: design).weight(.bold)
    /// Section / sheet titles (`h2`/`h3`).
    static let title = Font.system(.title, design: design).weight(.bold)
    static let title2 = Font.system(.title2, design: design).weight(.bold)
    static let title3 = Font.system(.title3, design: design).weight(.semibold)
    /// Card and list-row titles (`h5`/`h6`).
    static let headline = Font.system(.headline, design: design).weight(.semibold)
    static let subheadline = Font.system(.subheadline, design: design)
    static let body = Font.system(.body, design: design)
    static let callout = Font.system(.callout, design: design)
    static let footnote = Font.system(.footnote, design: design)
    static let caption = Font.system(.caption, design: design)
    static let caption2 = Font.system(.caption2, design: design)
    /// Button label weight (`button`: 600, never uppercased).
    static let button = Font.system(.headline, design: design).weight(.semibold)
    /// Overline / eyebrow label — pair with `.brandOverline()` for the +0.12em tracking + caps-ish feel.
    static let overline = Font.system(.caption2, design: design).weight(.semibold)
}

extension View {
    /// Negative heading tracking, mirroring the web's `-0.015…-0.02em`.
    func brandHeadingTracking() -> some View { tracking(-0.4) }

    /// Overline label styling: wide tracking + secondary color (`web/src/theme.ts` overline variant).
    func brandOverline() -> some View {
        font(AppFont.overline)
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundStyle(Color.brandTextSecondary)
    }

    /// Body line spacing ≈ 1.55 line-height, as on the web.
    func brandBodyLineSpacing() -> some View { lineSpacing(4) }
}
