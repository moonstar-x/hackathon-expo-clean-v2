import SwiftUI

/// Names the location while merging and finalizing run in the background (§7.6).
struct SaveLocationSheet: View {
    @Binding var name: String
    var roomNames: [String]
    var totalArea: Float
    var isAreaApproximate: Bool
    var state: CaptureViewModel.FinalizeState
    var onSave: () -> Void
    var onRetry: () -> Void

    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        let formatter = UnitFormatter(unitPreference)
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Location name", text: $name)
                        .submitLabel(.done)
                }
                Section("Summary") {
                    LabeledContent("Rooms", value: "\(roomNames.count)")
                    LabeledContent("Total area", value: formatter.area(totalArea, approximate: isAreaApproximate))
                    ForEach(Array(roomNames.enumerated()), id: \.offset) { _, roomName in
                        Text(roomName)
                    }
                }
                if case .failed(let message) = state {
                    Section {
                        Label(message, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                        Button("Retry", action: onRetry)
                    } header: {
                        Text("Couldn't save scan")
                    }
                }
            }
            .navigationTitle("Save Location")
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                Button(action: onSave) {
                    Group {
                        if state == .running {
                            HStack(spacing: 8) {
                                ProgressView()
                                Text("Building floor plan…")
                            }
                        } else {
                            Text("Save")
                        }
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(state != .finished)
                .padding()
                .background(.bar)
            }
        }
        .presentationDetents([.medium, .large])
        .interactiveDismissDisabled()
    }
}

#Preview {
    Color.gray.sheet(isPresented: .constant(true)) {
        SaveLocationSheet(name: .constant("Apartment"), roomNames: ["Living Room", "Bedroom"],
                          totalArea: 34, isAreaApproximate: false, state: .running,
                          onSave: {}, onRetry: {})
    }
}
