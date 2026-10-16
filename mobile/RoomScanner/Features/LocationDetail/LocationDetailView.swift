import CoreData
import SwiftUI

/// A saved location: header, Plan | 3D | Measurements, rename, delete and share (§7.7).
struct LocationDetailView: View {
    let locationID: UUID

    @Environment(\.persistence) private var persistence

    @FetchRequest private var locations: FetchedResults<Location>
    @FetchRequest private var rooms: FetchedResults<Room>

    init(locationID: UUID) {
        self.locationID = locationID
        let predicate = NSPredicate(format: "id == %@", locationID as CVarArg)
        _locations = FetchRequest(sortDescriptors: [], predicate: predicate)
        _rooms = FetchRequest(sortDescriptors: [NSSortDescriptor(keyPath: \Room.index, ascending: true)],
                              predicate: NSPredicate(format: "location.id == %@", locationID as CVarArg))
    }

    var body: some View {
        if let location = locations.first {
            LocationDetailContent(location: location, rooms: Array(rooms),
                                  repository: persistence.repository)
        } else {
            ContentUnavailableView("Scan Not Found", systemImage: "questionmark.folder",
                                   description: Text("This scan may have been deleted."))
        }
    }
}

private struct LocationDetailContent: View {
    @ObservedObject var location: Location
    var rooms: [Room]

    @Environment(\.dismiss) private var dismiss
    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic
    @State private var model: LocationDetailViewModel
    @State private var isRenamePresented = false
    @State private var renameText = ""
    @State private var isDeleteConfirmationPresented = false

    init(location: Location, rooms: [Room], repository: any LocationRepository) {
        self.location = location
        self.rooms = rooms
        _model = State(initialValue: LocationDetailViewModel(locationID: location.id ?? UUID(),
                                                             repository: repository))
    }

    var body: some View {
        content
            .navigationTitle(location.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbar }
            .task(id: location.status) {
                await model.load(status: location.status)
            }
            .alert("Rename Scan", isPresented: $isRenamePresented) {
                TextField("Name", text: $renameText)
                Button("Save") { Task { await model.rename(to: renameText) } }
                Button("Cancel", role: .cancel) {}
            }
            .confirmationDialog(String(localized: "Delete '\(location.displayName)'?"),
                                isPresented: $isDeleteConfirmationPresented, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { delete() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This can't be undone.")
            }
            .alert("Something Went Wrong",
                   isPresented: Binding(get: { model.errorMessage != nil }, set: { if !$0 { model.errorMessage = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(model.errorMessage ?? "")
            }
    }

    private var roomNames: [UUID: String] {
        Dictionary(rooms.compactMap { room in room.id.map { ($0, room.displayName) } },
                   uniquingKeysWith: { first, _ in first })
    }

    @ViewBuilder
    private var content: some View {
        switch model.state {
        case .loading:
            ProgressView()
        case .working:
            ProgressView("Building floor plan…")
        case .draft:
            draftView
        case .unreadable:
            unreadableView
        case .loaded(let geometry):
            loadedView(geometry)
        }
    }

    // MARK: Loaded

    private func loadedView(_ geometry: ScanGeometry) -> some View {
        VStack(spacing: 0) {
            VStack(spacing: 10) {
                header(geometry)
                Picker("View", selection: $model.selectedTab) {
                    ForEach(DetailTab.allCases) { tab in
                        Text(tab.title).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                if geometry.merged == nil, geometry.rooms.count > 1 {
                    Label("Rooms couldn't be merged, so they're shown as captured.", systemImage: "info.circle")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 8)

            switch model.selectedTab {
            case .plan:
                FloorPlanTab(geometry: geometry, roomNames: roomNames, options: $model.planOptions)
            case .model:
                ModelTab(model: model.sceneModel(for: geometry), geometry: geometry,
                         showsFurniture: $model.showsFurnitureIn3D)
            case .measurements:
                MeasurementsTab(geometry: geometry, rooms: rooms, scanDate: location.createdAt ?? .now) { id, name in
                    Task { await model.renameRoom(id, to: name) }
                }
            }
        }
    }

    private func header(_ geometry: ScanGeometry) -> some View {
        let formatter = UnitFormatter(unitPreference)
        let area = formatter.area(LocationMetrics.totalFloorArea(of: geometry),
                                  approximate: LocationMetrics.isAreaApproximate(geometry))
        let date = (location.createdAt ?? .now).formatted(date: .abbreviated, time: .omitted)
        return Text("\(area) · \(Counted.rooms(geometry.rooms.count)) · \(date)")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityLabel(Text("\(formatter.spokenArea(LocationMetrics.totalFloorArea(of: geometry))), \(Counted.rooms(geometry.rooms.count)), scanned \(date)"))
    }

    // MARK: Draft (§7.7.5)

    private var draftView: some View {
        let count = rooms.count
        return ContentUnavailableView {
            Label("This scan wasn't finished", systemImage: "exclamationmark.triangle")
        } description: {
            if model.canRebuild {
                Text("\(Counted.rooms(count)) scanned.")
            } else {
                Text("\(Counted.rooms(count)) scanned, but the room data is missing, so the scan can't be finished.")
            }
        } actions: {
            if model.canRebuild {
                Button("Finish with \(Counted.rooms(count))") {
                    Task { await model.rebuild(reuseStructure: false) }
                }
                .buttonStyle(.borderedProminent)
            }
            Button("Delete", role: .destructive) { isDeleteConfirmationPresented = true }
        }
    }

    // MARK: Unreadable (§11)

    private var unreadableView: some View {
        ContentUnavailableView {
            Label("Couldn't open this scan", systemImage: "exclamationmark.triangle")
        } description: {
            if model.canRebuild {
                Text("The floor plan data is missing or was saved by a newer version of the app. You can rebuild it from the raw scan data.")
            } else {
                Text("The floor plan data is missing or was saved by a newer version of the app.")
            }
        } actions: {
            if model.canRebuild {
                Button("Rebuild") {
                    Task { await model.rebuild(reuseStructure: true) }
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    // MARK: Toolbar (DET-3, §7.7.4)

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            if let geometry = model.geometry {
                ShareMenu(geometry: geometry,
                          locationName: location.displayName,
                          roomNames: roomNames,
                          unitSystem: unitPreference.resolved(),
                          usdzSource: model.canExportUSDZ ? model.rawData : nil)
            }
            Menu {
                Button {
                    renameText = location.displayName
                    isRenamePresented = true
                } label: {
                    Label("Rename", systemImage: "pencil")
                }
                Button(role: .destructive) {
                    isDeleteConfirmationPresented = true
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Label("More", systemImage: "ellipsis.circle")
            }
        }
    }

    private func delete() {
        Task {
            if await model.delete() {
                dismiss()
            }
        }
    }
}

#Preview("Complete") {
    NavigationStack {
        LocationDetailView(locationID: PreviewData.apartmentID)
    }
    .previewPersistence()
}

#Preview("Draft") {
    NavigationStack {
        LocationDetailView(locationID: PreviewData.draftID)
    }
    .previewPersistence()
}
