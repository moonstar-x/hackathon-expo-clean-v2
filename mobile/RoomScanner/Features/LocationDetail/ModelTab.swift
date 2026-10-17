import SwiftUI

/// The orbitable 3D model (§7.7.2).
struct ModelTab: View {
    var model: SceneBuilder.Result
    var geometry: ScanGeometry
    @Binding var showsFurniture: Bool

    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic
    @State private var resetToken = 0

    var body: some View {
        SceneKitView(model: model, showObjects: showsFurniture, resetToken: resetToken,
                     accessibilityLabel: accessibilityLabel)
            .ignoresSafeArea(edges: .bottom)
            .overlay(alignment: .bottom) {
                HStack(spacing: Spacing.m) {
                    Button {
                        resetToken += 1
                    } label: {
                        Label(.modelResetView, systemImage: "arrow.counterclockwise")
                    }
                    Divider().frame(height: 24)
                    Toggle(isOn: $showsFurniture) {
                        Label(.commonFurniture, systemImage: "sofa")
                    }
                    .toggleStyle(.button)
                }
                .font(AppFont.subheadline.weight(.medium))
                .tint(Color.brandAccent)
                .fixedSize()
                .padding(.horizontal, Spacing.l)
                .padding(.vertical, Spacing.s)
                .frame(minHeight: 44)
                .background(Color.brandSurface, in: Capsule())
                .overlay(Capsule().stroke(Color.brandDivider, lineWidth: 1))
                .popoverShadow()
                .padding(.bottom, Spacing.l)
            }
    }

    private var accessibilityLabel: String {
        let formatter = UnitFormatter(unitPreference)
        let area = formatter.spokenArea(LocationMetrics.totalFloorArea(of: geometry))
        return String(localized: .modelA11Y(rooms: Counted.rooms(geometry.rooms.count), area: area))
    }
}

#Preview {
    let geometry = SampleGeometry.twoRoomApartment()
    return ModelTab(model: SceneBuilder.build(geometry, showObjects: true), geometry: geometry,
                    showsFurniture: .constant(true))
}
