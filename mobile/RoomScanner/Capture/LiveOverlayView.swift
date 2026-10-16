import SwiftUI

/// The top bar, live mini floor plan and dimension readout shown over the camera (§7.4).
struct LiveOverlayView: View {
    struct Readout: Equatable {
        var roomNumber: Int
        var walls = 0
        var doors = 0
        var windows = 0
        /// The current room's floor area, when its polygon is known.
        var liveArea: Float?
        var completedRooms = 0
        var completedArea: Float = 0
    }

    var geometry: ScanGeometry
    var highlightedRoomID: UUID?
    var readout: Readout
    var canFinishRoom: Bool
    /// The mini plan and readout only make sense while scanning.
    var showsLiveInfo: Bool
    var onCancel: () -> Void
    var onDone: () -> Void
    var onHelp: () -> Void

    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic
    @State private var isPlanExpanded = true

    var body: some View {
        VStack(spacing: 8) {
            topBar
            if showsLiveInfo {
                HStack(alignment: .top, spacing: 8) {
                    miniPlan
                    Spacer(minLength: 0)
                    readoutCard
                }
                .padding(.horizontal, 12)
            }
            Spacer()
        }
    }

    // MARK: Top bar (CAP-3)

    private var topBar: some View {
        HStack {
            Button(action: onCancel) {
                Label("common.cancel", systemImage: "xmark")
            }
            .frame(minWidth: 44, minHeight: 44)
            Spacer()
            Text("liveOverlay.roomTitle \(readout.roomNumber)")
                .font(.headline)
                .accessibilityAddTraits(.isHeader)
            Spacer()
            Button(action: onHelp) {
                Image(systemName: "questionmark.circle")
            }
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityLabel("liveOverlay.tipsButton")
            Button(action: onDone) {
                Label("common.done", systemImage: "checkmark")
                    .fontWeight(.semibold)
            }
            .frame(minWidth: 44, minHeight: 44)
            .disabled(!canFinishRoom)
        }
        .labelStyle(.titleAndIcon)
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background(.regularMaterial)
    }

    // MARK: Mini plan (CAP-4)

    private var miniPlan: some View {
        Button {
            isPlanExpanded.toggle()
        } label: {
            if isPlanExpanded {
                FloorPlanCanvas(geometry: geometry, style: .mini, highlightedRoomID: highlightedRoomID,
                                background: .clear)
                    .frame(width: 140, height: 140)
                    .overlay {
                        if geometry.rooms.isEmpty {
                            Image(systemName: "square.dashed")
                                .font(.largeTitle)
                                .foregroundStyle(.secondary)
                        }
                    }
            } else {
                Image(systemName: "map")
                    .font(.title3)
                    .frame(width: 44, height: 44)
            }
        }
        .buttonStyle(.plain)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityLabel(isPlanExpanded ? "liveOverlay.hideMiniPlan" : "liveOverlay.showMiniPlan")
    }

    // MARK: Readout (CAP-5)

    private var readoutCard: some View {
        let formatter = UnitFormatter(unitPreference)
        let current = [Counted.walls(readout.walls), Counted.doors(readout.doors), Counted.windows(readout.windows)]
            .joined(separator: ", ")
        return VStack(alignment: .leading, spacing: 4) {
            Text("liveOverlay.roomReadout \(readout.roomNumber) \(current)")
                .font(.subheadline.weight(.semibold))
            if let liveArea = readout.liveArea {
                Text(formatter.area(liveArea, approximate: true))
                    .font(.subheadline.monospacedDigit())
            }
            Text("liveOverlay.totalReadout \(Counted.rooms(readout.completedRooms)) \(formatter.area(readout.completedArea))")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(10)
        .frame(maxWidth: 200, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    let geometry = SampleGeometry.twoRoomApartment()
    return ZStack {
        Color.gray.ignoresSafeArea()
        LiveOverlayView(
            geometry: geometry,
            highlightedRoomID: geometry.rooms.last?.id,
            readout: .init(roomNumber: 2, walls: 3, doors: 1, windows: 1, liveArea: 12.3,
                           completedRooms: 1, completedArea: 20),
            canFinishRoom: true,
            showsLiveInfo: true,
            onCancel: {}, onDone: {}, onHelp: {}
        )
    }
}
