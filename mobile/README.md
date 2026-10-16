# RoomScanner (iOS)

RoomScanner scans several connected rooms with an iPhone's LiDAR scanner in one session, merges them into one
floor plan, and saves the result on the device. For each saved location you get a 2D floor plan with
dimensions, an orbitable 3D model, and a list of measurements. It implements
[SPEC-001](../spec/SPEC-001.md) and [SPEC-004](../spec/SPEC-004.md).

- Login with an organization API account; completed scans upload through a persistent retry queue.
- No analytics or third-party dependencies.
- Built with Swift, SwiftUI, RoomPlan, ARKit, SceneKit, and Core Data.

## Requirements

| | |
|---|---|
| Xcode | 26.x (tested with 26.5) |
| iOS | 17.0 or later |
| XcodeGen | `brew install xcodegen` |
| Scanning | An iPhone with a LiDAR scanner (iPhone 12 Pro or a later Pro model) |

Everything except live capture runs in the Simulator. Devices without LiDAR can install the app and browse
saved scans after signing in.

## Setup

The Xcode project is generated from `project.yml` and isn't checked in.

```bash
cd mobile
brew install xcodegen      # once
xcodegen generate
open RoomScanner.xcodeproj
```

Run `xcodegen generate` again after adding or removing files.

## API configuration and login

`Config/App.xcconfig` includes signing and API settings. `Config/API.xcconfig` defaults to `API_BASE_URL = http:/$()/localhost:4000`, which works with the API on the Mac from the Simulator. `APIBaseURL` in Info.plist expands that build setting; the app appends `/api/...` and `/health` itself, preserving any proxy prefix.

Create a gitignored `Config/API.local.xcconfig` for your server:

```xcconfig
API_BASE_URL = https:/$()/your-tunnel-host
```

**The `$()` is required:** `//` starts a comment in xcconfig files. The value is the API's `PUBLIC_URL`, without `/api`. Invalid or missing values show a configuration screen. Production Internet servers require HTTPS through App Transport Security; there is no arbitrary-load exception. `NSAllowsLocalNetworking` enables localhost and `.local` names. A phone cannot use the Mac's localhost: use a tunnel (recommended) or `http:/$()/your-mac.local:4000` on the same Wi-Fi. The local-network permission prompt explains login and scan uploads. Localhost and `.local` ATS behavior still need verification with Xcode/device access in this environment.

The app requires login using the same accounts as the admin (`admin@example.com` / `change-me-please` in a fresh development API). Tokens and session identity live only in Keychain with AfterFirstUnlockThisDeviceOnly accessibility; UserDefaults keeps only the last email and settings. Valid sessions open offline, then `/api/auth/me` checks them in the background. An expired/deactivated session returns to login without losing scans. An active capture stays on screen until it closes.

Settings has Cuenta, Sincronización and Servidor. Logout confirms and warns about pending measurements. DEBUG builds can change/reset the server and test `/health`; changing servers signs out. Release builds show the host read-only.

## Uploads

Saving, finishing a draft, or adding a DEBUG sample queues a complete measurement. The owner is the account present when the draft was created; only that account can upload it. Older scans migrate as **Solo en este dispositivo** and can be claimed with **Subir**. Another account's scans show **De otra cuenta** and cannot be claimed.

The queue uploads one scan at a time: metadata, stored geometry JSON, the metric floor plan PNG, thumbnail, CSV and available raw RoomPlan JSON/USDZ. Multipart bodies are written to temporary files and removed after the request. Retries are idempotent by the location UUID. Network errors, 408, 429 and 5xx remain pending with exponential backoff (30 seconds up to 30 minutes); permanent errors show **Reintentar**. A 401 pauses uploads and asks for login. Uploads resume on login, foreground, connectivity recovery or **Subir ahora**. Background execution time is requested, but uploads after termination are outside scope.

Renaming/rebuilding/deleting locally does not change an uploaded server copy. Deletion explicitly preserves that copy.

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

1. Signing uses team `W3X5T2A2DA`, set in `Config/Signing.xcconfig`. To sign with your own team, create
   `Config/Signing.local.xcconfig` (gitignored) containing `DEVELOPMENT_TEAM = <your team ID>`. Don't pick the
   team in Xcode's Signing & Capabilities tab: `xcodegen generate` overwrites it.
2. If the bundle ID `com.clean.code.RoomScanner` is taken, change `PRODUCT_BUNDLE_IDENTIFIER`.
3. Select your LiDAR iPhone and run.

## DEBUG sample data

DEBUG builds have a ladybug menu at the top left of the Home screen:

- **Agregar lugar de ejemplo** inserts a two-room apartment (a 5 × 4 m living room and a 3.5 × 4 m bedroom).
- **Agregar habitación en L rotada** inserts a 14 m² L-shaped room rotated in world space, which exercises plan
  rotation.
- **Eliminar todo** removes every location.

With these, Home, the detail screen, and the Plan, 3D, Measurements, and Share features all work in the Simulator.

DEBUG builds also accept launch arguments, which help with screenshots and quick checks:

| Argument | Effect |
|---|---|
| `-seedSamples` | Adds both samples when the store is empty |
| `-openFirst` | Opens the newest location on launch |
| `-detailTab plan\|model\|measurements` | Selects the detail tab |

```bash
xcrun simctl launch booted com.clean.code.RoomScanner -seedSamples -openFirst -detailTab model
```

## Contract fixtures

