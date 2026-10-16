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
        Tip(symbol: "lightbulb.max", text: "Use good lighting. Apple recommends at least 50 lux."),
        Tip(symbol: "camera.viewfinder", text: "Move slowly and point the camera at walls, corners, doors, and windows."),
        Tip(symbol: "door.left.hand.open", text: "Keep the doors between rooms open so the rooms can be connected."),
        Tip(symbol: "figure.walk", text: "Scan one room at a time. When a room is finished, tap **Done**, walk through the doorway to the next room, and tap **Start**."),
        Tip(symbol: "ruler", text: "Rooms up to about 9 × 9 m (30 × 30 ft) work best."),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Tips for a Good Scan")
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
                    Text(mode == .firstRun ? "Start Scanning" : "Done")
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
                        Button("Cancel", action: onCancel)
                    }
                }
            }
        }
    }
}

#Preview {
    ScanTipsView(mode: .firstRun, onStart: {}, onCancel: {})
}
