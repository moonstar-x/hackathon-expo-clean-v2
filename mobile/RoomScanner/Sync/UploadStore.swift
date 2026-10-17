import Foundation

enum SyncStatus: String, Sendable { case localOnly, pending, uploading, uploaded, failed }
struct UploadSnapshot: Sendable {
    var id: UUID
    var name: String
    var createdAt: Date
    var geometryJSON: Data
    var thumbnailPNG: Data?
    var raw: StoredRawData
    var quoting: LocationQuotingInputs = .init()
}
protocol UploadStore: Sendable {
    func uploadSnapshot(locationID: UUID) async throws -> UploadSnapshot?
    func readyUploadIDs(userID: Int64, now: Date) async throws -> [UUID]
    func markSync(locationID: UUID, status: SyncStatus, remoteID: Int64?, error: String?, countAttempt: Bool) async throws
    func retryUpload(locationID: UUID, user: Session.User) async throws
    func resetUploading() async throws
}
extension Notification.Name {
    static let locationReadyForUpload = Notification.Name("LocationReadyForUpload")
}
