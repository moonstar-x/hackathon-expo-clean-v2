import Foundation
import os

/// App-wide loggers. Use these instead of `print`.
enum Log {
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.example.RoomScanner"

    static let capture = Logger(subsystem: subsystem, category: "capture")
    static let persistence = Logger(subsystem: subsystem, category: "persistence")
    static let geometry = Logger(subsystem: subsystem, category: "geometry")
    static let ui = Logger(subsystem: subsystem, category: "ui")
}
