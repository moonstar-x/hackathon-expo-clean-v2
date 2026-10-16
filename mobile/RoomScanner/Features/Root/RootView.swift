import SwiftUI

struct RootView: View {
    @Bindable var session: SessionStore
    var body: some View {
        Group {
            if session.configuration == nil {
                ContentUnavailableView {
                    Label(.configurationMissing, systemImage: "network.slash")
                } description: {
                    Text(.configurationInvalid(value: session.configurationValue))
                }
            } else if session.session != nil || session.isCapturing {
                HomeView()
            } else {
                LoginView(store: session)
            }
        }
        .environment(\.sessionStore, session)
        .task { await session.refresh() }
    }
}
