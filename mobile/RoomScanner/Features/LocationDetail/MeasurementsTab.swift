import SwiftUI

/// Every room, wall, door, window, opening and object, in the current units (§7.7.3).
struct MeasurementsTab: View {
    var geometry: ScanGeometry
    var rooms: [Room]
    var scanDate: Date
    var onRenameRoom: (UUID, String) -> Void

    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic
    @State private var renamingRoom: RenameTarget?
    @State private var renameText = ""

    private struct RenameTarget: Identifiable {
        var id: UUID
        var name: String
    }

    var body: some View {
        let formatter = UnitFormatter(unitPreference)
        let names = roomNames
        List {
            summarySection(formatter)
            ForEach(Array(geometry.rooms.enumerated()), id: \.element.id) { index, room in
                roomSection(room, name: names[index], formatter: formatter)
            }
        }
        .listStyle(.insetGrouped)
        .alert("Rename Room",
               isPresented: Binding(get: { renamingRoom != nil }, set: { if !$0 { renamingRoom = nil } }),
               presenting: renamingRoom) { target in
            TextField("Name", text: $renameText)
            Button("Save") { onRenameRoom(target.id, renameText) }
            Button("Cancel", role: .cancel) {}
        }
    }

    private var roomNames: [String] {
        let stored = Dictionary(rooms.compactMap { room in room.id.map { ($0, room.displayName) } },
                                uniquingKeysWith: { first, _ in first })
        let defaults = RoomNaming.defaultNames(for: geometry.rooms.map(\.detectedType))
        return geometry.rooms.enumerated().map { index, room in stored[room.id] ?? defaults[index] }
    }

    // MARK: Summary

    private func summarySection(_ formatter: UnitFormatter) -> some View {
        let total = LocationMetrics.totalFloorArea(of: geometry)
        let approximate = LocationMetrics.isAreaApproximate(geometry)
        let footprint = LocationMetrics.footprint(of: geometry)
        return Section("Summary") {
            row(String(localized: "Total floor area"), formatter.area(total, approximate: approximate),
                spoken: formatter.spokenArea(total))
            row(String(localized: "Rooms"), "\(geometry.rooms.count)", spoken: "\(geometry.rooms.count)")
            if let footprint {
                row(String(localized: "Footprint"), formatter.lengthPair(footprint.width, footprint.length),
                    spoken: String(localized: "\(formatter.spokenLength(footprint.width)) by \(formatter.spokenLength(footprint.length))"))
            }
            row(String(localized: "Scanned"), scanDate.formatted(date: .abbreviated, time: .shortened),
                spoken: scanDate.formatted(date: .long, time: .shortened))
        }
    }

    // MARK: Rooms

    private func roomSection(_ room: RoomGeometry, name: String, formatter: UnitFormatter) -> some View {
        let area = RoomMetrics.floorArea(of: room)
        let perimeter = RoomMetrics.perimeter(of: room)
        let ceiling = RoomMetrics.ceilingHeight(of: room)
        return Section {
            row(String(localized: "Floor area"), formatter.area(area, approximate: room.isFloorApproximate),
                spoken: area.map { (room.isFloorApproximate ? String(localized: "approximately ") : "") + formatter.spokenArea($0) }
                    ?? String(localized: "unknown"))
            row(String(localized: "Perimeter"), formatter.length(perimeter), spoken: formatter.spokenLength(perimeter))
            row(String(localized: "Ceiling height"), ceiling.map { formatter.length($0) } ?? "—",
                spoken: ceiling.map { formatter.spokenLength($0) } ?? String(localized: "unknown"))

            surfaceGroup(String(localized: "Walls"), noun: String(localized: "Wall"), room.walls, formatter: formatter)
            surfaceGroup(String(localized: "Doors"), noun: String(localized: "Door"), room.doors, formatter: formatter)
            surfaceGroup(String(localized: "Windows"), noun: String(localized: "Window"), room.windows, formatter: formatter)
            surfaceGroup(String(localized: "Openings"), noun: String(localized: "Opening"), room.openings, formatter: formatter)
            objectGroup(room.objects, formatter: formatter)
        } header: {
            Text(name)
                .contextMenu {
                    Button {
                        renameText = name
                        renamingRoom = RenameTarget(id: room.id, name: name)
                    } label: {
                        Label("Rename Room", systemImage: "pencil")
                    }
                }
                .accessibilityAction(named: "Rename Room") {
                    renameText = name
                    renamingRoom = RenameTarget(id: room.id, name: name)
                }
        }
    }

    /// Walls are length × height; doors, windows and openings are width × height.
    @ViewBuilder
    private func surfaceGroup(_ title: String, noun: String, _ surfaces: [SurfaceGeometry],
                              formatter: UnitFormatter) -> some View {
        DisclosureGroup("\(title) (\(surfaces.count))") {
            ForEach(Array(surfaces.enumerated()), id: \.element.id) { index, surface in
                let label = "\(noun) \(index + 1)"
                let isOpen = surface.isOpen == true
                let value = formatter.lengthPair(surface.length, surface.height) + (isOpen ? String(localized: ", open") : "")
                let spoken = String(localized: "\(formatter.spokenLength(surface.length)) by \(formatter.spokenLength(surface.height))")
                    + (isOpen ? String(localized: ", open") : "")
                row(label, value, spoken: spoken)
            }
        }
        .disabled(surfaces.isEmpty)
    }

    /// Objects are category, W × D × H.
    private func objectGroup(_ objects: [ObjectGeometry], formatter: UnitFormatter) -> some View {
        DisclosureGroup("\(String(localized: "Objects")) (\(objects.count))") {
            ForEach(objects) { object in
                let spoken = String(localized: "\(formatter.spokenLength(object.width)) wide, \(formatter.spokenLength(object.depth)) deep, \(formatter.spokenLength(object.height)) high")
                row(object.category.displayName,
                    formatter.size(width: object.width, depth: object.depth, height: object.height),
                    spoken: spoken)
            }
        }
        .disabled(objects.isEmpty)
    }

    /// A row that wraps at large Dynamic Type sizes and speaks the full value (MEAS-2).
    private func row(_ title: String, _ value: String, spoken: String) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack {
                Text(title)
                Spacer()
                Text(value).foregroundStyle(.secondary).monospacedDigit()
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                Text(value).foregroundStyle(.secondary).monospacedDigit()
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title), \(spoken)")
    }
}

#Preview {
    NavigationStack {
        MeasurementsTab(geometry: SampleGeometry.twoRoomApartment(), rooms: [], scanDate: .now) { _, _ in }
    }
}
