import SwiftUI

/// Filled primary action button — accent background, white label, radius 10, semibold non-uppercase
/// text, a subtle inset highlight and soft navy shadow (mirrors the web contained button). Replaces
/// `.borderedProminent` for the one primary action per screen.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppFont.button)
            .foregroundStyle(Brand.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .fill(Color.brandAccent)
                    .overlay(
                        RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                            .blendMode(.overlay)
                    )
            )
            .opacity(isEnabled ? (configuration.isPressed ? 0.88 : 1) : 0.5)
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .cardShadow()
            .contentShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// Secondary action — a tinted/outlined button that defers to the primary. Accent label on a soft
/// accent wash with a hairline border, radius 10.
struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppFont.button)
            .foregroundStyle(Color.brandAccent)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .fill(Color.brandAccentSoft)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .stroke(Color.brandAccent.opacity(0.18), lineWidth: 1)
            )
            .opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.5)
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .contentShape(RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var brandPrimary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var brandSecondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

#Preview {
    VStack(spacing: Spacing.l) {
        Button("Nuevo escaneo") {}.buttonStyle(.brandPrimary)
        Button("Finalizar") {}.buttonStyle(.brandSecondary)
        Button("Deshabilitado") {}.buttonStyle(.brandPrimary).disabled(true)
    }
    .padding()
    .background(Color.brandBackground)
}
