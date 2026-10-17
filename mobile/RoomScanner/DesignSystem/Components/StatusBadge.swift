import SwiftUI

/// Semantic tone for status pills and inline status text. Status is never color alone — a tone
/// always travels with a word (`web/design.md §12`).
enum BrandTone {
    case neutral, success, warning, error, info

    var color: Color {
        switch self {
        case .neutral: Color.brandTextSecondary
        case .success: Color.brandSuccess
        case .warning: Color.brandWarning
        case .error: Color.brandError
        case .info: Color.brandInfo
        }
    }
}

/// A compact capsule badge: tone-tinted background, tone text, an optional SF Symbol, and always a
/// word. Replaces the ad-hoc `.orange`/`.green` capsules.
struct StatusBadge: View {
    var text: String
    var tone: BrandTone = .neutral
    var systemImage: String?

    init(_ text: String, tone: BrandTone = .neutral, systemImage: String? = nil) {
        self.text = text
        self.tone = tone
        self.systemImage = systemImage
    }

    var body: some View {
        HStack(spacing: Spacing.xs) {
            if let systemImage {
                Image(systemName: systemImage).imageScale(.medium)
            }
            Text(text)
        }
        .font(AppFont.footnote.weight(.semibold))
        .foregroundStyle(tone.color)
        .padding(.horizontal, Spacing.m)
        .padding(.vertical, 6)
        .background(tone.color.opacity(0.14), in: Capsule())
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    VStack(spacing: Spacing.m) {
        StatusBadge("Incompleto", tone: .warning, systemImage: "exclamationmark.triangle.fill")
        StatusBadge("Subido", tone: .success, systemImage: "checkmark.circle.fill")
        StatusBadge("Falló", tone: .error, systemImage: "exclamationmark.triangle.fill")
        StatusBadge("En el dispositivo", tone: .neutral, systemImage: "iphone")
    }
    .padding()
    .background(Color.brandBackground)
}
