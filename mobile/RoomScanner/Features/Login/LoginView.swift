import SwiftUI

struct LoginView: View {
    @Bindable var store: SessionStore
    @State private var email = ""
    @State private var password = ""
    @State private var logoProgress: CGFloat = 0
    @FocusState private var focus: Field?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private enum Field { case email, password }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                hero
                fields
                if let error = store.loginError {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(AppFont.footnote)
                        .foregroundStyle(Color.brandError)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityAddTraits(.updatesFrequently)
                }
                Text(.serverHost(host: store.configuration?.baseURL.host ?? ""))
                    .font(AppFont.footnote)
                    .foregroundStyle(Color.brandTextTertiary)
            }
            .padding(Spacing.xl)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.brandBackground.ignoresSafeArea())
        .onAppear {
            email = store.lastLoginEmail
            animateLogo()
        }
    }

    // MARK: Hero (the sign-in signature moment)

    private var hero: some View {
        VStack(spacing: Spacing.m) {
            BrandLogo()
                .frame(height: 52)
                .frame(maxWidth: 260)
                .padding(.top, Spacing.xl)
                // Signature moment: a left-to-right "squeegee wipe" reveals the logo.
                .mask(alignment: .leading) {
                    Rectangle().scaleEffect(x: logoProgress, y: 1, anchor: .leading)
                }
            Text(.loginSubtitle)
                .font(AppFont.subheadline)
                .foregroundStyle(Color.brandTextSecondary)
                .multilineTextAlignment(.center)
                .brandBodyLineSpacing()
                .opacity(logoProgress >= 1 ? 1 : 0)
                .animation(.easeIn(duration: 0.3), value: logoProgress)
        }
        .padding(.bottom, Spacing.s)
    }

    private func animateLogo() {
        logoProgress = 0
        guard !reduceMotion else { logoProgress = 1; return }
        withAnimation(.easeInOut(duration: 1.6)) { logoProgress = 1 }
    }

    // MARK: Fields

    private var fields: some View {
        VStack(spacing: Spacing.m) {
            TextField(String(localized: .loginEmail), text: $email)
                .textContentType(.username).keyboardType(.emailAddress)
                .textInputAutocapitalization(.never).autocorrectionDisabled()
                .focused($focus, equals: .email).submitLabel(.next).onSubmit { focus = .password }
                .disabled(store.isLoggingIn)
                .textFieldStyle(.brand)
                .brandFieldFocus(focus == .email)

            SecureField(String(localized: .loginPassword), text: $password)
                .textContentType(.password).focused($focus, equals: .password).submitLabel(.go)
                .onSubmit { submit() }.disabled(store.isLoggingIn)
                .textFieldStyle(.brand)
                .brandFieldFocus(focus == .password)

            Button(action: submit) {
                Group {
                    if store.isLoggingIn { ProgressView().tint(Brand.white) }
                    else { Text(.loginSubmit) }
                }
            }
            .buttonStyle(.brandPrimary)
            .disabled(email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty || store.isLoggingIn)
            .padding(.top, Spacing.xs)
        }
    }

    private func submit() {
        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !password.isEmpty else { return }
        Task { if await store.login(email: email, password: password) { password = "" } }
    }
}

#Preview {
    LoginView(store: SessionStore())
}
