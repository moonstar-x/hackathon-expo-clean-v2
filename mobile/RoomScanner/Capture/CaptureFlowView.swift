import SwiftUI

/// The full-screen container for the whole capture flow: tips, live capture, review and save (§7.1).
struct CaptureFlowView: View {
    /// Called when the flow ends. The id is the saved location, or nil after a discard.
    var onClose: (UUID?) -> Void

    @AppStorage("hasSeenScanTips") private var hasSeenScanTips = false
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: CaptureViewModel
    @State private var isHelpPresented = false

    init(repository: any LocationRepository, onClose: @escaping (UUID?) -> Void) {
        self.onClose = onClose
        let showsTips = !UserDefaults.standard.bool(forKey: "hasSeenScanTips")
        _model = State(initialValue: CaptureViewModel(repository: repository, showsTips: showsTips))
    }

    var body: some View {
        Group {
            if model.phase == .tips {
                ScanTipsView(mode: .firstRun) {
                    hasSeenScanTips = true
                    model.beginIfNeeded()
                } onCancel: {
                    close(nil)
                }
            } else {
                captureScreen
            }
        }
        .onAppear {
            UIApplication.shared.isIdleTimerDisabled = true
            if model.phase == .scanning {
                model.beginIfNeeded()
            }
        }
        .onDisappear {
            UIApplication.shared.isIdleTimerDisabled = false
            model.tearDown()
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                model.sceneDidEnterBackground()
            }
        }
    }

    // MARK: Capture

    private var captureScreen: some View {
        ZStack {
            RoomCaptureContainer(captureView: model.controller.captureView)
                .ignoresSafeArea()

            LiveOverlayView(
                geometry: model.liveGeometry,
                highlightedRoomID: model.liveRoom?.id,
                readout: readout,
                canFinishRoom: model.phase == .scanning,
                showsLiveInfo: model.phase == .scanning || model.phase == .processing,
                onCancel: model.requestCancel,
                onDone: model.finishCurrentRoom,
                onHelp: { isHelpPresented = true }
            )

            if model.phase == .processing {
                ProgressView(.captureProcessingRoom)
                    .padding()
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            }

            if model.phase == .waitingForNextRoom {
                nextRoomInterstitial
            }
        }
        .sheet(item: Binding(get: { model.activeSheet }, set: { _ in })) { sheet in
            switch sheet {
            case .review: reviewSheet
            case .save: saveSheet
            }
        }
        .sheet(isPresented: $isHelpPresented) {
            ScanTipsView(mode: .help) { isHelpPresented = false }
        }
        .confirmationDialog(cancelTitle, isPresented: cancelPromptBinding, titleVisibility: .visible,
                            presenting: model.cancelPrompt) { prompt in
            switch prompt {
            case .discardOnly:
                Button(.captureDiscardScan, role: .destructive) { discard() }
                Button(.captureKeepScanning, role: .cancel) {}
            case .saveOrDiscard(let count):
                Button(.captureSaveRooms(rooms: Counted.rooms(count))) { model.finish() }
                Button(.captureDiscardScan, role: .destructive) { discard() }
                Button(.captureKeepScanning, role: .cancel) {}
            }
        }
        .alert(Text(.commonSaveFailedTitle), isPresented: persistenceFailureBinding, presenting: model.persistenceFailure) { failure in
            Button(.commonRetry) { Task { await failure.retry() } }
            Button(.commonCancel, role: .cancel) {}
        } message: { failure in
            Text(failure.message)
        }
    }

    private var readout: LiveOverlayView.Readout {
        let live = model.liveRoom
        return LiveOverlayView.Readout(
            roomNumber: model.roomNumber,
            walls: live?.walls.count ?? 0,
            doors: live?.doors.count ?? 0,
            windows: live?.windows.count ?? 0,
            liveArea: live.flatMap(RoomMetrics.floorArea(of:)),
            completedRooms: model.completedRooms.count,
            completedArea: model.completedArea
        )
    }

    private var nextRoomInterstitial: some View {
        VStack(spacing: 16) {
            Image(systemName: "figure.walk.motion")
                .font(.largeTitle)
                .accessibilityHidden(true)
            Text(.captureNextRoomInstructions)
                .font(.headline)
                .multilineTextAlignment(.center)
            Button(action: model.startNextRoom) {
                Text(.captureNextRoomStart)
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(24)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
        .padding(32)
    }

    // MARK: Sheets

    private var reviewSheet: some View {
        RoomReviewSheet(
            name: $model.reviewName,
            roomNumber: model.roomNumber,
            room: model.currentIssue == nil ? model.completedRooms.last?.geometry : nil,
            issue: model.currentIssue,
            completedRoomCount: model.completedRooms.count,
            trackingWasInterrupted: model.trackingWasInterrupted,
            onScanNext: model.scanNextRoom,
            onFinish: model.finish,
            onRescan: model.rescanRoom,
            onDiscard: discard
        )
    }

    private var saveSheet: some View {
        SaveLocationSheet(
            name: $model.locationName,
            type: $model.locationType,
            roomNames: model.completedRooms.map(\.name),
            totalArea: model.completedArea,
            isAreaApproximate: model.completedGeometries.contains(where: \.isFloorApproximate),
            state: model.finalizeState,
            onSave: save,
            onRetry: model.retryFinalizing
        )
    }

    // MARK: Actions

    private var cancelTitle: String {
        switch model.cancelPrompt {
        case .discardOnly, nil: String(localized: .captureCancelDiscardTitle)
        case .saveOrDiscard: String(localized: .captureCancelEndTitle)
        }
    }

    private var cancelPromptBinding: Binding<Bool> {
        Binding(get: { model.cancelPrompt != nil }, set: { if !$0 { model.cancelPrompt = nil } })
    }

    private var persistenceFailureBinding: Binding<Bool> {
        Binding(get: { model.persistenceFailure != nil }, set: { if !$0 { model.persistenceFailure = nil } })
    }

    private func discard() {
        Task {
            await model.discard()
            close(nil)
        }
    }

    private func save() {
        Task {
            if let id = await model.save() {
                close(id)
            }
        }
    }

    private func close(_ savedLocationID: UUID?) {
        model.tearDown()
        onClose(savedLocationID)
    }
}

#Preview {
    // Live capture needs a LiDAR device. In previews, this shows the tips screen on first run.
    CaptureFlowView(repository: PreviewData.controller.repository) { _ in }
}
