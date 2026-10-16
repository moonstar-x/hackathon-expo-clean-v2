import SwiftUI

/// Shown after RoomPlan processes a room, or when a room fails (§7.5, §11).
struct RoomReviewSheet: View {
    @Binding var name: String
    var roomNumber: Int
    /// The processed room. nil when the room failed.
    var room: RoomGeometry?
    var issue: CaptureIssue?
    var completedRoomCount: Int
    var trackingWasInterrupted: Bool
    var onScanNext: () -> Void
    var onFinish: () -> Void
    var onRescan: () -> Void
    var onDiscard: () -> Void

    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let issue {
                    failure(issue)
                } else if let room {
                    review(room)
                }
            }
            .padding()
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        .interactiveDismissDisabled()
    }

    // MARK: Review

    private func review(_ room: RoomGeometry) -> some View {
        let formatter = UnitFormatter(unitPreference)
        return VStack(alignment: .leading, spacing: 16) {
            Text("Room \(roomNumber) Scanned")
                .font(.title2.bold())

            TextField("Room name", text: $name)
                .textFieldStyle(.roundedBorder)
                .font(.title3)
                .submitLabel(.done)

            if trackingWasInterrupted {
                interruptionWarning
            }

            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                metric("Floor area", formatter.area(RoomMetrics.floorArea(of: room), approximate: room.isFloorApproximate))
                metric("Perimeter", formatter.length(RoomMetrics.perimeter(of: room)))
                metric("Ceiling height", RoomMetrics.ceilingHeight(of: room).map { formatter.length($0) } ?? "—")
                metric("Walls", "\(room.walls.count)")
                metric("Doors", "\(room.doors.count)")
                metric("Windows", "\(room.windows.count)")
                metric("Objects", "\(room.objects.count)")
            }

            VStack(spacing: 10) {
                Button(action: onScanNext) {
                    Label("Scan Next Room", systemImage: "arrow.right.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button(action: onFinish) {
                    Text("Finish").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                Button("Rescan This Room", systemImage: "arrow.counterclockwise", action: onRescan)
                    .frame(minHeight: 44)
            }
        }
    }

    private func metric(_ title: LocalizedStringKey, _ value: String) -> some View {
        GridRow {
            Text(title).foregroundStyle(.secondary)
            Text(value).monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }

    private var interruptionWarning: some View {
        Label("Tracking was interrupted. Rooms scanned after this may not line up. Consider finishing now.",
              systemImage: "exclamationmark.triangle.fill")
            .font(.footnote)
            .foregroundStyle(.orange)
            .padding(10)
            .background(.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
    }

    // MARK: Failure

    private func failure(_ issue: CaptureIssue) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Room \(roomNumber) Couldn't Be Scanned", systemImage: "exclamationmark.triangle.fill")
                .font(.title3.bold())
                .foregroundStyle(.orange)
            Text(issue.message)
            if issue.isSceneTooLarge {
                Text("The scanned area got too large. Try finishing each room sooner.")
                    .foregroundStyle(.secondary)
            }
            VStack(spacing: 10) {
                Button(action: onRescan) {
                    Label("Rescan This Room", systemImage: "arrow.counterclockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                if completedRoomCount > 0 {
                    Button(action: onFinish) {
                        Text("Finish with \(Counted.rooms(completedRoomCount))").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }

                Button("Discard", role: .destructive, action: onDiscard)
                    .frame(minHeight: 44)
            }
        }
    }
}

#Preview("Review") {
    Color.gray.sheet(isPresented: .constant(true)) {
        RoomReviewSheet(name: .constant("Living Room"), roomNumber: 1,
                        room: SampleGeometry.twoRoomApartment().rooms[0], issue: nil,
                        completedRoomCount: 1, trackingWasInterrupted: true,
                        onScanNext: {}, onFinish: {}, onRescan: {}, onDiscard: {})
    }
}

#Preview("Failure") {
    Color.gray.sheet(isPresented: .constant(true)) {
        RoomReviewSheet(name: .constant(""), roomNumber: 2, room: nil,
                        issue: CaptureIssue(message: "World tracking failed.", isSceneTooLarge: false),
                        completedRoomCount: 1, trackingWasInterrupted: false,
                        onScanNext: {}, onFinish: {}, onRescan: {}, onDiscard: {})
    }
}
