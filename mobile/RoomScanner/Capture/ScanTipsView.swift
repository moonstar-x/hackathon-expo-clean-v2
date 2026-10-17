import SwiftUI

/// Scanning advice, shown before the first capture and from the "?" button (§7.3).
struct ScanTipsView: View {
    enum Mode { case firstRun, help }

    var mode: Mode
    var onStart: () -> Void
    var onCancel: (() -> Void)?

    private struct Tip: Identifiable {
        let id = UUID()
        let symbol: String
        let text: LocalizedStringResource
    }

    private let tips: [Tip] = [
        Tip(symbol: "lightbulb.max", text: .scanTipsLighting),
        Tip(symbol: "camera.viewfinder", text: .scanTipsMoveSlowly),
        Tip(symbol: "door.left.hand.open", text: .scanTipsKeepDoorsOpen),
        Tip(symbol: "figure.walk", text: .scanTipsOneRoomAtATime),
        Tip(symbol: "ruler", text: .scanTipsRoomSize),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    Text(.scanTipsTitle)
                        .font(AppFont.display)
                        .brandHeadingTracking()
                        .foregroundStyle(Color.brandTextPrimary)
                    VStack(alignment: .leading, spacing: Spacing.l) {
                        ForEach(tips) { tip in
                            HStack(alignment: .top, spacing: Spacing.l) {
                                Image(systemName: tip.symbol)
                                    .font(.title3.weight(.semibold))
                                    .foregroundStyle(Color.brandAccent)
                                    .frame(width: 44, height: 44)
                                    .background(Color.brandAccentSoft, in: RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
                                    .accessibilityHidden(true)
                                Text(AttributedString(localized: tip.text))
                                    .font(AppFont.body)
                                    .foregroundStyle(Color.brandTextPrimary)
                                    .brandBodyLineSpacing()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
                .padding(Spacing.xl)
            }
            .background(Color.brandBackground.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                Button(action: onStart) {
                    Text(mode == .firstRun ? .scanTipsStartScanning : .commonDone)
                }
                .buttonStyle(.brandPrimary)
                .padding(Spacing.l)
                .background(.bar)
            }
            .tint(Color.brandAccent)
            .toolbar {
                if let onCancel {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(.commonCancel, action: onCancel)
                    }
                }
            }
        }
    }
}

#Preview {
    ScanTipsView(mode: .firstRun, onStart: {}, onCancel: {})
}
