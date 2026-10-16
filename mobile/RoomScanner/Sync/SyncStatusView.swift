import SwiftUI

struct SyncStatusView: View {
    @ObservedObject var location: Location
    var compact = false
    @Environment(\.sessionStore) private var session
    @Environment(\.uploadQueue) private var queue
    private var anotherAccount: Bool { location.ownerUserID != 0 && location.ownerUserID != session?.session?.user.id }
    private var title: String {
        if anotherAccount { return compact ? String(localized: .syncOtherAccount) : String(localized: .syncOwnedBy(email: location.ownerEmail ?? "")) }
        switch location.syncStatus {
        case .localOnly: return String(localized: .syncLocalOnly)
        case .pending: return String(localized: .syncPending)
        case .uploading: return String(localized: .syncUploading)
        case .uploaded:
            if !compact, let date = location.uploadedAt { return String(localized: .syncUploadedAt(date: date.formatted(date: .abbreviated, time: .shortened))) }
            return String(localized: .syncUploaded)
        case .failed: return String(localized: .syncFailed)
        }
    }
    private var symbol: String {
        if anotherAccount { return "person.crop.circle.badge.exclamationmark" }
        return switch location.syncStatus {
        case .localOnly: "iphone"
        case .pending: "arrow.up.circle"
        case .uploading: "arrow.up.circle.fill"
        case .uploaded: "checkmark.circle.fill"
        case .failed: "exclamationmark.triangle.fill"
        }
    }
    var body: some View {
        if location.status == .complete {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Label(title, systemImage: symbol)
                        .foregroundStyle(location.syncStatus == .uploaded ? Color.green : location.syncStatus == .failed ? Color.orange : Color.secondary)
                    if !compact && !anotherAccount {
                        if location.syncStatus == .localOnly {
                            Button(.syncUpload) { retry() }
                        } else if location.syncStatus == .failed || (location.syncStatus == .pending && location.lastUploadError != nil) {
                            Button(.syncRetry) { retry() }
                        }
                    }
                }
                if !compact, !anotherAccount, let error = location.lastUploadError { Text(.syncError(message: error)).foregroundStyle(.secondary) }
            }
            .font(.caption)
        }
    }
    private func retry() { if let id = location.id { Task { await queue?.retry(locationID: id) } } }
}
