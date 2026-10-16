import SwiftUI
import simd

/// The 2D floor plan (§9.1), drawn with a single `Canvas`. Used by the Plan tab and PNG export
/// (`.full`), the live capture overlay (`.mini`) and Home thumbnails (`.thumbnail`).
struct FloorPlanCanvas: View {
    enum Style: Sendable {
        case full, mini, thumbnail

        var padding: CGFloat { self == .full ? 24 : 8 }
    }

    struct Options: Equatable, Sendable {
        var showDimensions = true
        var showFurniture = true
    }

    var geometry: ScanGeometry
    var style: Style = .full
    var options = Options()
    /// The room the user tapped. Drawn in the accent color.
    var selection: UUID?
    /// The room being scanned in the mini plan. Drawn in the accent color.
    var highlightedRoomID: UUID?
    /// Room names by id. Rooms without an entry use their default name (§6.5).
    var roomNames: [UUID: String] = [:]
    var zoom: CGFloat = 1
    var pan: CGSize = .zero
    /// Used to cut gaps in walls for doors and windows. Must match what's behind the canvas.
    var background = Color(uiColor: .systemBackground)
    /// Overrides the unit setting, for example in exports.
    var unitSystem: ResolvedUnitSystem?
    /// Overrides the style's padding, for example to leave room for labels in exports.
    var contentPadding: CGFloat?

    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        let renderer = FloorPlanRenderer(
            geometry: geometry,
            style: style,
            options: options,
            selection: selection,
            highlightedRoomID: highlightedRoomID,
            names: resolvedNames,
            formatter: formatter,
            background: background,
            zoom: zoom,
            pan: pan,
            padding: contentPadding ?? style.padding
        )
        Canvas { context, size in
            renderer.draw(in: &context, size: size)
        }
        .background(background)
        .accessibilityElement()
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint(style == .full ? String(localized: "common.seeMeasurementsHint") : "")
    }

    private var formatter: UnitFormatter {
        unitSystem.map { UnitFormatter(system: $0) } ?? UnitFormatter(unitPreference)
    }

    private var resolvedNames: [String] {
        let defaults = RoomNaming.defaultNames(for: geometry.rooms.map(\.detectedType))
        return geometry.rooms.enumerated().map { index, room in
            roomNames[room.id] ?? defaults[index]
        }
    }

    private var accessibilityLabel: Text {
        let count = geometry.rooms.count
        let area = formatter.spokenArea(LocationMetrics.totalFloorArea(of: geometry))
        switch style {
        case .full, .thumbnail:
            return Text("canvas.a11y.full \(Counted.rooms(count)) \(area)")
        case .mini:
            return Text("canvas.a11y.live \(Counted.rooms(count))")
        }
    }
}

/// The drawing code behind `FloorPlanCanvas`, separated so the Canvas closure only captures values.
struct FloorPlanRenderer {
    static let roomPalette: [Color] = [.blue, .green, .orange, .purple, .pink, .teal, .yellow, .mint]
    static let wallThickness: Float = 0.12
    static let minimumWallWidth: CGFloat = 3
    static let minimumLabeledWallLength: Float = 0.5

    var geometry: ScanGeometry
    var style: FloorPlanCanvas.Style
    var options: FloorPlanCanvas.Options
    var selection: UUID?
    var highlightedRoomID: UUID?
    var names: [String]
    var formatter: UnitFormatter
    var background: Color
    var zoom: CGFloat
    var pan: CGSize
    var padding: CGFloat

    func draw(in context: inout GraphicsContext, size: CGSize) {
        guard size.width > 0, size.height > 0 else { return }
        let layout = FloorPlanLayout(geometry: geometry, size: size, padding: padding, zoom: zoom, pan: pan)
        let wallWidth = max(layout.points(Self.wallThickness), Self.minimumWallWidth)

        drawFloors(in: &context, layout: layout)
        if options.showFurniture {
            drawObjects(in: &context, layout: layout)
        }
        drawWalls(in: &context, layout: layout, wallWidth: wallWidth)
        drawOpenings(in: &context, layout: layout, wallWidth: wallWidth)

        guard style == .full else { return }
        let roomLabels = prepareRoomLabels(in: context, layout: layout)
        var placed = roomLabels.map(\.rect)
        if options.showDimensions {
            drawWallLabels(in: &context, layout: layout, wallWidth: wallWidth, placed: &placed)
        }
        for label in roomLabels {
            context.draw(label.name, at: label.namePoint, anchor: .center)
            if let area = label.area {
                context.draw(area, at: label.areaPoint, anchor: .center)
            }
        }
        drawScaleBar(in: &context, layout: layout, size: size)
    }

    // MARK: 1. Floors

