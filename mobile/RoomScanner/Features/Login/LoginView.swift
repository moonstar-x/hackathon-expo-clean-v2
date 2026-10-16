import SwiftUI

struct LoginView: View {
    @Bindable var store: SessionStore
    @State private var email = ""
    @State private var password = ""
    @FocusState private var focus: Field?
    private enum Field { case email, password }
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image(systemName: "viewfinder").font(.system(size: 64)).foregroundStyle(.tint).accessibilityHidden(true)
                Text(verbatim: "RoomScanner").font(.largeTitle.bold())
                Text(.loginSubtitle).multilineTextAlignment(.center)
                TextField(String(localized: .loginEmail), text: $email)
                    .textContentType(.username).keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .focused($focus, equals: .email).submitLabel(.next).onSubmit { focus = .password }
                    .disabled(store.isLoggingIn)
                SecureField(String(localized: .loginPassword), text: $password)
                    .textContentType(.password).focused($focus, equals: .password).submitLabel(.go)
                    .onSubmit { submit() }.disabled(store.isLoggingIn)
                Button(action: submit) {
                    Group { if store.isLoggingIn { ProgressView().tint(.white) } else { Text(.loginSubmit) } }.frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent).controlSize(.large)
                .disabled(email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty || store.isLoggingIn)
                if let error = store.loginError { Text(error).foregroundStyle(.red).accessibilityAddTraits(.updatesFrequently) }
                Text(.serverHost(host: store.configuration?.baseURL.host ?? "")).font(.footnote).foregroundStyle(.secondary)
            }
            .textFieldStyle(.roundedBorder).padding(28).frame(maxWidth: 480).frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .onAppear { email = store.lastLoginEmail }
    }
    private func submit() {
        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !password.isEmpty else { return }
        Task { if await store.login(email: email, password: password) { password = "" } }
    }
}
