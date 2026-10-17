import SwiftUI

/// Shown after RoomPlan processes a room, or when a room fails (§7.5, §11).
struct RoomReviewSheet: View {
    @Binding var name: String
    @Binding var type: LocationType?
    @Binding var quoting: RoomQuotingInputs
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
        .background(Color.brandBackground.ignoresSafeArea())
        .tint(Color.brandAccent)
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        .interactiveDismissDisabled()
    }

    // MARK: Review

    private func review(_ room: RoomGeometry) -> some View {
        let formatter = UnitFormatter(unitPreference)
        return VStack(alignment: .leading, spacing: Spacing.l) {
            Text(.reviewTitle(number: roomNumber))
                .font(AppFont.title2)
                .brandHeadingTracking()
                .foregroundStyle(Color.brandTextPrimary)

            TextField(String(localized: .reviewRoomNamePlaceholder), text: $name)
                .textFieldStyle(.brand)
                .submitLabel(.done)

            typePicker
            quotingFields

            if trackingWasInterrupted {
                interruptionWarning
            }

            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                metric(.commonFloorArea, formatter.area(RoomMetrics.floorArea(of: room), approximate: room.isFloorApproximate))
                metric(.commonPerimeter, formatter.length(RoomMetrics.perimeter(of: room)))
                metric(.commonCeilingHeight, RoomMetrics.ceilingHeight(of: room).map { formatter.length($0) } ?? "—")
                metric(.commonWalls, "\(room.walls.count)")
                metric(.commonDoors, "\(room.doors.count)")
                metric(.commonWindows, "\(room.windows.count)")
                metric(.commonObjects, "\(room.objects.count)")
            }

            VStack(spacing: Spacing.s) {
                Button(action: onScanNext) {
                    Label(.reviewScanNextRoom, systemImage: "arrow.right.circle.fill")
                }
                .buttonStyle(.brandPrimary)

                Button(action: onFinish) {
                    Text(.reviewFinish)
                }
                .buttonStyle(.brandSecondary)

                Button(.commonRescanRoom, systemImage: "arrow.counterclockwise", action: onRescan)
                    .font(AppFont.button)
                    .frame(minHeight: 44)
            }
            .padding(.top, Spacing.xs)
        }
    }

    private var quotingFields: some View {
        DisclosureGroup(.quoteInputs) {
            VStack(alignment: .leading, spacing: 12) {
                Picker(String(localized: .quoteTraffic), selection: $quoting.traffic) {
                    Text(.quoteSameAsLocation).tag(String?.none)
                    ForEach(QuoteTraffic.allCases, id: \.self) { traffic in
                        Text(traffic.displayName).tag(Optional(traffic.rawValue))
                    }
                }
                Stepper(value: $quoting.fixedPosts, in: 0...20) {
                    LabeledContent(String(localized: .quoteFixedPosts), value: "\(quoting.fixedPosts)")
                }
                Text(.quoteFixedPostsHelp).font(AppFont.caption).foregroundStyle(Color.brandTextSecondary)
                Toggle(String(localized: .quoteCountFixtures), isOn: Binding(
                    get: { quoting.fixtures != nil },
                    set: { quoting.fixtures = $0 ? RoomQuotingInputs.defaults(type: type, room: room).fixtures ?? QuoteFixtures() : nil }))
                if quoting.fixtures != nil {
                    fixtureStepper(.quoteToilets, key: \.toilets)
                    fixtureStepper(.quoteUrinals, key: \.urinals)
                    fixtureStepper(.quoteSinks, key: \.sinks)
                }
            }
            .padding(.top, 8)
        }
        .onChange(of: type) { _, newType in
            if quoting.fixtures == nil, newType == .bathroom || newType == .lockerRoom {
                quoting.fixtures = RoomQuotingInputs.defaults(type: newType, room: room).fixtures
            }
        }
    }
    private func fixtureStepper(_ label: LocalizedStringResource, key: WritableKeyPath<QuoteFixtures, Int>) -> some View {
        Stepper(value: Binding(get: { quoting.fixtures?[keyPath: key] ?? 0 },
                               set: { quoting.fixtures?[keyPath: key] = $0 }), in: 0...50) {
            LabeledContent(String(localized: label), value: "\(quoting.fixtures?[keyPath: key] ?? 0)")
        }
    }

    private var typePicker: some View {
        LabeledContent(String(localized: .reviewLocationType)) {
            Picker(String(localized: .reviewLocationType), selection: $type) {
                Text(.reviewLocationTypeUnspecified).tag(LocationType?.none)
                ForEach(LocationTypeCategory.allCases) { category in
                    Section(category.displayName) {
                        ForEach(category.types) { type in
                            Text(type.displayName).tag(Optional(type))
                        }
                    }
                }
            }
            .pickerStyle(.menu)
            .labelsHidden()
        }
    }

    private func metric(_ title: LocalizedStringResource, _ value: String) -> some View {
        GridRow {
            Text(title).font(AppFont.subheadline).foregroundStyle(Color.brandTextSecondary)
            Text(value).font(AppFont.subheadline).foregroundStyle(Color.brandTextPrimary).monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }

    private var interruptionWarning: some View {
        toneBanner(.reviewTrackingInterrupted, tone: .warning)
    }

    /// A full-width tone banner: tinted background, tone icon + text.
    private func toneBanner(_ text: LocalizedStringResource, tone: BrandTone) -> some View {
        Label(text, systemImage: "exclamationmark.triangle.fill")
            .font(AppFont.footnote.weight(.medium))
            .foregroundStyle(tone.color)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Spacing.m)
            .background(tone.color.opacity(0.12), in: RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
    }

    // MARK: Failure

    private func failure(_ issue: CaptureIssue) -> some View {
        VStack(alignment: .leading, spacing: Spacing.l) {
            Label(.reviewFailureTitle(number: roomNumber), systemImage: "exclamationmark.triangle.fill")
                .font(AppFont.title3)
                .foregroundStyle(Color.brandError)
            Text(issue.message)
                .font(AppFont.body)
                .foregroundStyle(Color.brandTextPrimary)
            if issue.isSceneTooLarge {
                Text(.reviewFailureSceneTooLarge)
                    .font(AppFont.subheadline)
                    .foregroundStyle(Color.brandTextSecondary)
            }
            VStack(spacing: Spacing.s) {
                Button(action: onRescan) {
                    Label(.commonRescanRoom, systemImage: "arrow.counterclockwise")
                }
                .buttonStyle(.brandPrimary)

                if completedRoomCount > 0 {
                    Button(action: onFinish) {
                        Text(.commonFinishWithRooms(rooms: Counted.rooms(completedRoomCount)))
                    }
                    .buttonStyle(.brandSecondary)
                }

                Button(.reviewDiscard, role: .destructive, action: onDiscard)
                    .font(AppFont.button)
                    .frame(minHeight: 44)
            }
            .padding(.top, Spacing.xs)
        }
    }
}

#Preview("Review") {
    Color.gray.sheet(isPresented: .constant(true)) {
        RoomReviewSheet(name: .constant("Sala"), type: .constant(.livingRoom), quoting: .constant(.init()), roomNumber: 1,
                        room: SampleGeometry.twoRoomApartment().rooms[0], issue: nil,
                        completedRoomCount: 1, trackingWasInterrupted: true,
                        onScanNext: {}, onFinish: {}, onRescan: {}, onDiscard: {})
    }
}

#Preview("Failure") {
    Color.gray.sheet(isPresented: .constant(true)) {
        RoomReviewSheet(name: .constant(""), type: .constant(nil), quoting: .constant(.init()), roomNumber: 2, room: nil,
                        issue: CaptureIssue(message: "Falló el seguimiento del entorno.", isSceneTooLarge: false),
                        completedRoomCount: 1, trackingWasInterrupted: false,
                        onScanNext: {}, onFinish: {}, onRescan: {}, onDiscard: {})
    }
}
