import CoreData
import SwiftUI

/// A saved location: header, Plano | 3D | Medidas, rename, delete and share (§7.7).
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
            ContentUnavailableView("detail.notFound.title", systemImage: "questionmark.folder",
                                   description: Text("detail.notFound.message"))
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
            .alert("common.renameScan", isPresented: $isRenamePresented) {
                TextField("common.name", text: $renameText)
                Button("common.save") { Task { await model.rename(to: renameText) } }
                Button("common.cancel", role: .cancel) {}
            }
            .confirmationDialog(String(localized: "common.deleteNamedConfirm \(location.displayName)"),
                                isPresented: $isDeleteConfirmationPresented, titleVisibility: .visible) {
                Button("common.delete", role: .destructive) { delete() }
                Button("common.cancel", role: .cancel) {}
            } message: {
                Text("common.cannotUndo")
            }
            .alert("common.somethingWentWrong",
                   isPresented: Binding(get: { model.errorMessage != nil }, set: { if !$0 { model.errorMessage = nil } })) {
                Button("common.ok", role: .cancel) {}
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
            ProgressView("common.buildingFloorPlan")
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
                Picker("detail.tabPicker", selection: $model.selectedTab) {
                    ForEach(DetailTab.allCases) { tab in
                        Text(tab.title).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                if geometry.merged == nil, geometry.rooms.count > 1 {
                    Label("detail.notMerged", systemImage: "info.circle")
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
        return Text("detail.header \(area) \(Counted.rooms(geometry.rooms.count)) \(date)")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityLabel(Text("detail.header.a11y \(formatter.spokenArea(LocationMetrics.totalFloorArea(of: geometry))) \(Counted.rooms(geometry.rooms.count)) \(date)"))
    }

    // MARK: Draft (§7.7.5)

    private var draftView: some View {
        let count = rooms.count
        return ContentUnavailableView {
            Label("detail.draft.title", systemImage: "exclamationmark.triangle")
        } description: {
            if model.canRebuild {
                Text("detail.draft.scanned \(Counted.rooms(count))")
            } else {
                Text("detail.draft.missingData \(Counted.rooms(count))")
            }
        } actions: {
            if model.canRebuild {
                Button("common.finishWithRooms \(Counted.rooms(count))") {
                    Task { await model.rebuild(reuseStructure: false) }
                }
                .buttonStyle(.borderedProminent)
            }
            Button("common.delete", role: .destructive) { isDeleteConfirmationPresented = true }
        }
    }

    // MARK: Unreadable (§11)

    private var unreadableView: some View {
        ContentUnavailableView {
            Label("detail.corrupt.title", systemImage: "exclamationmark.triangle")
        } description: {
            if model.canRebuild {
                Text("detail.corrupt.rebuildable")
            } else {
                Text("detail.corrupt.message")
            }
        } actions: {
            if model.canRebuild {
                Button("detail.corrupt.rebuild") {
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
                    Label("common.rename", systemImage: "pencil")
                }
                Button(role: .destructive) {
                    isDeleteConfirmationPresented = true
                } label: {
                    Label("common.delete", systemImage: "trash")
                }
            } label: {
                Label("detail.moreMenu", systemImage: "ellipsis.circle")
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
