import SwiftUI

/// Unit preference and app information (§7.8).
struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Units", selection: $unitPreference) {
                        ForEach(UnitSystem.allCases) { system in
                            Text(system.displayName).tag(system)
                        }
                    }
                } footer: {
                    if unitPreference == .automatic {
                        Text("Automatic uses your region's measurement system.")
                    }
                }

                Section("About") {
                    LabeledContent("Version", value: versionText)
                    Text("Scans are stored only on this device.")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var versionText: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
    }
}

#Preview {
    SettingsView()
}
