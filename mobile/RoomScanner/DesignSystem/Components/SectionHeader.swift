import SwiftUI

/// An eyebrow/overline section label with an optional trailing accessory — the web's overline
/// variant (wide tracking, secondary color, uppercase).
struct SectionHeader<Accessory: View>: View {
    var title: LocalizedStringResource
    @ViewBuilder var accessory: Accessory

    init(_ title: LocalizedStringResource, @ViewBuilder accessory: () -> Accessory) {
        self.title = title
        self.accessory = accessory()
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).brandOverline()
            Spacer(minLength: Spacing.s)
            accessory
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

extension SectionHeader where Accessory == EmptyView {
    init(_ title: LocalizedStringResource) {
        self.init(title) { EmptyView() }
    }
}

#Preview {
    VStack(alignment: .leading, spacing: Spacing.l) {
        SectionHeader(.commonSummary)
        SectionHeader(.quoteTitle) { Image(systemName: "chevron.right").foregroundStyle(Color.brandTextTertiary) }
    }
    .padding()
}
