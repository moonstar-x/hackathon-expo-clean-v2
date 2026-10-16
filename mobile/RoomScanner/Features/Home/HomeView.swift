import CoreData
import SwiftUI

/// The list of scanned locations and the New Scan button (§7.2).
struct HomeView: View {
    @Environment(\.persistence) private var persistence

    @FetchRequest(sortDescriptors: [NSSortDescriptor(keyPath: \Location.createdAt, ascending: false)],
                  animation: .default)
    private var locations: FetchedResults<Location>

    @State private var path: [UUID] = []
    @State private var isCapturePresented = false
    @State private var detailToOpenAfterCapture: UUID?
    @State private var isSettingsPresented = false
    @State private var pendingDeletion: LocationReference?
    @State private var pendingRename: LocationReference?
    @State private var renameText = ""
    @State private var isCameraDeniedAlertPresented = false
    @State private var errorMessage: String?

    private let canScan = DeviceCapabilities.supportsRoomCapture

    /// A lightweight copy of a location's identity, so dialogs never hold a managed object.
    struct LocationReference: Identifiable, Equatable {
        var id: UUID
        var name: String
    }

    var body: some View {
        NavigationStack(path: $path) {
            list
                .navigationTitle("Scans")
                .navigationDestination(for: UUID.self) { id in
                    LocationDetailView(locationID: id)
                }
                .toolbar { toolbar }
                .safeAreaInset(edge: .bottom) { newScanBar }
        }
        #if DEBUG
        .task { await applyDebugLaunchArguments() }
        #endif
        .sheet(isPresented: $isSettingsPresented) {
            SettingsView()
        }
        .fullScreenCover(isPresented: $isCapturePresented, onDismiss: openSavedLocation) {
            CaptureFlowView(repository: persistence.repository) { savedLocationID in
                detailToOpenAfterCapture = savedLocationID
                isCapturePresented = false
            }
        }
        .confirmationDialog(
            deletionTitle,
            isPresented: Binding(get: { pendingDeletion != nil }, set: { if !$0 { pendingDeletion = nil } }),
            titleVisibility: .visible,
            presenting: pendingDeletion
        ) { reference in
            Button("Delete", role: .destructive) { delete(reference) }
            Button("Cancel", role: .cancel) {}
        } message: { _ in
            Text("This can't be undone.")
        }
        .alert("Rename Scan",
               isPresented: Binding(get: { pendingRename != nil }, set: { if !$0 { pendingRename = nil } }),
               presenting: pendingRename) { reference in
            TextField("Name", text: $renameText)
            Button("Save") { rename(reference, to: renameText) }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Camera Access Needed", isPresented: $isCameraDeniedAlertPresented) {
            Button("Open Settings") { CameraPermission.openSettings() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("RoomScanner needs the camera to scan rooms. Turn on camera access in Settings.")
        }
        .alert("Something Went Wrong",
               isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    // MARK: List

    private var list: some View {
        List {
            ForEach(locations, id: \.objectID) { location in
                if let id = location.id {
                    NavigationLink(value: id) {
                        LocationRow(location: location)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button {
                            pendingDeletion = reference(for: location)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        .tint(.red)
                    }
                    .contextMenu {
                        Button {
                            beginRename(location)
                        } label: {
                            Label("Rename", systemImage: "pencil")
                        }
                        Button(role: .destructive) {
                            pendingDeletion = reference(for: location)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
        .overlay {
            if locations.isEmpty {
                ContentUnavailableView {
                    Label("No scans yet", systemImage: "square.dashed")
                } description: {
                    Text("Scan your first room to create a floor plan.")
                }
            }
        }
    }

    private var newScanBar: some View {
        VStack(spacing: 8) {
            Button(action: startScan) {
                Label("New Scan", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(!canScan)

            if !canScan {
                Text("Scanning requires an iPhone with a LiDAR scanner. You can still view saved scans.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(.bar)
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                isSettingsPresented = true
            } label: {
                Label("Settings", systemImage: "gearshape")
            }
        }
        #if DEBUG
        ToolbarItem(placement: .topBarLeading) {
            Menu {
                Button("Add sample location", systemImage: "plus.square.on.square") {
                    addSample(SampleGeometry.twoRoomApartment(), name: "Apartment")
                }
                Button("Add rotated L-shaped room", systemImage: "rotate.right") {
                    addSample(SampleGeometry.rotated(SampleGeometry.lShapedRoom(), by: .pi / 7), name: "Studio")
                }
                Button("Delete all", systemImage: "trash", role: .destructive, action: deleteAll)
            } label: {
                Label("Debug", systemImage: "ladybug")
            }
        }
        #endif
    }

    // MARK: Actions

    private func startScan() {
        Task {
            switch await CameraPermission.request() {
            case .authorized: isCapturePresented = true
            case .denied: isCameraDeniedAlertPresented = true
            }
        }
    }

    private func openSavedLocation() {
        guard let id = detailToOpenAfterCapture else { return }
        detailToOpenAfterCapture = nil
        path.append(id)
    }

    private var deletionTitle: String {
        guard let pendingDeletion else { return "" }
        return String(localized: "Delete '\(pendingDeletion.name)'?")
    }

    private func reference(for location: Location) -> LocationReference? {
        location.id.map { LocationReference(id: $0, name: location.displayName) }
    }

    private func beginRename(_ location: Location) {
        renameText = location.displayName
        pendingRename = reference(for: location)
    }

    private func rename(_ reference: LocationReference, to name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        perform { try await $0.rename(locationID: reference.id, to: trimmed) }
    }

    private func delete(_ reference: LocationReference) {
        path.removeAll { $0 == reference.id }
        perform { try await $0.delete(locationID: reference.id) }
    }

    private func perform(_ operation: @escaping (any LocationRepository) async throws -> Void) {
        let repository = persistence.repository
        Task {
            do {
                try await operation(repository)
            } catch {
                Log.ui.error("Home action failed: \(error)")
                errorMessage = error.localizedDescription
            }
        }
    }

    #if DEBUG
    private func addSample(_ geometry: ScanGeometry, name: String) {
        let thumbnail = FloorPlanImageRenderer.thumbnailPNG(for: geometry)
        perform { _ = try await $0.insertSample(geometry, name: name, thumbnail: thumbnail) }
    }

    /// Launch arguments for checking the UI in the Simulator:
    /// `-seedSamples` adds the sample locations to an empty store, `-openFirst` opens the newest
    /// location, and `-detailTab plan|model|measurements` picks the detail tab.
    private func applyDebugLaunchArguments() async {
        let arguments = ProcessInfo.processInfo.arguments
        if let index = arguments.firstIndex(of: "-detailTab"), index + 1 < arguments.count,
           let tab = DetailTab(rawValue: arguments[index + 1]) {
            LocationDetailViewModel.lastSelectedTab = tab
        }
        var newest = locations.first?.id
        if arguments.contains("-seedSamples"), locations.isEmpty {
            do {
                let studio = SampleGeometry.rotated(SampleGeometry.lShapedRoom(), by: .pi / 7)
                _ = try await persistence.repository.insertSample(
                    studio, name: "Studio", thumbnail: FloorPlanImageRenderer.thumbnailPNG(for: studio))
                let apartment = SampleGeometry.twoRoomApartment()
                newest = try await persistence.repository.insertSample(
                    apartment, name: "Apartment", thumbnail: FloorPlanImageRenderer.thumbnailPNG(for: apartment))
            } catch {
                Log.ui.error("Seeding samples failed: \(error)")
            }
        }
        if arguments.contains("-openFirst"), let newest {
            path = [newest]
        }
    }

    private func deleteAll() {
        path.removeAll()
        perform { try await $0.deleteAll() }
    }
    #endif
}

#Preview("With scans") {
    HomeView()
        .previewPersistence()
}

#Preview("Empty") {
    HomeView()
        .persistence(PersistenceController(inMemory: true))
}
