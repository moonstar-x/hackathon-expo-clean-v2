import SwiftUI

/// Names the location while merging and finalizing run in the background (§7.6).
struct SaveLocationSheet: View {
    @Binding var name: String
    @Binding var quoting: LocationQuotingInputs
    @Environment(\.quotingOptions) private var options
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
                quotingSection
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
                            .foregroundStyle(Color.brandError)
                        Button(.commonRetry, action: onRetry)
                    } header: {
                        Text(.commonSaveFailedTitle)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.brandBackground.ignoresSafeArea())
            .tint(Color.brandAccent)
            .navigationTitle(.saveLocationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                Button(action: onSave) {
                    Group {
                        if state == .running {
                            HStack(spacing: Spacing.s) {
                                ProgressView().tint(Brand.white)
                                Text(.commonBuildingFloorPlan)
                            }
                        } else {
                            Text(.commonSave)
                        }
                    }
                }
                .buttonStyle(.brandPrimary)
                .disabled(state != .finished)
                .padding(Spacing.l)
                .background(.bar)
            }
        }
        .presentationDetents([.medium, .large])
        .interactiveDismissDisabled()
    }
    private var quotingSection: some View {
        Section(.quoteTitle) {
            Picker(String(localized: .quoteSchedule), selection: $quoting.scheduleCode) {
                Text(.quoteServerDefault).tag(String?.none)
                ForEach(options?.options?.schedules ?? []) { schedule in
                    Text(schedule.name).tag(Optional(schedule.code))
                }
            }
            Toggle(String(localized: .quoteCustomDays), isOn: Binding(
                get: { quoting.daysPerMonth != nil }, set: { custom in quoting.daysPerMonth = custom ? options?.options?.defaults.daysPerMonth.flatMap { Int(exactly: $0) } ?? 1 : nil }))
            if quoting.daysPerMonth != nil {
                Stepper(value: Binding(get: { quoting.daysPerMonth ?? 1 }, set: { quoting.daysPerMonth = $0 }), in: 1...31) {
                    LabeledContent(String(localized: .quoteDays), value: "\(quoting.daysPerMonth ?? 1)")
                }
            } else { LabeledContent(String(localized: .quoteDays), value: String(localized: .quoteDefault)) }
            Picker(String(localized: .quoteUsualTraffic), selection: $quoting.traffic) {
                Text(.quoteDefault).tag(String?.none)
                ForEach(QuoteTraffic.allCases, id: \.self) { traffic in
                    Text(traffic.displayName).tag(Optional(traffic.rawValue))
                }
            }
            Text(.quoteSavedHelp).font(AppFont.caption).foregroundStyle(Color.brandTextSecondary)
        }
    }
}

#Preview {
    Color.gray.sheet(isPresented: .constant(true)) {
        SaveLocationSheet(name: .constant("Departamento"), quoting: .constant(.init()), roomNames: ["Sala", "Dormitorio"],
                          totalArea: 34, isAreaApproximate: false, state: .running,
                          onSave: {}, onRetry: {})
    }
}