    private func drawFloors(in context: inout GraphicsContext, layout: FloorPlanLayout) {
        for (index, room) in geometry.rooms.enumerated() where room.floorPolygon.count >= 3 {
            let path = Self.polygonPath(room.floorPolygon, layout: layout)
            let isAccent = room.id == selection || room.id == highlightedRoomID
            let color = isAccent
                ? Color.accentColor.opacity(0.3)
                : Self.roomPalette[index % Self.roomPalette.count].opacity(0.15)
            context.fill(path, with: .color(color))
        }
    }

    // MARK: 2. Objects

    private func drawObjects(in context: inout GraphicsContext, layout: FloorPlanLayout) {
        for object in geometry.renderObjects {
            let path = Self.polygonPath(object.footprint, layout: layout)
            context.fill(path, with: .style(.quaternary))
            context.stroke(path, with: .color(.secondary), lineWidth: 1)
        }
    }

    // MARK: 3. Walls

    private func drawWalls(in context: inout GraphicsContext, layout: FloorPlanLayout, wallWidth: CGFloat) {
        var path = Path()
        for wall in geometry.renderWalls {
            let segment = wall.planSegment
            path.move(to: layout.apply(segment.start))
            path.addLine(to: layout.apply(segment.end))
        }
        context.stroke(path, with: .color(.primary),
                       style: StrokeStyle(lineWidth: wallWidth, lineCap: .round, lineJoin: .round))
    }

    // MARK: 4. Doors, windows and openings

    private func drawOpenings(in context: inout GraphicsContext, layout: FloorPlanLayout, wallWidth: CGFloat) {
        let surfaces = geometry.renderDoors + geometry.renderWindows + geometry.renderOpenings
        // Cut a gap in the wall first.
        var gaps = Path()
        for surface in surfaces {
            let (a, b) = viewSegment(surface, layout: layout)
            gaps.move(to: a)
            gaps.addLine(to: b)
        }
        context.stroke(gaps, with: .color(background), style: StrokeStyle(lineWidth: wallWidth + 2, lineCap: .butt))

        let tick = wallWidth / 2 + 2
        for surface in surfaces {
            let (a, b) = viewSegment(surface, layout: layout)
            let normal = Self.unitNormal(from: a, to: b)
            switch surface.kind {
            case .door:
                var path = Path()
                path.move(to: a)
                path.addLine(to: b)
                for end in [a, b] {
                    path.move(to: end + normal * tick)
                    path.addLine(to: end - normal * tick)
                }
                context.stroke(path, with: .color(.secondary), lineWidth: 1.5)
            case .window:
                let offset = max(layout.points(0.03), 1)
                var path = Path()
                for sign: CGFloat in [1, -1] {
                    path.move(to: a + normal * (offset * sign))
                    path.addLine(to: b + normal * (offset * sign))
                }
                context.stroke(path, with: .color(.blue), lineWidth: 1)
            case .opening:
                var path = Path()
                path.move(to: a)
                path.addLine(to: b)
                context.stroke(path, with: .color(.secondary), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
            case .wall:
                break
            }
        }
    }

    // MARK: 5. Wall length labels

    private func drawWallLabels(in context: inout GraphicsContext, layout: FloorPlanLayout,
                                wallWidth: CGFloat, placed: inout [CGRect]) {
        let content = layout.contentRect
        let contentCenter = CGPoint(x: content.midX, y: content.midY)
        let minimumOffset: CGFloat = 12

        for wall in geometry.renderWalls where wall.length >= Self.minimumLabeledWallLength {
            let (a, b) = viewSegment(wall, layout: layout)
            let mid = CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2)
            var normal = Self.unitNormal(from: a, to: b)
            // Put the label on the side away from the plan's center.
            if (mid.x - contentCenter.x) * normal.x + (mid.y - contentCenter.y) * normal.y < 0 {
                normal = CGPoint(x: -normal.x, y: -normal.y)
            }
            var angle = atan2(b.y - a.y, b.x - a.x)
            if angle > .pi / 2 { angle -= .pi }
            if angle < -.pi / 2 { angle += .pi }

            let text = context.resolve(Text(formatter.length(wall.length)).font(.caption2))
            let textSize = text.measure(in: CGSize(width: CGFloat.infinity, height: .infinity))
            // 12 pt from the wall, and never on top of a thick wall stroke.
            let position = mid + normal * max(minimumOffset, wallWidth / 2 + textSize.height / 2 + 2)
            let rect = Self.rotatedBounds(size: textSize, angle: angle, center: position)
            guard !placed.contains(where: { $0.intersects(rect) }) else { continue }
            placed.append(rect)

            var labelContext = context
            labelContext.translateBy(x: position.x, y: position.y)
            labelContext.rotate(by: .radians(angle))
            labelContext.draw(text, at: .zero, anchor: .center)
        }
    }

    // MARK: 6. Room labels

    private struct RoomLabel {
        var name: GraphicsContext.ResolvedText
        var area: GraphicsContext.ResolvedText?
        var namePoint: CGPoint
        var areaPoint: CGPoint
        var rect: CGRect
    }