The identical `two-room-apartment.geometry.json` in tests, API fixtures, API seed data and web fixtures was generated from `SampleGeometry.twoRoomApartment()` with Swift `JSONEncoder.outputFormatting = [.sortedKeys]`. IDs are fixed in the committed file; tests compare metrics rather than re-encoding the random-ID sample. The contract is 20 + 14 = 34 m², 8.5 × 4 m footprint and 2.5 m walls, with merged surfaces.

To regenerate all artifacts with real app-rendered PNGs:

1. In Xcode's scheme Test environment, set `ROOMSCANNER_EXPORT_FIXTURE=1` and run `ContractFixtureTests.exportFixtureWhenRequested` on the Simulator.
2. Read the `ROOMSCANNER_FIXTURE_EXPORT: <directory>` path from the test log. It contains geometry, matching upload metadata, floor-plan PNG and thumbnail. This opt-in export doesn't overwrite committed fixtures.
3. Copy `two-room-apartment.geometry.json` to `RoomScannerTests/Fixtures/`, `../api/test/fixtures/`, and `../web/src/measurements/__fixtures__/`. Copy that same file as `../api/src/db/fixtures/sample-measurement/geometry.json`.
4. Copy `metadata.json` to `../api/test/fixtures/` and `../api/src/db/fixtures/sample-measurement/`. Copy `floor-plan.png` and `thumbnail.png` to the latter directory. Remove the Test environment flag, then rerun all contract tests.

## Localization

The UI is Spanish only (`es` is the development language). It follows Apple's String Catalog approach with
**generated symbols** (Xcode 26). The code never contains UI text: every string is a manually managed key in
`RoomScanner/Resources/Localizable.xcstrings`, and Xcode generates a type-safe `LocalizedStringResource` for it
(`STRING_CATALOG_GENERATE_SYMBOLS`).

```swift
Text(.homeNewScan)                                    // key "home.newScan" → "Nuevo escaneo"
Button(.commonCancel, role: .cancel) {}
String(localized: .liveOverlayRoomTitle(number: n))  // "Habitación %(number)lld"
```

- Keys are `area.element[.detail]` in lowerCamel. Shared strings use `common.*`. Xcode turns `home.newScan` into `.homeNewScan`.
- Name placeholders in the value (`%(number)lld`, `%(name)@`). The names become the symbol's argument labels.
- Counted nouns (`Shared/Inflection.swift`) keep the inflection markup in the value: `^[%(count)lld habitación](inflect: true)`.
- APIs without a `LocalizedStringResource` overload on iOS 17 (`TextField`, `LabeledContent`, alert titles) take
  `String(localized: .key)` or `Text(.key)`.

To add a string, open the catalog in Xcode and add a key with its Spanish value (it's manually managed, with
Generate Swift Symbol on). Then use the symbol in code. A missing or misspelled key is a compile error. Xcode
updates the catalog when you build in the IDE. After a command-line build, run `scripts/sync-strings.sh`.

## Project layout

```
mobile/
├── project.yml              XcodeGen spec
├── NOTES.md                 Deviations, skipped items, and open risks
├── RoomScanner/
│   ├── App/                 App entry, preview data
│   ├── Capture/             RoomPlan session, capture state machine, capture screens, finalize, USDZ
│   ├── Geometry/            ScanGeometry (render model), math, metrics, RoomPlan mapping, samples
│   ├── Networking/          API configuration, Keychain, API client, multipart file writer
│   ├── Session/             Login, restore, logout and session loss
│   ├── Sync/                Stored upload payloads, queue, retry states
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

## SPEC-004 verification checklist

On the Mac and Simulator (requires Xcode and XcodeGen):

1. Reset/seed the API, start it, verify the startup public URL and `curl -s localhost:4000/health`.
2. Run the API README's curl upload twice: expect 201 with Location, then 200 with the same ID. Open Mediciones; check Plano, 3D controls/furniture in both themes, 34,0 m² and every room table, then download files, rename and delete the test upload.
3. With `API_BASE_URL = http:/$()/localhost:4000`, launch on login. A wrong password shows the inline Spanish error; a valid account opens Home and survives relaunch.
4. Add the DEBUG sample. Check Pendiente → Subiendo → Subido and its record in Mediciones.
5. Stop the API, add another sample, and verify it stays pending with an error. Restart and foreground the app; verify it uploads. Try logout with a pending scan and check the count warning.
6. Deactivate the mobile user's account through another admin account, then upload: the login screen appears and the scan stays pending. Reactivate and log in as the same account; it uploads. While a capture is open, login waits for it to close.
7. Change PUBLIC_URL and restart; new file links follow it while the admin's configured file fetches still work.
8. Open an existing version-1 store: all scans survive as localOnly/owner 0. Claim one with Subir; another account's scans have no upload action.

On a LiDAR iPhone:

9. Through an HTTPS tunnel, log in, scan two rooms and save. Verify plan, orbitable 3D, measurements and downloadable USDZ in the admin; open USDZ in Quick Look.
10. Enable Airplane Mode before saving; the local scan survives and uploads when connectivity returns.
11. Background immediately after saving and verify the upload completes within the granted background time.
12. Test `.local` on shared Wi-Fi and its permission prompt. Record the working host form and ATS behavior in NOTES.md. HTTPS tunnels avoid local-network addressing differences.

These checks are additional to the capture/device checklist above. See NOTES.md for what was actually verified.
