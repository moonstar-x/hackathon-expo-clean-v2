import SwiftUI

/// Soft, **navy-tinted** shadows (never flat black), mirroring the web's elevation scale
/// (`web/src/theme.ts`). Shadows are built from two stacked layers; in dark mode they tint black,
/// as the web does. Each modifier is a no-op cost on light content because the tint is barely there.
private struct NavyShadow: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    var layers: [(y: CGFloat, blur: CGFloat, lightAlpha: Double, darkAlpha: Double)]

    func body(content: Content) -> some View {
        layers.reduce(AnyView(content)) { view, layer in
            let alpha = scheme == .dark ? layer.darkAlpha : layer.lightAlpha
            let tint = scheme == .dark ? Color.black : Color(hex: "0F172A")
            return AnyView(view.shadow(color: tint.opacity(alpha), radius: layer.blur / 2,
                                       x: 0, y: layer.y))
        }
    }
}

extension View {
    /// Near-invisible resting shadow for cards and rows (web card shadow).
    func cardShadow() -> some View {
        modifier(NavyShadow(layers: [
            (1, 2, 0.04, 0.40),
            (1, 1, 0.02, 0.24),
        ]))
    }

    /// Lifted shadow for menus, popovers and floating controls (web popover shadow).
    func popoverShadow() -> some View {
        modifier(NavyShadow(layers: [
            (12, 32, 0.10, 0.50),
            (2, 6, 0.05, 0.30),
        ]))
    }

    /// Deep shadow for modal dialogs and interstitials (web dialog shadow).
    func dialogShadow() -> some View {
        modifier(NavyShadow(layers: [
            (32, 80, 0.18, 0.70),
            (8, 24, 0.08, 0.40),
        ]))
    }
}
