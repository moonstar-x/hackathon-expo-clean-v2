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
                VStack(alignment: .leading, spacing: 24) {
                    Text(.scanTipsTitle)
                        .font(.largeTitle.bold())
                    ForEach(tips) { tip in
                        HStack(alignment: .top, spacing: 16) {
                            Image(systemName: tip.symbol)
                                .font(.title2)
                                .foregroundStyle(.tint)
                                .frame(width: 36)
                                .accessibilityHidden(true)
                            Text(AttributedString(localized: tip.text))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding()
            }
            .safeAreaInset(edge: .bottom) {
                Button(action: onStart) {
                    Text(mode == .firstRun ? .scanTipsStartScanning : .commonDone)
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .padding()
                .background(.bar)
            }
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
