# Implementation notes

Deviations from SPEC-001, items skipped or left unverified, and known risks. Updated 2026-10-16.

## Status

- Every [P0] and [P1] requirement is implemented.
- `xcodegen generate` followed by `xcodebuild … clean build test` succeeds on the iPhone 17 Pro Simulator
  (iOS 26.5 SDK, Xcode 26.5) with no warnings in any target. 58 tests in 11 suites pass.
- The app also builds for a generic iOS device (`-destination 'generic/platform=iOS'`).
- In the Simulator, the DEBUG sample location renders correctly on Home, Plan, 3D, and Measurements, in both
  light and dark mode. Units switch live.
- **No LiDAR device was available**, so live capture, merging, USDZ export, and the §15.2 checklist haven't
  been run. See "Unverified on a device" below.

## Deviations

| Spec | Implementation | Reason |
|---|---|---|
| Target directory `ios-client/` | `mobile/` | The task asked for the `mobile` directory. Paths in this file and the README are relative to `mobile/`. |
| `LocationRepository` takes `CapturedRoom` / `CapturedStructure` (§10.1) | It takes and returns encoded JSON (`Data`). `CapturedRoomEntry` and `RoomPlanCoding` handle the RoomPlan side. | `CapturedRoom` has no public initializer, so a repository that takes one can't be tested in the Simulator. This also keeps RoomPlan out of `Persistence/` (§4.1 key rule). The spec says the signatures are the agent's choice. |
| `finalize(locationID:rooms:)` sits next to the view model (§8.5) | `ScanFinalizer` in `Capture/ScanFinalizer.swift`, used by the Save sheet, "Finish with N rooms", and "Rebuild" | One shared implementation, as §8.5 requires. |
| Non-optional Core Data attributes | The model attributes are non-optional, as specified. The hand-written Swift properties for `id`, `name`, dates, and `statusRaw` are optionals with safe accessors (`displayName`, `status`). | SwiftUI rows can read a deleted or faulted object during a delete animation. A non-optional bridged property would crash there. |
| `SampleGeometry` used by the app | Compiled only in DEBUG builds, as is `PreviewSupport.swift` | §2.1: sample data is DEBUG only. |
| "Rebuild" re-runs §8.5 mapping | Rebuild reuses the stored `structureJSON` when it exists, instead of merging again. "Finish with N rooms" on drafts always merges. | This avoids a second StructureBuilder pass that could give a different result. |
| Per-room geometry from the captured rooms | When StructureBuilder succeeds, each room's floor and surfaces come from its copy in `CapturedStructure.rooms` (matched by `identifier`, then by order). | The merge can move rooms. Using the merged copies keeps the floor fills aligned with the merged walls. **Verify on a device.** |
| PNG export at 1600 pt (§7.7.4) | 1600 pt on the longest side at 3×, with 120 pt padding and Dynamic Type `accessibility3` for the labels | With the plain `.full` style, caption-sized labels were tiny and got clipped at the edges of a 1600 pt image. |
| Wall label offset of 12 pt (§9.1 step 5) | At least 12 pt, and more when needed to clear a thick wall stroke | At high zoom and in the export, the wall stroke (0.12 m) is wider than 24 pt, and labels landed on the wall. |
| 3D camera with a 45° FOV (§9.2) | 45° applied horizontally (`projectionDirection = .horizontal`) | On a portrait screen, a vertical 45° FOV cropped the model at 1.6× the extent. |
| Mini plan "collapsed or expanded" (CAP-4) | Expanded is the 140 × 140 pt plan. Collapsed is a 44 pt map button. | The spec doesn't define the collapsed state. |
| Scan tips screen (§7.3) | It also has a Cancel button on first run. | It's the first screen of a full-screen cover, so it needs a way out. |
| Wall label side | Labels go on the side of the wall away from the plan's center. | The spec says only "offset 12 pt perpendicular". |
| DEBUG extras | "Add rotated L-shaped room" menu item, plus the `-seedSamples`, `-openFirst`, and `-detailTab` launch arguments (see README) | They make the Simulator checks in §16 repeatable. |
| English UI | Spanish-only UI (`es`) with semantic localization keys (see README, Localization) | Requested after implementation. The CSV export keeps its English column and element names, because it's a data format rather than UI. |
| Milestone commits (§14) | Delivered as one commit | All five milestones were built and verified in one pass. Splitting them afterward would have produced commits that don't build on their own. |

