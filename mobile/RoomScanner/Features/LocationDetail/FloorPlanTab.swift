import SwiftUI

/// The interactive 2D floor plan (§7.7.1).
struct FloorPlanTab: View {
    static let zoomRange: ClosedRange<CGFloat> = 0.5...8

    var geometry: ScanGeometry
    var roomNames: [UUID: String]
    @Binding var options: FloorPlanCanvas.Options

    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var selection: UUID?
    @State private var zoom: CGFloat = 1
    @State private var pan: CGSize = .zero
    @GestureState private var pinch: CGFloat = 1
    @GestureState private var drag: CGSize = .zero

    var body: some View {
        GeometryReader { proxy in
            let currentZoom = clampedZoom(zoom * pinch)
            let currentPan = CGSize(width: pan.width + drag.width, height: pan.height + drag.height)
            FloorPlanCanvas(geometry: geometry, style: .full, options: options, selection: selection,
                            roomNames: roomNames, zoom: currentZoom, pan: currentPan)
                .contentShape(Rectangle())
                .gesture(magnifyGesture.simultaneously(with: panGesture))
                .gesture(tapGestures(size: proxy.size, zoom: currentZoom, pan: currentPan))
                .accessibilityAction(named: "plan.fitToScreen", fitToScreen)
        }
        .overlay(alignment: .top) {
            if let room = selectedRoom {
                callout(for: room)
                    .padding()
                    .transition(.opacity)
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Toggle("plan.options.dimensions", systemImage: "ruler", isOn: $options.showDimensions)
                    Toggle("common.furniture", systemImage: "sofa", isOn: $options.showFurniture)
                } label: {
                    Label("plan.options.menu", systemImage: "slider.horizontal.3")
                }
            }
        }
    }

    // MARK: Gestures (PLAN-2, PLAN-5)

    private var magnifyGesture: some Gesture {
        MagnifyGesture()
            .updating($pinch) { value, state, _ in state = value.magnification }
            .onEnded { value in zoom = clampedZoom(zoom * value.magnification) }
    }

    private var panGesture: some Gesture {
        DragGesture(minimumDistance: 4)
            .updating($drag) { value, state, _ in state = value.translation }
            .onEnded { value in
                pan.width += value.translation.width
                pan.height += value.translation.height
            }
    }

    private func tapGestures(size: CGSize, zoom: CGFloat, pan: CGSize) -> some Gesture {
        SpatialTapGesture(count: 2)
            .onEnded { _ in fitToScreen() }
            .exclusively(before: SpatialTapGesture(count: 1).onEnded { value in
                hitTest(value.location, size: size, zoom: zoom, pan: pan)
            })
    }

    private func fitToScreen() {
        withAnimation(reduceMotion ? nil : .snappy) {
            zoom = 1
            pan = .zero
        }
    }

    /// Point-in-polygon in world space. Tapping empty space clears the selection.
    private func hitTest(_ location: CGPoint, size: CGSize, zoom: CGFloat, pan: CGSize) {
        let layout = FloorPlanLayout(geometry: geometry, size: size,
                                     padding: FloorPlanCanvas.Style.full.padding, zoom: zoom, pan: pan)
        let point = layout.inverse(location)
        let hit = geometry.rooms.first { GeometryMath.contains($0.floorPolygon, point: point) }
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.15)) {
            selection = hit?.id == selection ? nil : hit?.id
        }
    }

    private func clampedZoom(_ value: CGFloat) -> CGFloat {
        min(max(value, Self.zoomRange.lowerBound), Self.zoomRange.upperBound)
    }

    // MARK: Callout

    private var selectedRoom: (index: Int, room: RoomGeometry)? {
        guard let selection, let index = geometry.rooms.firstIndex(where: { $0.id == selection }) else { return nil }
        return (index, geometry.rooms[index])
    }

    private func callout(for selected: (index: Int, room: RoomGeometry)) -> some View {
        let formatter = UnitFormatter(unitPreference)
        let room = selected.room
        let defaultName = RoomNaming.defaultNames(for: geometry.rooms.map(\.detectedType))[selected.index]
        return VStack(alignment: .leading, spacing: 4) {
            Text(roomNames[room.id] ?? defaultName)
                .font(.headline)
            Text("plan.callout.area \(formatter.area(RoomMetrics.floorArea(of: room), approximate: room.isFloorApproximate))")
            Text("plan.callout.perimeter \(formatter.length(RoomMetrics.perimeter(of: room)))")
            Text("plan.callout.ceilingHeight \(RoomMetrics.ceilingHeight(of: room).map { formatter.length($0) } ?? "—")")
        }
        .font(.subheadline)
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    NavigationStack {
        FloorPlanTab(geometry: SampleGeometry.twoRoomApartment(), roomNames: [:],
                     options: .constant(.init()))
    }
}
