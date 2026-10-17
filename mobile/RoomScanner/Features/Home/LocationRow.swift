import SwiftUI

/// One row of the Home list (HOME-1, HOME-2), styled as a flat brand card.
struct LocationRow: View {
    @Environment(\.sessionStore) private var session
    @ObservedObject var location: Location
    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        let formatter = UnitFormatter(unitPreference)
        HStack(spacing: Spacing.m) {
            thumbnail
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack(alignment: .firstTextBaseline) {
                    Text(location.displayName)
                        .font(AppFont.headline)
                        .foregroundStyle(Color.brandTextPrimary)
                        .lineLimit(2)
                    Spacer(minLength: Spacing.s)
                    if location.status == .draft {
                        StatusBadge(String(localized: .locationRowIncompleteBadge), tone: .warning,
                                    systemImage: "exclamationmark.triangle.fill")
                    }
                }
                Text(subtitle)
                    .font(AppFont.subheadline)
                    .foregroundStyle(Color.brandTextSecondary)
                if location.status == .complete {
                    Text(formatter.area(location.totalFloorArea))
                        .font(AppFont.subheadline)
                        .foregroundStyle(Color.brandTextSecondary)
                        .monospacedDigit()
                    SyncStatusView(location: location, compact: true)
                        .padding(.top, Spacing.xxs)
                }
            }
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Color.brandTextTertiary)
                .accessibilityHidden(true)
        }
        .padding(Spacing.l)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).fill(Color.brandSurface))
        .overlay(RoundedRectangle(cornerRadius: Radius.card, style: .continuous).stroke(Color.brandDivider, lineWidth: 1))
        .cardShadow()
        .contentShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText(formatter))
        .accessibilityAddTraits(.isButton)
    }

    @ViewBuilder
    private var thumbnail: some View {
        Group {
            if let data = location.thumbnailPNG, let image = UIImage(data: data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "square.split.bottomrightquarter")
                    .font(.title2)
                    .foregroundStyle(Color.brandAccent)
            }
        }
        .frame(width: 60, height: 60)
        .background(Color.brandAccentSoft)
        .clipShape(RoundedRectangle(cornerRadius: Radius.chip, style: .continuous))
    }

    private var subtitle: String {
        let date = (location.createdAt ?? .now).formatted(date: .abbreviated, time: .omitted)
        let rooms = Counted.rooms(Int(location.roomCount))
        return "\(date) · \(rooms)"
    }

    private func accessibilityText(_ formatter: UnitFormatter) -> String {
        let date = (location.createdAt ?? .now).formatted(.dateTime.month(.wide).day())
        let rooms = Counted.rooms(Int(location.roomCount))
        var parts = [location.displayName, String(localized: .locationRowA11YScannedOn(date: date)), rooms]
        if location.status == .complete {
            parts.append(formatter.spokenArea(location.totalFloorArea))
            if location.ownerUserID != 0 && location.ownerUserID != session?.session?.user.id {
                parts.append(String(localized: .syncOtherAccount))
            } else {
                let label: String = switch location.syncStatus {
                case .pending: String(localized: .syncPending)
                case .uploading: String(localized: .syncUploading)
                case .uploaded: String(localized: .syncUploaded)
                case .failed: String(localized: .syncFailed)
                case .localOnly: String(localized: .syncLocalOnly)
                }
                parts.append(label)
            }
        } else {
            parts.append(String(localized: .locationRowA11YIncomplete))
        }
        return parts.joined(separator: ", ")
    }
}

#Preview {
    ScrollView {
        VStack(spacing: Spacing.m) {
            if let apartment = PreviewData.location(named: "Departamento") {
                LocationRow(location: apartment)
            }
            if let draft = PreviewData.location(named: "Oficina") {
                LocationRow(location: draft)
            }
        }
        .padding()
    }
    .background(Color.brandBackground)
    .previewPersistence()
}