## SDK differences

The RoomPlan API in the iOS 26.5 SDK matches the spec and Appendix A, so no changes were needed. Notes:

- `RoomPlan.framework` ships in the Simulator SDK, so no `#if targetEnvironment(simulator)` stubs were needed
  for the capture code. In the Simulator, `RoomCaptureSession.isSupported` returns false, and New Scan is
  disabled.
- `RoomCaptureSession.stop(pauseARSession:)` is declared `@_disfavoredOverload`. `stop(pauseARSession: false)`
  still resolves to it.
- `RoomCaptureView` is `@MainActor`. `RoomCaptureViewDelegate` inherits `NSCoding`, so
  `CaptureSessionController` implements `nonisolated required init?(coder:)` and `nonisolated encode(with:)`.
  The delegate callbacks are `nonisolated` and hop to the main actor.
- USDZ export is hidden in the Simulator (`DeviceCapabilities.supportsUSDZExport`).

## Skipped [P2] items

- Door swing arcs on the plan (§9.1).
- Thermal state banner (§8.6).
- DEBUG raw JSON export (§7.7.4) and real `CapturedRoom` fixtures for the tests (§15.1). Add these after the
  first device scan.

Implemented [P2]: the 3D model is turned by the plan rotation, so it starts square to the screen like the
plan (§9.2).

## Unverified on a device (open risks)

These all need a LiDAR iPhone. They're also covered by the README checklist.

1. **Live delegate (§8.4).** `CaptureSessionController` sets `captureView.captureSession.delegate = self`.
   Check that RoomCaptureView's own live model still updates. If it doesn't, remove that line
   (`CaptureSessionController.init`). The mini plan then shows only completed rooms, and the readout shows only
   completed totals.
2. **Floor polygon axes (§6.3).** The floor polygon maps `polygonCorners` and the rectangle fallback through
   `transform * SIMD4(corner, 1)`. Check that the fills sit inside the walls (checklist item 5).
3. **Overlay placement (CAP-8).** The top bar, mini plan, and readout sit at the top of the screen. Check that
   they don't cover RoomPlan's coaching text or its live model, and adjust the layout in `LiveOverlayView` if
   they do.
4. **Merging after `stop(pauseARSession: false)`.** Rooms are processed by `RoomCaptureView` and merged with
   `StructureBuilder(options: [.beautifyObjects])`. If the merge fails, the app saves unmerged rooms and shows
   the DET-4 banner.
5. **Late results after Cancel → "Save N rooms".** Stopping the session can make RoomPlan process the
   in-progress room. `CaptureSessionController` ignores results once `endSession()` runs, so that room is
   dropped, as intended. Check that no stray review sheet appears.
6. **USDZ export** with `.parametric` options, from a structure and from a single room.
7. **Error flows (§11).** Tracking loss, a scene that's too large, and the device getting too hot all
   arrive as `RoomCaptureSession.CaptureError`. They show the review sheet's error variant.

## Other notes

- The Core Data store fails soft. If it can't load, the error is logged and the app keeps running with no
  data. A migration-failure UI wasn't in scope.
- Strings are extracted at build time. `xcodebuild` doesn't write them back into the catalog, so run
  `scripts/sync-strings.sh` after command-line builds (Xcode does this automatically in the IDE).
- SceneKit is deprecated. It's confined to `Rendering/SceneBuilder.swift` and `Rendering/SceneKitView.swift`.
