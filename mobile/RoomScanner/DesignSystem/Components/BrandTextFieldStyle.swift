import SwiftUI

/// Filled input, mirroring the web's filled text field: subtle fill, radius 10, no border at rest
/// and a 3px accent focus ring when active. Apply `.textFieldStyle(.brand)`; drive the ring with
/// `.brandFieldFocus(_:)` from a `@FocusState` when you want the active-state ring.
struct BrandTextFieldStyle: TextFieldStyle {
    // swiftlint:disable:next identifier_name
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(AppFont.body)
            .padding(.horizontal, Spacing.m)
            .frame(minHeight: 48)
            .background(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .fill(Color.brandField)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                    .stroke(Color.brandDivider, lineWidth: 1)
            )
    }
}

extension TextFieldStyle where Self == BrandTextFieldStyle {
    static var brand: BrandTextFieldStyle { BrandTextFieldStyle() }
}

extension View {
    /// Adds the accent focus ring when `isFocused` is true. Place on the field itself.
    func brandFieldFocus(_ isFocused: Bool) -> some View {
        overlay(
            RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                .stroke(Color.brandAccent.opacity(isFocused ? 0.9 : 0), lineWidth: 1.5)
                .background(
                    RoundedRectangle(cornerRadius: Radius.control, style: .continuous)
                        .stroke(Color.brandAccent.opacity(isFocused ? 0.18 : 0), lineWidth: 4)
                )
                .animation(.easeOut(duration: 0.15), value: isFocused)
                .allowsHitTesting(false)
        )
    }
}
