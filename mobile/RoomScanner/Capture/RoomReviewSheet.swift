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
            Text("review.title \(roomNumber)")
                .font(.title2.bold())

            TextField("review.roomNamePlaceholder", text: $name)
                .textFieldStyle(.roundedBorder)
                .font(.title3)
                .submitLabel(.done)

            if trackingWasInterrupted {
                interruptionWarning
            }

            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                metric("common.floorArea", formatter.area(RoomMetrics.floorArea(of: room), approximate: room.isFloorApproximate))
                metric("common.perimeter", formatter.length(RoomMetrics.perimeter(of: room)))
                metric("common.ceilingHeight", RoomMetrics.ceilingHeight(of: room).map { formatter.length($0) } ?? "—")
                metric("common.walls", "\(room.walls.count)")
                metric("common.doors", "\(room.doors.count)")
                metric("common.windows", "\(room.windows.count)")
                metric("common.objects", "\(room.objects.count)")
            }

            VStack(spacing: 10) {
                Button(action: onScanNext) {
                    Label("review.scanNextRoom", systemImage: "arrow.right.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button(action: onFinish) {
                    Text("review.finish").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                Button("common.rescanRoom", systemImage: "arrow.counterclockwise", action: onRescan)
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
        Label("review.trackingInterrupted",
              systemImage: "exclamationmark.triangle.fill")
            .font(.footnote)
            .foregroundStyle(.orange)
            .padding(10)
            .background(.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
    }

    // MARK: Failure

    private func failure(_ issue: CaptureIssue) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("review.failure.title \(roomNumber)", systemImage: "exclamationmark.triangle.fill")
                .font(.title3.bold())
                .foregroundStyle(.orange)
            Text(issue.message)
            if issue.isSceneTooLarge {
                Text("review.failure.sceneTooLarge")
                    .foregroundStyle(.secondary)
            }
            VStack(spacing: 10) {
                Button(action: onRescan) {
                    Label("common.rescanRoom", systemImage: "arrow.counterclockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                if completedRoomCount > 0 {
                    Button(action: onFinish) {
                        Text("common.finishWithRooms \(Counted.rooms(completedRoomCount))").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }

                Button("review.discard", role: .destructive, action: onDiscard)
                    .frame(minHeight: 44)
            }
        }
    }
}

#Preview("Review") {
    Color.gray.sheet(isPresented: .constant(true)) {
        RoomReviewSheet(name: .constant("Sala"), roomNumber: 1,
                        room: SampleGeometry.twoRoomApartment().rooms[0], issue: nil,
                        completedRoomCount: 1, trackingWasInterrupted: true,
                        onScanNext: {}, onFinish: {}, onRescan: {}, onDiscard: {})
    }
}

#Preview("Failure") {
    Color.gray.sheet(isPresented: .constant(true)) {
        RoomReviewSheet(name: .constant(""), roomNumber: 2, room: nil,
                        issue: CaptureIssue(message: "Falló el seguimiento del entorno.", isSceneTooLarge: false),
                        completedRoomCount: 1, trackingWasInterrupted: false,
                        onScanNext: {}, onFinish: {}, onRescan: {}, onDiscard: {})
    }
}
