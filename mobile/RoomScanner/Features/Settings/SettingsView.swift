import SwiftUI

/// Unit preference and app information (§7.8).
struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("settings.units", selection: $unitPreference) {
                        ForEach(UnitSystem.allCases) { system in
                            Text(system.displayName).tag(system)
                        }
                    }
                } footer: {
                    if unitPreference == .automatic {
                        Text("settings.units.automaticFooter")
                    }
                }

                Section("settings.about") {
                    LabeledContent("settings.version", value: versionText)
                    Text("settings.storedOnDevice")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("home.settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("common.done") { dismiss() }
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
