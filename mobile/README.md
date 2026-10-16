# RoomScanner (iOS)

RoomScanner scans several connected rooms with an iPhone's LiDAR scanner in one session, merges them into one
floor plan, and saves the result on the device. For each saved location you get a 2D floor plan with
dimensions, an orbitable 3D model, and a list of measurements. It implements
[SPEC-001](../spec/SPEC-001.md).

- No accounts, no network, no analytics, no third-party dependencies.
- Built with Swift, SwiftUI, RoomPlan, ARKit, SceneKit, and Core Data.

## Requirements

| | |
|---|---|
| Xcode | 26.x (tested with 26.5) |
| iOS | 17.0 or later |
| XcodeGen | `brew install xcodegen` |
| Scanning | An iPhone with a LiDAR scanner (iPhone 12 Pro or a later Pro model) |

Everything except live capture runs in the Simulator. Devices without LiDAR can install the app and browse
saved scans.

## Setup

The Xcode project is generated from `project.yml` and isn't checked in.

```bash
cd mobile
brew install xcodegen      # once
xcodegen generate
open RoomScanner.xcodeproj
```

Run `xcodegen generate` again after adding or removing files.

## Build and test

```bash
cd mobile
xcodegen generate
xcrun simctl list devices available          # pick an available iPhone simulator
xcodebuild -project RoomScanner.xcodeproj -scheme RoomScanner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=latest' \
  build test
```

The tests use Swift Testing and run in the Simulator. They cover geometry math, plan rotation, metrics, unit
formatting, `ScanGeometry` coding, the floor plan layout, rendering, the CSV export, and the Core Data
repository (with an in-memory store).

## Running on a device

1. Open `RoomScanner.xcodeproj`. Under **Signing & Capabilities**, choose your team, or set
   `DEVELOPMENT_TEAM` in `project.yml` and run `xcodegen generate` again.
2. If the bundle ID `com.example.RoomScanner` is taken, change `PRODUCT_BUNDLE_IDENTIFIER`.
3. Select your LiDAR iPhone and run.

## DEBUG sample data

DEBUG builds have a ladybug menu at the top left of the Home screen:

- **Add sample location** inserts a two-room apartment (a 5 × 4 m living room and a 3.5 × 4 m bedroom).
- **Add rotated L-shaped room** inserts a 14 m² L-shaped room rotated in world space, which exercises plan
  rotation.
- **Delete all** removes every location.

With these, Home, the detail screen, and the Plan, 3D, Measurements, and Share features all work in the Simulator.

DEBUG builds also accept launch arguments, which help with screenshots and quick checks:

| Argument | Effect |
|---|---|
| `-seedSamples` | Adds both samples when the store is empty |
| `-openFirst` | Opens the newest location on launch |
| `-detailTab plan\|model\|measurements` | Selects the detail tab |

```bash
xcrun simctl launch booted com.example.RoomScanner -seedSamples -openFirst -detailTab model
```

## Localization

The UI is Spanish only (`es` is the development language). The code never contains UI text. It uses semantic keys,
and the wording lives in `RoomScanner/Resources/Localizable.xcstrings`:

```swift
Text("home.newScan")                                  // "Nuevo escaneo"
String(localized: "liveOverlay.roomTitle \(number)")  // key "liveOverlay.roomTitle %lld", value "Habitación %lld"
```

- Keys are `area.element[.detail]` in lowerCamel. Shared strings use `common.*` (`common.cancel`, `common.save`, …).
- Arguments go after the key, separated by spaces. The value holds the wording and can reorder them (`%1$@`, `%2$@`).
- Counted nouns (`Shared/Inflection.swift`) keep the inflection markup in the value: `^[%lld habitación](inflect: true)`.

To add a string, use a new key in code, build, and run `scripts/sync-strings.sh` (Xcode syncs automatically in the IDE).
Then give the key its `es` value in the catalog. `scripts/check-strings.sh` fails if any key has no Spanish value, is
stale, or isn't a semantic key.

## Project layout

```
mobile/
├── project.yml              XcodeGen spec
├── NOTES.md                 Deviations, skipped items, and open risks
├── RoomScanner/
│   ├── App/                 App entry, preview data
│   ├── Capture/             RoomPlan session, capture state machine, capture screens, finalize, USDZ
│   ├── Geometry/            ScanGeometry (render model), math, metrics, RoomPlan mapping, samples
│   ├── Persistence/         Core Data model, stack, and LocationRepository
│   ├── Rendering/           Floor plan layout and canvas, PNG rendering, SceneKit scene and view
│   ├── Features/            Home, Location detail (Plan, 3D, Measurements, Share), Settings
│   ├── Shared/              Units, device capabilities, logging, counted nouns
│   └── Resources/           Assets, string catalog, privacy manifest, Info.plist (generated)
├── RoomScannerTests/
└── scripts/sync-strings.sh
```

RoomPlan types are used only in `Capture/` and `Geometry/RoomPlanMapping.swift`. Everything downstream works
with `ScanGeometry`, a plain `Codable` value type in world-space meters, so it can be tested without a device.

## Manual device checklist

Run these on a LiDAR iPhone before a release. Capture can't be tested in the Simulator or in CI.

1. On a device without LiDAR, New Scan is disabled with an explanation, and saved scans can still be browsed.
2. Denying camera permission shows the Open Settings alert.
3. Scan one room and tap Done. The review sheet shows a plausible area. Measure one wall with a tape measure:
   the app's value is within a few cm.
4. Scan three rooms with Scan Next Room. The mini plan updates live, and the final plan shows all three rooms
   aligned and connected through their doors.
5. The floor polygon fills sit exactly inside the walls (this validates §6.3).
6. Force-quit the app after room 2. On relaunch, the location shows Incomplete, and Finish with 2 rooms
   produces a valid plan.
7. Rescan This Room replaces the room. Cancel offers Save, Discard, or Keep scanning.
8. Backgrounding the app during a scan shows the REV-5 warning on the next review.
9. 3D view: orbit, zoom, Reset View, and the Furniture toggle all work.
10. Share each format: the PNG opens in Photos, the CSV opens in Numbers, and the USDZ opens in Quick Look.
11. Switching units in Settings updates the Measurements tab and the plan labels immediately.
12. VoiceOver can read the Home rows and the Measurements tab.

Also check the items marked "verify on a device" in [NOTES.md](NOTES.md).
