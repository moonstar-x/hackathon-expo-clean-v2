import SwiftUI

/// The CleanCode horizontal logo, drawn from the brand's own vector artwork
/// (`web/src/assets/brand/logo-horizontal.svg`, exported to PDF in `BrandLogoHorizontal.imageset`).
/// The asset catalog holds the light and dark (inverse) variants, so it adapts automatically.
struct BrandLogo: View {
    var body: some View {
        Image("BrandLogoHorizontal")
            .resizable()
            .scaledToFit()
            .accessibilityLabel(Text(verbatim: "CleanCode"))
    }
}

#Preview {
    VStack(spacing: 32) {
        BrandLogo().frame(height: 48)
        BrandLogo().frame(height: 48)
            .padding(24).frame(maxWidth: .infinity).background(Brand.navyDeep)
            .environment(\.colorScheme, .dark)
    }
    .padding()
}