    private func prepareRoomLabels(in context: GraphicsContext, layout: FloorPlanLayout) -> [RoomLabel] {
        let unbounded = CGSize(width: CGFloat.infinity, height: .infinity)
        return geometry.rooms.enumerated().compactMap { index, room in
            guard let position = RoomMetrics.labelPosition(of: room) else { return nil }
            let center = layout.apply(position)
            let name = context.resolve(Text(names[index]).font(.caption.weight(.semibold)))
            let nameSize = name.measure(in: unbounded)

            var area: GraphicsContext.ResolvedText?
            var areaSize = CGSize.zero
            if let value = RoomMetrics.floorArea(of: room) {
                let text = formatter.area(value, approximate: room.isFloorApproximate)
                let resolved = context.resolve(Text(text).font(.caption2).foregroundStyle(.secondary))
                areaSize = resolved.measure(in: unbounded)
                area = resolved
            }
            let totalHeight = nameSize.height + areaSize.height
            let top = center.y - totalHeight / 2
            let width = max(nameSize.width, areaSize.width)
            return RoomLabel(
                name: name,
                area: area,
                namePoint: CGPoint(x: center.x, y: top + nameSize.height / 2),
                areaPoint: CGPoint(x: center.x, y: top + nameSize.height + areaSize.height / 2),
                rect: CGRect(x: center.x - width / 2, y: top, width: width, height: totalHeight).insetBy(dx: -2, dy: -2)
            )
        }
    }

    // MARK: 7. Scale bar

    private func drawScaleBar(in context: inout GraphicsContext, layout: FloorPlanLayout, size: CGSize) {
        let scaleBar = formatter.scaleBar
        let length = layout.points(Float(scaleBar.meters))
        guard length.isFinite, length > 4 else { return }
        let origin = CGPoint(x: 16, y: size.height - 16)
        let end = CGPoint(x: origin.x + length, y: origin.y)

        var path = Path()
        path.move(to: origin)
        path.addLine(to: end)
        for x in [origin.x, end.x] {
            path.move(to: CGPoint(x: x, y: origin.y - 4))
            path.addLine(to: CGPoint(x: x, y: origin.y + 4))
        }
        context.stroke(path, with: .color(.primary), lineWidth: 1.5)
        let label = context.resolve(Text(scaleBar.label).font(.caption2))
        context.draw(label, at: CGPoint(x: origin.x, y: origin.y - 6), anchor: .bottomLeading)
    }

    // MARK: Helpers

    private func viewSegment(_ surface: SurfaceGeometry, layout: FloorPlanLayout) -> (CGPoint, CGPoint) {
        let segment = surface.planSegment
        return (layout.apply(segment.start), layout.apply(segment.end))
    }

    static func polygonPath(_ polygon: [SIMD2<Float>], layout: FloorPlanLayout) -> Path {
        var path = Path()
        guard let first = polygon.first else { return path }
        path.move(to: layout.apply(first))
        for point in polygon.dropFirst() {
            path.addLine(to: layout.apply(point))
        }
        path.closeSubpath()
        return path
    }

    static func unitNormal(from a: CGPoint, to b: CGPoint) -> CGPoint {
        let dx = b.x - a.x
        let dy = b.y - a.y
        let length = max(hypot(dx, dy), .ulpOfOne)
        return CGPoint(x: -dy / length, y: dx / length)
    }

    /// The axis-aligned bounds of a `size` rectangle rotated by `angle` about `center`.
    static func rotatedBounds(size: CGSize, angle: CGFloat, center: CGPoint) -> CGRect {
        let c = abs(cos(angle))
        let s = abs(sin(angle))
        let width = size.width * c + size.height * s
        let height = size.width * s + size.height * c
        return CGRect(x: center.x - width / 2, y: center.y - height / 2, width: width, height: height)
    }
}

private extension CGPoint {
    static func + (lhs: CGPoint, rhs: CGPoint) -> CGPoint { CGPoint(x: lhs.x + rhs.x, y: lhs.y + rhs.y) }
    static func - (lhs: CGPoint, rhs: CGPoint) -> CGPoint { CGPoint(x: lhs.x - rhs.x, y: lhs.y - rhs.y) }
    static func * (lhs: CGPoint, rhs: CGFloat) -> CGPoint { CGPoint(x: lhs.x * rhs, y: lhs.y * rhs) }
}

#Preview("Full") {
    FloorPlanCanvas(geometry: SampleGeometry.twoRoomApartment())
        .frame(height: 400)
}

#Preview("Rotated L-shape") {
    FloorPlanCanvas(geometry: SampleGeometry.rotated(SampleGeometry.lShapedRoom(), by: 0.5))
        .frame(height: 400)
}

#Preview("Mini") {
    let geometry = SampleGeometry.twoRoomApartment()
    return FloorPlanCanvas(geometry: geometry, style: .mini, highlightedRoomID: geometry.rooms.last?.id)
        .frame(width: 140, height: 140)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding()
        .background(.gray)
}
