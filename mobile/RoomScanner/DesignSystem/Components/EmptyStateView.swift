import SwiftUI

/// A branded empty / unavailable state: an icon in a soft accent circle, a title, a message, and an
/// optional primary action. A warmer, on-brand alternative to the stock `ContentUnavailableView`.
struct EmptyStateView: View {
    var systemImage: String
    var title: LocalizedStringResource
    var message: LocalizedStringResource?
    var actionTitle: LocalizedStringResource?
    var action: (() -> Void)?

    @ScaledMetric(relativeTo: .largeTitle) private var iconSize: CGFloat = 34
    @ScaledMetric(relativeTo: .largeTitle) private var circleSize: CGFloat = 88

    var body: some View {
        VStack(spacing: Spacing.l) {
            ZStack {
                Circle().fill(Color.brandAccentSoft)
                Image(systemName: systemImage)
                    .font(.system(size: iconSize, weight: .semibold))
                    .foregroundStyle(Color.brandAccent)
            }
            .frame(width: circleSize, height: circleSize)
            .accessibilityHidden(true)

            VStack(spacing: Spacing.s) {
                Text(title)
                    .font(AppFont.title3)
                    .foregroundStyle(Color.brandTextPrimary)
                    .multilineTextAlignment(.center)
                if let message {
                    Text(message)
                        .font(AppFont.subheadline)
                        .foregroundStyle(Color.brandTextSecondary)
                        .multilineTextAlignment(.center)
                        .brandBodyLineSpacing()
                }
            }

            if let actionTitle, let action {
                Button(action: action) { Text(actionTitle) }
                    .buttonStyle(.brandPrimary)
                    .fixedSize(horizontal: true, vertical: false)
                    .padding(.top, Spacing.xs)
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: 420)
    }
}

#Preview {
    EmptyStateView(systemImage: "square.dashed",
                   title: .homeEmptyTitle,
                   message: .homeEmptyMessage,
                   actionTitle: .homeNewScan) {}
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.brandBackground)
}
