import SwiftUI

/// One row of the Home list (HOME-1, HOME-2).
struct LocationRow: View {
    @Environment(\.sessionStore) private var session
    @ObservedObject var location: Location
    @AppStorage(UnitSystem.storageKey) private var unitPreference: UnitSystem = .automatic

    var body: some View {
        let formatter = UnitFormatter(unitPreference)
        HStack(spacing: 12) {
            thumbnail
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline) {
                    Text(location.displayName)
                        .font(.headline)
                        .lineLimit(2)
                    Spacer(minLength: 8)
                    if location.status == .draft {
                        Text(.locationRowIncompleteBadge)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(.orange.opacity(0.2), in: Capsule())
                            .foregroundStyle(.orange)
                    }
                }
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if location.status == .complete {
                    Text(formatter.area(location.totalFloorArea))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    SyncStatusView(location: location, compact: true)
                }
            }
        }
        .padding(.vertical, 4)
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
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 56, height: 56)
        .background(Color(uiColor: .secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
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
    List {
        if let apartment = PreviewData.location(named: "Departamento") {
            LocationRow(location: apartment)
        }
        if let draft = PreviewData.location(named: "Oficina") {
            LocationRow(location: draft)
        }
    }
    .previewPersistence()
}
