import SwiftUI

/// Names the location and picks its type while merging and finalizing run in the background (§7.6).
struct SaveLocationSheet: View {
    @Binding var name: String
    @Binding var type: LocationType?
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
                Section(.commonName) {
                    TextField(String(localized: .saveLocationNamePlaceholder), text: $name)
                        .submitLabel(.done)
                }
                Section {
                    Picker(String(localized: .saveLocationType), selection: $type) {
                        Text(.saveLocationTypeUnspecified).tag(LocationType?.none)
                        ForEach(LocationTypeCategory.allCases) { category in
                            Section(category.displayName) {
                                ForEach(category.types) { type in
                                    Text(type.displayName).tag(Optional(type))
                                }
                            }
                        }
                    }
                    .pickerStyle(.menu)
                }
                Section(.commonSummary) {
                    LabeledContent(String(localized: .commonRooms), value: "\(roomNames.count)")
                    LabeledContent(String(localized: .saveLocationTotalArea), value: formatter.area(totalArea, approximate: isAreaApproximate))
                    ForEach(Array(roomNames.enumerated()), id: \.offset) { _, roomName in
                        Text(roomName)
                    }
                }
                if case .failed(let message) = state {
                    Section {
                        Label(message, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                        Button(.commonRetry, action: onRetry)
                    } header: {
                        Text(.commonSaveFailedTitle)
                    }
                }
            }
            .navigationTitle(.saveLocationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                Button(action: onSave) {
                    Group {
                        if state == .running {
                            HStack(spacing: 8) {
                                ProgressView()
                                Text(.commonBuildingFloorPlan)
                            }
                        } else {
                            Text(.commonSave)
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
        SaveLocationSheet(name: .constant("Departamento"), type: .constant(.classroom), roomNames: ["Sala", "Dormitorio"],
                          totalArea: 34, isAreaApproximate: false, state: .running,
                          onSave: {}, onRetry: {})
    }
}
