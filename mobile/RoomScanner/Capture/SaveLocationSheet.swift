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
                Section("common.name") {
                    TextField("saveLocation.namePlaceholder", text: $name)
                        .submitLabel(.done)
                }
                Section("common.summary") {
                    LabeledContent("common.rooms", value: "\(roomNames.count)")
                    LabeledContent("saveLocation.totalArea", value: formatter.area(totalArea, approximate: isAreaApproximate))
                    ForEach(Array(roomNames.enumerated()), id: \.offset) { _, roomName in
                        Text(roomName)
                    }
                }
                if case .failed(let message) = state {
                    Section {
                        Label(message, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                        Button("common.retry", action: onRetry)
                    } header: {
                        Text("common.saveFailedTitle")
                    }
                }
            }
            .navigationTitle("saveLocation.title")
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                Button(action: onSave) {
                    Group {
                        if state == .running {
                            HStack(spacing: 8) {
                                ProgressView()
                                Text("common.buildingFloorPlan")
                            }
                        } else {
                            Text("common.save")
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
        SaveLocationSheet(name: .constant("Departamento"), roomNames: ["Sala", "Dormitorio"],
                          totalArea: 34, isAreaApproximate: false, state: .running,
                          onSave: {}, onRetry: {})
    }
}
