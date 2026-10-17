import CoreGraphics

/// 8pt spacing grid. Replaces the ad-hoc padding literals scattered across the screens.
enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let s: CGFloat = 8
    static let m: CGFloat = 12
    static let l: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}

/// Corner-radius scale, mirroring the web (`web/src/theme.ts`): chips/items 8, buttons/inputs 10,
/// surfaces 12, cards 14, dialogs 16.
enum Radius {
    static let chip: CGFloat = 8
    static let control: CGFloat = 10
    static let surface: CGFloat = 12
    static let card: CGFloat = 14
    static let dialog: CGFloat = 16
}
