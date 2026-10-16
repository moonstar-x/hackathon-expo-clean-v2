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
        let text: LocalizedStringKey
    }

    private let tips: [Tip] = [
        Tip(symbol: "lightbulb.max", text: "scanTips.lighting"),
        Tip(symbol: "camera.viewfinder", text: "scanTips.moveSlowly"),
        Tip(symbol: "door.left.hand.open", text: "scanTips.keepDoorsOpen"),
        Tip(symbol: "figure.walk", text: "scanTips.oneRoomAtATime"),
        Tip(symbol: "ruler", text: "scanTips.roomSize"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("scanTips.title")
                        .font(.largeTitle.bold())
                    ForEach(tips) { tip in
                        HStack(alignment: .top, spacing: 16) {
                            Image(systemName: tip.symbol)
                                .font(.title2)
                                .foregroundStyle(.tint)
                                .frame(width: 36)
                                .accessibilityHidden(true)
                            Text(tip.text)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding()
            }
            .safeAreaInset(edge: .bottom) {
                Button(action: onStart) {
                    Text(mode == .firstRun ? "scanTips.startScanning" : "common.done")
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
                        Button("common.cancel", action: onCancel)
                    }
                }
            }
        }
    }
}

#Preview {
    ScanTipsView(mode: .firstRun, onStart: {}, onCancel: {})
}
