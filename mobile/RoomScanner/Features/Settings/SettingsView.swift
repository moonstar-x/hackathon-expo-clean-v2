import CoreData
import SwiftUI

/// Unit preference and app information (§7.8).
struct SettingsView: View {
    @FetchRequest(sortDescriptors: []) private var locations: FetchedResults<Location>
    @Environment(\.uploadQueue) private var queue
    @Environment(\.sessionStore) private var session
    @State private var confirmLogout = false
    @State private var serverURL = ""
    @State private var connectionResult: String?
    @Environment(\.dismiss) private var dismiss
    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        NavigationStack {
            Form {
                if let session {
                    Section(.settingsAccount) {
                        if let user = session.session?.user {
                            if let name = user.name { Text(name) }
                            Text(user.email)
                        }
                        Button(.settingsLogout, role: .destructive) { confirmLogout = true }
                    }
                    Section(.settingsSync) {
                        Text(.settingsSyncPending(count: pendingLocations.count))
                        Button(.settingsSyncNow) {
                            Task {
                                for id in pendingLocations.compactMap(\.id) { await queue?.retry(locationID: id) }
                                queue?.run()
                            }
                        }
                    }
                    Section(.settingsServer) {
                        Text(session.configuration?.baseURL.host ?? "")
                        #if DEBUG
                        TextField(String(localized: .settingsServerURL), text: $serverURL)
                            .textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL)
                        Button(.settingsServerSave) { changeServer(serverURL) }
                        Button(.settingsServerReset) { changeServer(nil) }
                        Button(.settingsServerTest) {
                            Task {
                                do { try await session.client?.health(); connectionResult = String(localized: .settingsServerConnected) }
                                catch { connectionResult = error.localizedDescription }
                            }
                        }
                        if let result = connectionResult { Text(result) }
                        #endif
                    }
                }
                Section {
                    Picker(.settingsUnits, selection: $unitPreference) {
                        ForEach(UnitSystem.allCases) { system in
                            Text(system.displayName).tag(system)
                        }
                    }
                } footer: {
                    if unitPreference == .automatic {
                        Text(.settingsUnitsAutomaticFooter)
                    }
                }

                Section(.settingsAbout) {
                    LabeledContent(String(localized: .settingsVersion), value: versionText)
                    Text(.settingsStoredOnDevice)
                        .foregroundStyle(.secondary)
                }
            }
            .onAppear { serverURL = session?.configurationValue ?? "" }
            .confirmationDialog(String(localized: .settingsLogoutConfirm), isPresented: $confirmLogout, titleVisibility: .visible) {
                Button(.settingsLogout, role: .destructive) { session?.logout(); dismiss() }
                Button(.commonCancel, role: .cancel) {}
            } message: {
                if !pendingLocations.isEmpty { Text(.settingsLogoutPending(count: pendingLocations.count)) }
            }
            .navigationTitle(.homeSettings)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(.commonDone) { dismiss() }
                }
            }
        }
    }

    private var pendingLocations: [Location] {
        locations.filter { $0.ownerUserID == session?.session?.user.id && $0.status == .complete && [.pending, .uploading, .failed].contains($0.syncStatus) }
    }

    #if DEBUG
    private func changeServer(_ value: String?) {
        do { try session?.changeServer(to: value); dismiss() }
        catch { connectionResult = String(localized: .settingsServerInvalid) }
    }
    #endif

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
