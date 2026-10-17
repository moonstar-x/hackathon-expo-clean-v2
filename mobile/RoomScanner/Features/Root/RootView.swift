import SwiftUI

struct RootView: View {
    @Bindable var session: SessionStore
    let queue: UploadQueue
    var quotingOptions: QuotingOptionsStore
    @Environment(\.persistence) private var persistence
    @Environment(\.scenePhase) private var scenePhase
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
        .environment(\.uploadQueue, queue)
        .environment(\.quotingOptions, quotingOptions)
        .task {
            persistence.repository.setCurrentOwner(session.session?.user)
            session.onSessionChange = {
                queue.stop()
                if !session.isCapturing { persistence.repository.setCurrentOwner(session.session?.user) }
                queue.run()
                Task { await quotingOptions.refresh(session: session) }
            }
            try? await persistence.repository.resetUploading()
            queue.run()
            await session.refresh()
            await quotingOptions.refresh(session: session)
        }
        .onChange(of: session.session?.user) { _, user in
            if !session.isCapturing { persistence.repository.setCurrentOwner(user) }
        }
        .onChange(of: session.isCapturing) { _, capturing in
            if !capturing { persistence.repository.setCurrentOwner(session.session?.user); queue.run() }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { queue.run(); Task { await session.refresh(); await quotingOptions.refresh(session: session) } }
        }
        .onReceive(NotificationCenter.default.publisher(for: .locationReadyForUpload).receive(on: RunLoop.main)) { _ in queue.run() }
    }
}
