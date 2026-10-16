import Foundation

struct UploadFile: Sendable {
    var name: String
    var filename: String
    var contentType: String
    var data: Data
}
struct MultipartBody: Sendable {
    var url: URL
    var boundary: String
    func remove() { try? FileManager.default.removeItem(at: url) }
}
enum MultipartBodyWriter {
    /// FileHandle writes each part separately; the multipart body is never assembled in memory.
    static func write(metadata: Data, files: [UploadFile], boundary proposed: String? = nil) throws -> MultipartBody {
        var boundary = proposed ?? "RoomScanner-\(UUID().uuidString)"
        while ([metadata] + files.map(\.data)).contains(where: { $0.range(of: Data(boundary.utf8)) != nil }) {
            boundary = "RoomScanner-\(UUID().uuidString)"
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("upload-\(UUID()).multipart")
        guard FileManager.default.createFile(atPath: url.path, contents: nil) else { throw CocoaError(.fileWriteUnknown) }
        let handle = try FileHandle(forWritingTo: url)
        do {
            func text(_ value: String) throws { try handle.write(contentsOf: Data(value.utf8)) }
            try text("--\(boundary)\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n")
            try handle.write(contentsOf: metadata); try text("\r\n")
            for file in files {
                try Task.checkCancellation()
                try text("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(file.name)\"; filename=\"\(file.filename)\"\r\nContent-Type: \(file.contentType)\r\n\r\n")
                // Bound individual writes, including for large USDZs.
                var offset = 0
                while offset < file.data.count {
                    try Task.checkCancellation()
                    let end = min(offset + 64 * 1024, file.data.count)
                    try handle.write(contentsOf: file.data.subdata(in: offset..<end)); offset = end
                }
                try text("\r\n")
            }
            try text("--\(boundary)--\r\n"); try handle.close()
            return MultipartBody(url: url, boundary: boundary)
        } catch { try? handle.close(); try? FileManager.default.removeItem(at: url); throw error }
    }
}
