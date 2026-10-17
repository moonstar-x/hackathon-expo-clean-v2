import SwiftUI

/// Flat brand surface: `BrandSurface` fill, 1px divider border, radius 14, and a near-invisible
/// navy-tinted shadow — the web's card treatment (`elevation: 0` + hairline border + soft shadow).
/// Use on non-camera surfaces where `.regularMaterial` was used before.
struct CardStyle: ViewModifier {
    var cornerRadius: CGFloat = Radius.card
    var padding: CGFloat? = Spacing.l

    func body(content: Content) -> some View {
        content
            .padding(padding.map { EdgeInsets(top: $0, leading: $0, bottom: $0, trailing: $0) } ?? EdgeInsets())
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color.brandSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.brandDivider, lineWidth: 1)
            )
            .cardShadow()
    }
}

extension View {
    /// Wraps content as a flat brand card. Pass `padding: nil` to supply your own.
    func cardStyle(cornerRadius: CGFloat = Radius.card, padding: CGFloat? = Spacing.l) -> some View {
        modifier(CardStyle(cornerRadius: cornerRadius, padding: padding))
    }

    /// A floating control surface (menus, overlays that are *not* over live camera): same flat look
    /// with a lifted shadow.
    func floatingCardStyle(cornerRadius: CGFloat = Radius.surface, padding: CGFloat? = Spacing.m) -> some View {
        modifier(FloatingCardStyle(cornerRadius: cornerRadius, padding: padding))
    }
}

struct FloatingCardStyle: ViewModifier {
    var cornerRadius: CGFloat
    var padding: CGFloat?

    func body(content: Content) -> some View {
        content
            .padding(padding.map { EdgeInsets(top: $0, leading: $0, bottom: $0, trailing: $0) } ?? EdgeInsets())
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color.brandSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.brandDivider, lineWidth: 1)
            )
            .popoverShadow()
    }
}
