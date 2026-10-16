# SPEC-001: RoomScanner, a LiDAR multi-room scanner for iOS

| | |
|---|---|
| **Status** | Draft, ready for implementation |
| **Date** | 2026-10-16 |
| **Target directory** | `ios-client/` |
| **Platform** | iOS 17.0+, iPhone with a LiDAR scanner |
| **Stack** | Swift, SwiftUI, RoomPlan, ARKit, SceneKit, Core Data |
| **Working title** | RoomScanner (placeholder; the name and bundle ID can change) |

---

## 0. Instructions for the implementing agent

1. Build everything under `ios-client/`. Don't modify `api/` or anything outside `ios-client/` except this spec folder.
2. Each requirement has a priority:
   - **[P0]**: required for v1.
   - **[P1]**: expected. Build it unless you run out of time, and list anything you skip in `ios-client/NOTES.md`.
   - **[P2]**: optional polish.
3. The decisions in this document are binding. RoomPlan API names and signatures in this spec come from the iOS 17 SDK. If the installed SDK differs, follow the SDK and record the difference in `ios-client/NOTES.md`.
4. RoomPlan needs a physical device with LiDAR, so it doesn't run in the Simulator. Structure the code so that **everything except the live capture screen runs and is testable in the Simulator**, using the sample data from §13.3.
5. Follow the implementation order in §14. Before you call the work done, check it against §16 (Definition of Done).

---

## 1. Overview

RoomScanner lets a user walk through a home or office with a LiDAR-equipped iPhone and scan several rooms in one session. While the user scans, the app shows live feedback: RoomPlan's built-in 3D visualization, a live mini floor plan, and running dimensions. When the user finishes, the app merges the rooms into one structure and saves a **location** on the device. For each location the user can view:

- a **2D floor plan** with wall lengths, room names, and room areas,
- an interactive **3D model** that can be orbited and zoomed,
- a **measurements** list covering each room, wall, door, window, and object.

The Home screen lists all previously scanned locations and has a button to start a new scan.

### 1.1 Goals

| ID | Goal |
|---|---|
| G1 | Scan multiple connected rooms in one continuous session and merge them into one structure. |
| G2 | Give live feedback during scanning: 3D visualization, mini floor plan, and running dimensions. |
| G3 | For every saved location, show a floor plan, a 3D view, and precise measurements. |
| G4 | Save everything locally with Core Data and show the history on Home. |
| G5 | Stay simple: few screens, no accounts, no network. |

### 1.2 Core user flow

```
Home ──[New Scan]──► Scan tips (first time only)
                       │
                       ▼
                 Scan room 1 ──[Done]──► Review room 1 ──[Scan Next Room]──► Walk to next room ──[Start]──► Scan room 2 ...
                                              │
                                          [Finish]
                                              ▼
                                   Save location (name + summary)
                                              ▼
                                   Location detail (Plan | 3D | Measurements)
                                              ▼
                                   Back to Home: the location appears at the top of the history
```

---

## 2. Scope

### 2.1 In scope (v1)

- Multi-room capture with RoomPlan in one continuous AR session (iOS 17 multi-room support).
- Merging rooms with `StructureBuilder`, with a graceful fallback when merging fails.
- A live mini floor plan and dimension readout during capture.
- A 2D floor plan (SwiftUI `Canvas`), a 3D model (SceneKit), and a measurements list.
- Core Data persistence: history list, rename, delete, and recovery of unfinished scans.
- Metric and imperial units.
- Share and export: floor plan PNG, measurements CSV, and a USDZ model **[P1]**.
- Sample data for the Simulator, SwiftUI previews, and tests (DEBUG builds only).

### 2.2 Out of scope (v1)

- Accounts, cloud sync, any networking, and the `api/` backend.
- Adding rooms to an existing location in a later session. This would need ARWorldMap relocalization (see §17).
- Editing geometry (moving walls, adding furniture).
- Multi-story separation UI. All rooms are drawn on one plan.
- Curved or sloped walls. They are rendered as straight, rectangular walls.
- An iPad-optimized layout, landscape orientation, and Android.
- Localization beyond English. Strings still go through a String Catalog so translation is possible later.

---

## 3. Platform, tooling, and dependencies

### 3.1 Platform

| Item | Decision | Reason |
|---|---|---|
| Deployment target | **iOS 17.0** | Needed for multi-room capture (continuous `ARSession`, `StructureBuilder`), `CapturedRoom.floors` and `.sections`, `@Observable`, `MagnifyGesture`, and `ContentUnavailableView`. |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`), portrait only | Keeps the scope small. iPads with LiDAR can still run the app in compatibility mode. |
| Hardware | LiDAR (iPhone 12 Pro and later Pro models) | RoomPlan requirement. Check at runtime with `RoomCaptureSession.isSupported`. No `UIRequiredDeviceCapabilities` key exists for LiDAR, so devices without it can install the app, browse scans, and see a clear message when they try to scan. |
| Xcode | Xcode 26.x | Current toolchain. |
| Swift | Swift 5 language mode, `SWIFT_STRICT_CONCURRENCY = targeted` | RoomPlan and ARKit delegate APIs aren't fully annotated for Sendable. This avoids fighting the compiler without giving up concurrency checks. |
| Architecture | SwiftUI with `@Observable` view models marked `@MainActor`; UIKit only where required (`RoomCaptureView`, `SCNView`) | |
| Tests | Swift Testing (`import Testing`) | |

### 3.2 Dependencies: none at runtime

**The app ships with no third-party runtime dependencies.** Everything it needs is first-party: RoomPlan, ARKit, SceneKit, SwiftUI, Core Data, AVFoundation (camera permission), UniformTypeIdentifiers, and os.Logger.

- Reasons: the dependency surface stays small, nothing drifts between versions, and no pod or package is needed for any feature in this spec. CocoaPods is in maintenance mode, and its trunk is scheduled to go read-only. If a dependency is needed later, add it with **Swift Package Manager**, not CocoaPods.
- **Development tooling:** use [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`) to generate `RoomScanner.xcodeproj` from `project.yml`. Don't hand-write or hand-edit `project.pbxproj`. The generated `.xcodeproj` is git-ignored.

---

## 4. Architecture

### 4.1 Layers

```
┌──────────────────────────────────────────────────────────────────┐
│ Features (SwiftUI views): Home, Capture flow, Location detail,   │
│ Settings                                                         │
└───────────────┬──────────────────────────────────┬───────────────┘
                │ observes                         │
┌───────────────▼──────────────┐   ┌───────────────▼──────────────┐
│ View models (@Observable,    │   │ Rendering                    │
│ @MainActor)                  │   │  FloorPlanCanvas (Canvas)    │
│  CaptureViewModel            │   │  FloorPlanLayout (pure math) │
│  LocationDetailViewModel     │   │  SceneBuilder (SceneKit)     │
└──────┬───────────────┬───────┘   └───────────────▲──────────────┘
       │               │                           │ consumes
┌──────▼──────┐ ┌──────▼──────────┐ ┌──────────────┴──────────────┐
│ Capture     │ │ Persistence     │ │ Geometry (pure, no UIKit)   │
│ RoomPlan +  │ │ Core Data stack │ │ ScanGeometry (Codable),     │
│ ARKit       │ │ Location-       │ │ math, metrics, formatting,  │
│             │ │ Repository      │ │ RoomPlanMapping             │
└─────────────┘ └─────────────────┘ └─────────────────────────────┘
```

**Key rule:** RoomPlan types (`CapturedRoom`, `CapturedStructure`, and related types) are used only in `Capture/` and `Geometry/RoomPlanMapping.swift`. Everything downstream (rendering, measurements, UI, and the render model in persistence) consumes **`ScanGeometry`**, a plain `Codable` value type in world-space meters. This keeps rendering and measurement code testable in the Simulator, and it means a location can be displayed without decoding RoomPlan data.

### 4.2 Folder layout

```
ios-client/
├── project.yml
├── README.md                     # setup, build, and the manual device test checklist
├── NOTES.md                      # deviations, skipped P1/P2 items, known issues (agent-maintained)
├── .gitignore                    # *.xcodeproj, xcuserdata, DerivedData, .DS_Store
├── RoomScanner/
│   ├── App/
│   │   └── RoomScannerApp.swift
│   ├── Capture/
│   │   ├── CaptureSessionController.swift   # owns ARSession + RoomCaptureView, RoomPlan delegates
│   │   ├── CaptureViewModel.swift           # state machine (§8.2)
│   │   ├── CaptureFlowView.swift            # full-screen container for the whole flow
│   │   ├── RoomCaptureContainer.swift       # UIViewRepresentable wrapping RoomCaptureView
│   │   ├── LiveOverlayView.swift            # top bar, mini floor plan, dimension readout
│   │   ├── RoomReviewSheet.swift
│   │   ├── SaveLocationSheet.swift
│   │   └── ScanTipsView.swift
│   ├── Geometry/
│   │   ├── ScanGeometry.swift               # domain model (§5.2)
│   │   ├── GeometryMath.swift               # shoelace, centroid, convex hull, point-in-polygon, plan rotation
│   │   ├── RoomMetrics.swift                # area, perimeter, ceiling height, footprint
│   │   ├── RoomPlanMapping.swift            # CapturedRoom/CapturedStructure → ScanGeometry
│   │   └── SampleGeometry.swift             # fixtures for previews, DEBUG seeding, tests
│   ├── Persistence/
│   │   ├── RoomScanner.xcdatamodeld/
│   │   ├── PersistenceController.swift
│   │   ├── Location+CoreData.swift
│   │   ├── LocationPayload+CoreData.swift
│   │   ├── Room+CoreData.swift
│   │   └── LocationRepository.swift
│   ├── Rendering/
│   │   ├── FloorPlanLayout.swift            # world → view transform (pure, unit-tested)
│   │   ├── FloorPlanCanvas.swift            # styles: .full, .mini, .thumbnail
│   │   ├── SceneBuilder.swift               # ScanGeometry → SCNScene
│   │   └── SceneKitView.swift               # UIViewRepresentable around SCNView
│   ├── Features/
│   │   ├── Home/            HomeView.swift, LocationRow.swift
│   │   ├── LocationDetail/  LocationDetailView.swift, LocationDetailViewModel.swift,
│   │   │                    FloorPlanTab.swift, ModelTab.swift, MeasurementsTab.swift, ShareMenu.swift
│   │   └── Settings/        SettingsView.swift
│   ├── Shared/
│   │   ├── UnitFormatting.swift
│   │   ├── DeviceCapabilities.swift
│   │   └── Log.swift
│   └── Resources/
│       ├── Assets.xcassets
│       ├── Localizable.xcstrings
│       └── PrivacyInfo.xcprivacy
└── RoomScannerTests/
    ├── GeometryMathTests.swift
    ├── RoomMetricsTests.swift
    ├── UnitFormattingTests.swift
    ├── ScanGeometryCodingTests.swift
    ├── FloorPlanLayoutTests.swift
    └── LocationRepositoryTests.swift
```

---

## 5. Data model

### 5.1 Core Data

- The model file is `RoomScanner.xcdatamodeld`, with one model version.
- Set **Codegen to "Manual/None"** on every entity and write the `NSManagedObject` subclasses by hand (`@objc(Location) final class Location: NSManagedObject`). Hand-written subclasses are more predictable than generated ones when the project is built by XcodeGen.
- Store all lengths in **meters** and all areas in **square meters**. Convert only for display.
- Large blobs live in a separate `LocationPayload` entity so the Home list never faults them in.

**`Location`**

| Attribute | Type | Optional | Notes |
|---|---|---|---|
| `id` | UUID | no | |
| `name` | String | no | Default: `"Scan " + createdAt.formatted(date: .abbreviated, time: .shortened)` |
| `createdAt` | Date | no | Home sorts by this, newest first |
| `updatedAt` | Date | no | |
| `statusRaw` | String | no | `"draft"` or `"complete"`. Expose it as `var status: LocationStatus` |
| `roomCount` | Int16 | no | Denormalized for the Home list |
| `totalFloorArea` | Double | no | m², denormalized for the Home list |
| `thumbnailPNG` | Binary Data, **Allows External Storage** | yes | Floor plan thumbnail (§9.1) |

Relationships: `rooms` (to-many `Room`, **cascade**, inverse `location`) and `payload` (to-one `LocationPayload`, **cascade**, inverse `location`).

**`LocationPayload`**

| Attribute | Type | Optional | Notes |
|---|---|---|---|
| `geometryJSON` | Binary Data, External Storage | yes | Encoded `ScanGeometry`. It is `nil` while the location is a draft. |
| `structureJSON` | Binary Data, External Storage | yes | Encoded `CapturedStructure` (raw RoomPlan output). It is `nil` for single-room scans, failed merges, and sample data. |

Relationship: `location` (to-one `Location`, nullify).

**`Room`**

| Attribute | Type | Optional | Notes |
|---|---|---|---|
| `id` | UUID | no | Equal to `RoomGeometry.id` |
| `index` | Int16 | no | 0-based capture order. Sort by this. |
| `name` | String | no | User-editable. The default comes from the detected room type (§6.5). |
| `capturedAt` | Date | no | |
| `floorArea` | Double | no | m² |
| `capturedRoomJSON` | Binary Data, External Storage | yes | Encoded `CapturedRoom` (raw). Kept so the location can be rebuilt or re-exported. |

Relationship: `location` (to-one `Location`, nullify).

`CapturedRoom` and `CapturedStructure` conform to `Codable`. Encode them with `JSONEncoder`.

### 5.2 `ScanGeometry` (domain model)

All values are in ARKit world space, in meters (see §6.1). `SIMD2/3/4<Float>` are already `Codable`, but `simd_float4x4` isn't, so wrap it.

```swift
struct ScanGeometry: Codable, Equatable {
    static let currentVersion = 1
    var version: Int = Self.currentVersion
    var rooms: [RoomGeometry]
    /// Location-wide surfaces from StructureBuilder. nil for single-room scans or failed merges.
    var merged: MergedGeometry?
    /// Rotation in radians about +Y that aligns the dominant wall direction with the screen axes (§6.4).
    var planRotation: Float
}

struct RoomGeometry: Codable, Equatable, Identifiable {
    var id: UUID                        // == Room.id in Core Data
    var detectedType: RoomType?         // from CapturedRoom.sections
    var floorPolygon: [SIMD2<Float>]    // world XZ; empty if unknown
    var isFloorApproximate: Bool        // true when the polygon is the convex-hull fallback
    var labelPosition: SIMD2<Float>?    // world XZ
    var walls: [SurfaceGeometry]
    var doors: [SurfaceGeometry]
    var windows: [SurfaceGeometry]
    var openings: [SurfaceGeometry]
    var objects: [ObjectGeometry]
}

struct MergedGeometry: Codable, Equatable {
    var walls, doors, windows, openings: [SurfaceGeometry]
    var objects: [ObjectGeometry]
}

struct SurfaceGeometry: Codable, Equatable, Identifiable {
    enum Kind: String, Codable { case wall, door, window, opening }
    var id: UUID
    var kind: Kind
    var isOpen: Bool?                   // doors only
    var transform: Transform            // world transform of the surface center
    var dimensions: SIMD3<Float>        // x = width (length along the wall), y = height
}

struct ObjectGeometry: Codable, Equatable, Identifiable {
    var id: UUID
    var category: ObjectCategory        // String-backed, with an .other fallback
    var transform: Transform
    var dimensions: SIMD3<Float>        // x = width, y = height, z = depth
}

struct Transform: Codable, Equatable {
    var c0, c1, c2, c3: SIMD4<Float>
    init(_ m: simd_float4x4) { (c0, c1, c2, c3) = (m.columns.0, m.columns.1, m.columns.2, m.columns.3) }
    var matrix: simd_float4x4 { simd_float4x4(c0, c1, c2, c3) }
}

enum RoomType: String, Codable { case bedroom, bathroom, kitchen, livingRoom, diningRoom }
enum ObjectCategory: String, Codable {
    case storage, refrigerator, stove, bed, sink, washerDryer, toilet, bathtub, oven,
         dishwasher, table, sofa, chair, fireplace, television, stairs, other
}
```

**Which data each view renders:**
- Floor fills, room labels, room hit-testing, and per-room measurements always use `rooms[*]`.
- Walls, doors, windows, openings, and objects use `merged` when it's present. Otherwise they use all rooms' surfaces and objects concatenated. Without a merge, shared walls are drawn twice, on top of each other, which is acceptable.

If `ScanGeometry.version` is newer than the version the app supports, show the "Couldn't open this scan" state (§11).

---

## 6. Geometry and measurement rules

### 6.1 Coordinate system

- RoomPlan reports positions in **ARKit world space**: meters, right-handed, **+Y up** (aligned with gravity), with the origin where the AR session started. Yaw is arbitrary, so the axes are **not aligned to north or to the house**.
- The floor plan is the projection onto the **XZ plane**. When the plan is viewed from above with +X pointing right, +Z points **down** the screen, so the mapping is `screen = (x, z)` with no mirroring. Apply `planRotation` first (§6.4), then fit to the view (§9.1).
- Don't draw a compass or north arrow.

### 6.2 Derived values

| Value | Rule |
|---|---|
| Length of a wall, door, window, or opening | `dimensions.x` |
| Height of a surface | `dimensions.y` |
| Plan segment of a surface | `m = transform.matrix`; `center = (m.c3.x, m.c3.z)`; `axis = normalize((m.c0.x, m.c0.z))`; endpoints = `center ± axis · dimensions.x / 2` |
| Base elevation of a surface | `m.c3.y − dimensions.y / 2` |
| Object footprint | Transform the local corners `(±w/2, 0, ±d/2, 1)` with `m` and project each to `(x, z)` |
| Room floor polygon | See §6.3 |
| Room floor area | Shoelace formula on the floor polygon: `½·|Σ(xᵢ·zᵢ₊₁ − xᵢ₊₁·zᵢ)|`. If the polygon has fewer than 3 points, the area is unknown and displays as "—". |
| Room perimeter | Perimeter of the floor polygon. If no polygon exists, use the sum of wall lengths. |
| Ceiling height | Maximum wall height in the room |
| Location total floor area | Sum of the room floor areas |
| Location footprint (W × L) | Rotate all wall endpoints by `planRotation`, then take their axis-aligned bounding box. Show it as "W × L". |
| Label position | The section center `(x, z)` if one exists, otherwise the area-weighted polygon centroid |

### 6.3 Floor polygon, in order of preference

1. Take the largest surface in `CapturedRoom.floors`. If its `polygonCorners` (local space) isn't empty, transform each corner to world space with `transform * SIMD4(corner, 1)` and project to `(x, z)`.
2. If the floor exists but `polygonCorners` is empty, use the local rectangle `(±dimensions.x/2, ±dimensions.y/2, 0)`, then transform and project it as in step 1.
3. If there's no floor surface, use the **convex hull** of all wall endpoints and set `isFloorApproximate = true`. The UI shows these areas with a "≈" prefix.
4. If fewer than 3 points remain, use an empty polygon.

Verify steps 1 and 2 on a real device. The projected floor must line up with the walls (see the manual checklist in §15.2). If the local axes turn out to differ, fix the mapping and record the change in NOTES.md.

### 6.4 Plan rotation

The house should be drawn square to the screen. To do that, compute the dominant wall direction as a length-weighted circular mean of wall angles modulo 90°:

```
θᵢ = atan2(axis.z, axis.x)        // for each wall in the render source
C = Σ lenᵢ·cos(4θᵢ),  S = Σ lenᵢ·sin(4θᵢ)
dominant = atan2(S, C) / 4
planRotation = −dominant
```

After rotating by `planRotation`, every wall in a rectilinear house is within a fraction of a degree of horizontal or vertical. If there are no walls, `planRotation = 0`.

### 6.5 Room types and default names

| `CapturedRoom.Section.Label` | `RoomType` | Display name |
|---|---|---|
| `.bedroom` | `.bedroom` | Bedroom |
| `.bathroom` | `.bathroom` | Bathroom |
| `.kitchen` | `.kitchen` | Kitchen |
| `.livingRoom` | `.livingRoom` | Living Room |
| `.diningRoom` | `.diningRoom` | Dining Room |
| `.unidentified`, no sections, or `@unknown` | `nil` | — |

- `detectedType` comes from the first section whose label isn't `.unidentified`.
- Default name: the type's display name. The second room of the same type gets a suffix (`Bedroom 2`). Rooms with an unknown type are named `Room N`, where N is `index + 1`.
- Map `CapturedRoom.Object.Category` to `ObjectCategory` with a `switch` that ends in `@unknown default: .other`. Display names: "Storage", "Refrigerator", "Stove", "Bed", "Sink", "Washer/Dryer", "Toilet", "Bathtub", "Oven", "Dishwasher", "Table", "Sofa", "Chair", "Fireplace", "TV", "Stairs", "Object".

### 6.6 Units and formatting

Settings stores `UnitSystem` (`automatic | metric | imperial`) in `@AppStorage("unitSystem")`. Automatic means imperial when `Locale.current.measurementSystem == .us`, and metric otherwise.

| | Metric | Imperial |
|---|---|---|
| Length | meters, 2 decimals: `3.42 m` | feet and inches, rounded to the nearest ½″: `11′ 2½″` |
| Area | m², 1 decimal: `12.4 m²` | ft², 0 decimals: `133 ft²` |
| Object size | `2.10 × 0.90 × 0.85 m` (W × D × H) | `6′ 10½″ × 2′ 11½″ × 2′ 9½″` |

- Imperial conversion: `inches = m / 0.0254`, rounded to the nearest 0.5. When the inches reach 12, carry into the feet (`12′ 0″`, never `11′ 12″`). Use the prime characters `′` and `″`. Area: `ft² = m² × 10.7639`.
- Numbers use the current locale's decimal separator (`FormatStyle`). Tests pin the locale to `en_US`.
- Test vectors (en_US):

  | Input | Metric | Imperial |
  |---|---|---|
  | 1.0 m | `1.00 m` | `3′ 3½″` |
  | 3.4167 m | `3.42 m` | `11′ 2½″` |
  | 3.6449 m | `3.64 m` | `11′ 11½″` |
  | 3.6560 m | `3.66 m` | `12′ 0″` |
  | 10 m² | `10.0 m²` | `108 ft²` |
  | 12.345 m² | `12.3 m²` | `133 ft²` |

### 6.7 Precision

RoomPlan measurements are typically accurate to within a few centimeters. Lengths are shown to the centimeter (or the nearest ½″). Don't show more decimals than that, and don't make accuracy claims in the UI.

---

## 7. Screens and UX

### 7.1 Navigation map

```
HomeView (NavigationStack with a path)
 ├── push            → LocationDetailView (segmented: Plan | 3D | Measurements)
 ├── sheet           → SettingsView
 └── fullScreenCover → CaptureFlowView
                         ├── ScanTipsView        (first time, or from the "?" button)
                         ├── live capture        (RoomCaptureView + LiveOverlayView)
                         ├── RoomReviewSheet     (after each room)
                         └── SaveLocationSheet   → dismiss cover → push LocationDetailView
```

Use system colors and SF Symbols throughout, and support both light and dark mode.

### 7.2 Home [P0]

```
┌──────────────────────────────────┐
│ Scans                         ⚙︎  │
├──────────────────────────────────┤
│ ┌───┐ Apartment                  │
│ │ ▦ │ Oct 16, 2026 · 3 rooms     │
│ └───┘ 84.2 m²                    │
│ ┌───┐ Office         Incomplete  │
│ │ ▦ │ Oct 12, 2026 · 2 rooms     │
│ └───┘                            │
│                                  │
│  ┌────────────────────────────┐  │
│  │      ⊕  New Scan           │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

- **HOME-1 [P0]** List all locations with `@FetchRequest`, sorted by `createdAt` descending. Each row shows a 56×56 pt thumbnail (with a placeholder symbol if there is none), the name, the date (`.abbreviated`), the room count, and the total area.
- **HOME-2 [P0]** Draft locations show an "Incomplete" badge and no area.
- **HOME-3 [P0]** A prominent **New Scan** button is pinned to the bottom (`.safeAreaInset(edge: .bottom)`, `.borderedProminent`, `.controlSize(.large)`). It opens the capture flow (§7.4).
- **HOME-4 [P0]** If `RoomCaptureSession.isSupported == false`, disable the button and show a footer: *"Scanning requires an iPhone with a LiDAR scanner. You can still view saved scans."*
- **HOME-5 [P0]** Empty state: `ContentUnavailableView` with the title "No scans yet", the description "Scan your first room to create a floor plan.", and the New Scan button still visible.
- **HOME-6 [P0]** Swipe to delete, with a confirmation dialog ("Delete 'Apartment'? This can't be undone."). The delete cascades to rooms and the payload.
- **HOME-7 [P1]** A context menu offers Rename (an alert with a text field) and Delete.
- **HOME-8 [P1]** A toolbar gear opens Settings.
- **HOME-9 [P0, DEBUG only]** A toolbar menu has "Add sample location" (§13.3) and "Delete all".
- **HOME-10 [P0]** Tapping a row pushes `LocationDetailView`.

### 7.3 Scan tips [P1]

Show this screen before the first capture (`@AppStorage("hasSeenScanTips")`). It's also reachable from a "?" button in the capture top bar. Each tip has an SF Symbol:

- Use good lighting. Apple recommends at least 50 lux.
- Move slowly and point the camera at walls, corners, doors, and windows.
- Keep the doors between rooms open so the rooms can be connected.
- Scan one room at a time. When a room is finished, tap **Done**, walk through the doorway to the next room, and tap **Start**.
- Rooms up to about 9 × 9 m (30 × 30 ft) work best.

The screen ends with a "Start Scanning" button.

### 7.4 Live capture [P0]

```
┌──────────────────────────────────┐
│ ✕ Cancel     Room 2     Done ✓   │  ← top bar (material background)
│ ┌────────┐ ┌──────────────────┐  │
│ │  mini  │ │ Room 2: 3 walls, │  │  ← LiveOverlayView
│ │  plan  │ │ 1 door, 1 window │  │
│ └────────┘ │ Total: 1 room,   │  │
│            │ 18.2 m²          │  │
│            └──────────────────┘  │
│      camera feed + RoomPlan      │
│      coaching and live           │
│      wireframe                   │
│                                  │
│   [RoomPlan's live 3D model]     │  ← provided by RoomCaptureView
└──────────────────────────────────┘
```

- **CAP-1 [P0]** Before presenting the capture flow, check camera permission with `AVCaptureDevice.authorizationStatus(for: .video)` and request it if it's undetermined. If it's denied or restricted, show an alert with an **Open Settings** button (`UIApplication.openSettingsURLString`) and don't present capture.
- **CAP-2 [P0]** The full-screen `RoomCaptureView` (wrapped in `RoomCaptureContainer`) provides RoomPlan's coaching and live 3D visualization. This is the "simple 3D view while scanning".
- **CAP-3 [P0]** Top bar: **Cancel** on the leading side, "Room N" in the center, and **Done** on the trailing side. Done ends the current room (§8.3).
- **CAP-4 [P1]** Live mini floor plan: `FloorPlanCanvas(style: .mini)`, about 140×140 pt, at the top-leading position. It draws the completed rooms and the in-progress room (from live updates, §8.4), with the current room in the accent color. Tapping it toggles between collapsed and expanded.
- **CAP-5 [P0]** Live readout: the wall, door, and window counts for the current room, plus the completed room count and completed total area. When the current room's floor polygon is available, also show its approximate area (`≈ 12.3 m²`).
- **CAP-6 [P0]** Cancel behavior:
  - With 0 completed rooms, ask "Discard scan?", then stop the session and dismiss.
  - With 1 or more completed rooms, show a confirmation dialog: **Save N rooms** (goes to the Save step), **Discard scan** (destructive; deletes the draft), or **Keep scanning**.
- **CAP-7 [P0]** Set `UIApplication.shared.isIdleTimerDisabled = true` while the capture flow is on screen, and restore it on dismiss.
- **CAP-8 [P1]** Overlays must not cover RoomCaptureView's coaching text (top center) or its live model (bottom). Verify this on a device and adjust.

### 7.5 Room review sheet [P0]

This sheet appears after RoomPlan finishes processing a room. It's a sheet with `.presentationDetents([.medium])`, and interactive dismissal is disabled.

- **REV-1 [P0]** The room name is in an editable `TextField`, prefilled per §6.5.
- **REV-2 [P0]** The sheet shows the room's metrics: floor area, perimeter, ceiling height, and counts of walls, doors, windows, and objects.
- **REV-3 [P0]** Actions:
  - **Scan Next Room** (primary): shows the "Walk to the next room" interstitial (REV-4).
  - **Finish** (secondary): opens the Save step (§7.6).
  - **Rescan This Room** (tertiary): deletes this room and starts capturing it again.
- **REV-4 [P0]** The "Walk to the next room" interstitial is an overlay on the camera view. It reads "Walk through a doorway into the next room, then tap Start." and has a **Start** button. The AR session keeps tracking while the user walks (§8.3).
- **REV-5 [P1]** If tracking was interrupted earlier in this session (§8.6), show a warning: *"Tracking was interrupted. Rooms scanned after this may not line up. Consider finishing now."*

### 7.6 Save location sheet [P0]

- **SAVE-1 [P0]** A name `TextField` is prefilled with the location's current name (§5.1 default).
- **SAVE-2 [P0]** The sheet shows a summary: the room count, the total area, and the list of room names.
- **SAVE-3 [P0]** Merging and finalizing (§8.5) **start in the background as soon as the sheet appears**. The **Save** button shows a spinner with the text "Building floor plan…" until processing completes, then becomes enabled.
- **SAVE-4 [P0]** On Save, the app persists the name, marks the location complete, dismisses the capture flow, and pushes `LocationDetailView` for the new location.

### 7.7 Location detail [P0]

```
┌──────────────────────────────────┐
│ ‹ Scans      Apartment     ⋯  ⇪  │
│ 84.2 m² · 3 rooms · Oct 16, 2026 │
│ [  Plan  |   3D   | Measurements ]│
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │       tab content            │ │
│ │                              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

- **DET-1 [P0]** Load `geometryJSON` and decode it **off the main thread**. While loading, show a `ProgressView`.
- **DET-2 [P0]** The header shows the total area, the room count, and the scan date. A segmented `Picker` switches between Plan, 3D, and Measurements. Remember the selected tab per app session.
- **DET-3 [P1]** The `⋯` menu has Rename and Delete (with a confirmation; on delete, pop back to Home). Share is described in §7.7.4.
- **DET-4 [P1]** If `merged == nil` and there is more than one room, show a small banner: *"Rooms couldn't be merged, so they're shown as captured."*

#### 7.7.1 Floor plan tab

- **PLAN-1 [P0]** Render `FloorPlanCanvas(style: .full)` as specified in §9.1, fitted to the available space.
- **PLAN-2 [P0]** Pinch to zoom (`MagnifyGesture`, clamped to 0.5×–8×), drag to pan, and double-tap to fit.
- **PLAN-3 [P0]** Wall length labels and room labels (the name and area) are visible.
- **PLAN-4 [P1]** A toolbar menu toggles **Dimensions** and **Furniture**.
- **PLAN-5 [P1]** Tapping a room hit-tests it with point-in-polygon in world space. The room is highlighted, and a callout shows its name, area, perimeter, and ceiling height. Tapping empty space clears the selection.
- **PLAN-6 [P1]** A scale bar in the bottom-leading corner shows 1 m (metric) or 3 ft (imperial).

#### 7.7.2 3D tab

- **3D-1 [P0]** Render a `SceneKitView` showing `SceneBuilder.makeScene(geometry)` (§9.2).
- **3D-2 [P0]** Orbit, zoom, and pan use SceneKit's built-in camera control in turntable mode.
- **3D-3 [P0]** A **Reset View** button restores the initial camera.
- **3D-4 [P1]** A **Furniture** toggle shows or hides objects.

#### 7.7.3 Measurements tab

A `List` with these sections:

1. **Summary:** total floor area, room count, footprint (W × L), and scan date.
2. **One section per room**, in capture order. The header is the room name. On [P1], a context menu on the header lets the user rename the room. Each section contains:
   - floor area (with a "≈" prefix if approximate), perimeter, and ceiling height;
   - a `DisclosureGroup` for each of: **Walls (n)** (`Wall 1: 3.42 m × 2.51 m`, as length × height), **Doors (n)** (width × height, marked "open" if open), **Windows (n)**, **Openings (n)**, and **Objects (n)** (category, W × D × H).

- **MEAS-1 [P0]** All values follow §6.6 and switch live when the unit setting changes.
- **MEAS-2 [P0]** Rows support Dynamic Type and have VoiceOver labels that speak the full value (for example, "Wall 1, 3.42 meters by 2.51 meters").

#### 7.7.4 Share and export [P1]

A toolbar `Menu` with `ShareLink` items:

- **Floor plan image (PNG):** rendered with `ImageRenderer` at 3× scale from `FloorPlanCanvas(style: .full)`, at 1600 pt on the longest side, on a white background.
- **Measurements (CSV):** columns `room,element,index,width_m,height_m,depth_m,area_m2`. Values are always in meters.
- **3D model (USDZ):** export into `FileManager.default.temporaryDirectory` with `.parametric` export options. Use `CapturedStructure.export(to:…)` when `structureJSON` exists. Otherwise, if the location has exactly one room with raw data, use `CapturedRoom.export(to:…)`. If neither applies, hide this item. Export only on a device; in the Simulator, hide the item.
- **[P2, DEBUG only]** Raw scan JSON (`structureJSON` and each room's `capturedRoomJSON`), used to collect real fixtures for tests (§15.1).

#### 7.7.5 Draft locations [P0]

When the location is a draft, the detail view shows a `ContentUnavailableView` with the title "This scan wasn't finished", the room count, and two actions:

- **Finish with N rooms:** runs §8.5 on the decoded `capturedRoomJSON` values, then shows the normal detail.
- **Delete.**

### 7.8 Settings [P1]

A `Form` containing:
- **Units:** a picker for Automatic, Metric, or Imperial.
- **About:** the app version and build, and the line "Scans are stored only on this device."

---

## 8. Capture pipeline

### 8.1 Components

- **`CaptureSessionController`** (`NSObject`, `@MainActor`) owns one `ARSession` and **one `RoomCaptureView` for the whole multi-room session**, created with `RoomCaptureView(frame: .zero, arSession: arSession)`. It acts as `RoomCaptureViewDelegate` (for processed results) and `RoomCaptureSessionDelegate` on `captureView.captureSession` (for live updates). It exposes callbacks or an `AsyncStream` of events to the view model.
- **`CaptureViewModel`** (`@Observable`, `@MainActor`) holds the state machine, the completed rooms, the live geometry, and the persistence calls.
- **`RoomCaptureContainer`** (`UIViewRepresentable`) embeds `controller.captureView`. It must not create a new view on updates.

> **Gotcha:** `RoomCaptureViewDelegate` (and in some SDKs `RoomCaptureSessionDelegate`) inherits from `NSCoding`. The conforming class must implement `required init?(coder:)` (return `nil` or call `fatalError`) and an empty `encode(with:)` **in the class body**.

> **Gotcha:** Delegate callbacks may not be annotated for the main actor. Declare them `nonisolated` and hop to the main actor with `Task { @MainActor in … }`. Use `MainActor.assumeIsolated` only where main-thread delivery is certain.

### 8.2 State machine

```
            ┌──────────────── cancel ─────────────────────────────────┐
            ▼                                                         │
idle ──► tips? ──► scanning(n) ──Done──► processing(n) ──► reviewing(n)│
                       ▲                                    │  │  │  │
                       │         Rescan (delete room n) ────┘  │  │  │
                       │                                       │  │  │
          waitingForNextRoom(n+1) ◄──── Scan Next Room ────────┘  │  │
                       │ Start                                    │  │
                       └──────────► scanning(n+1)                 │  │
                                                                  ▼  │
                                         saving (merge + finalize) ──► done
any state ──error──► failed(error, completedRooms)  (§11)
```

`n` is 1-based for display. `completedRooms: [(id: UUID, room: CapturedRoom)]` lives in the view model.

### 8.3 Per-room RoomPlan calls

| Step | Call / event |
|---|---|
| Start a room (first room, after Start, or after Rescan) | `captureView.captureSession.run(configuration: RoomCaptureSession.Configuration())` |
| User taps Done | `captureView.captureSession.stop(pauseARSession: false)`. **The AR session keeps running**, so the next room shares the same world coordinate frame. |
| RoomPlan asks to process | `captureView(shouldPresent:error:)` returns `true` (if `error` is non-nil, go to `failed`) |
| Processed room is available | `captureView(didPresent processedResult: CapturedRoom, error:)`: append it to `completedRooms`, **persist it immediately** (§10.2), and move to `reviewing` |
| Next room | The user walks to the next room while the AR session tracks. On **Start**, call `run(configuration:)` again on the same session. |
| End of the flow (save, cancel, or failure) | `captureView.captureSession.stop()` (this pauses the AR session), then `arSession.pause()` |

### 8.4 Live updates [P1]

- `captureSession(_:didUpdate room: CapturedRoom)` delivers in-progress results. Throttle these to **at most 4 Hz**. Map each one to a `RoomGeometry` on a background task with `RoomPlanMapping`, then publish it to the view model as `liveRoom`.
- The mini floor plan renders `completedRooms + [liveRoom]` with `planRotation` computed from the completed rooms only, so the plan doesn't spin while the user scans.
- **Risk:** setting `captureSession.delegate` on the session that `RoomCaptureView` owns is common practice, but verify on a device that RoomCaptureView's own visualization still updates. If it breaks, remove the live delegate. The mini plan then shows only completed rooms, and the readout shows only completed totals. Record this in NOTES.md.

### 8.5 Finishing: merge, map, and persist

The same function is used by the Save sheet and by "Finish with N rooms" on drafts:

```swift
func finalize(locationID: UUID, rooms: [(id: UUID, room: CapturedRoom)]) async throws {
    var structure: CapturedStructure? = nil
    if rooms.count > 1 {
        do {
            structure = try await StructureBuilder(options: [.beautifyObjects])
                .capturedStructure(from: rooms.map(\.room))
        } catch {
            Log.capture.error("StructureBuilder failed: \(error)")   // fall back to unmerged rooms
        }
    }
    let geometry = RoomPlanMapping.makeGeometry(rooms: rooms, structure: structure)  // pure; computes planRotation
    let thumbnail = await FloorPlanThumbnail.render(geometry)                         // §9.1, main actor
    try await repository.finalize(locationID: locationID, geometry: geometry,
                                  structure: structure, thumbnail: thumbnail)
}
```

- Mapping and encoding run off the main actor. `ImageRenderer` runs on the main actor.
- `repository.finalize` writes the payload, updates `roomCount`, `totalFloorArea`, `updatedAt`, and the thumbnail, sets `status = .complete`, and saves.
- `StructureBuilder` may not work in the Simulator. In that case, the fallback path applies automatically.

### 8.6 Lifecycle and interruptions

- **Background or foreground:** watch `scenePhase`. If the app goes to the background during `scanning`, set `trackingWasInterrupted = true` (this drives REV-5). On return, if RoomPlan reports an error for the current room, handle it as in §11. Otherwise scanning continues.
- **Memory:** completed rooms are already persisted, so no special handling is needed.
- **[P2]** If `ProcessInfo.thermalState` is `.serious` or worse, show a banner suggesting the user finish soon.

---

## 9. Rendering

### 9.1 `FloorPlanCanvas`

A single SwiftUI `Canvas` view, `FloorPlanCanvas(geometry:style:options:selection:)`, used in three places:

| Style | Used by | Labels | Interaction |
|---|---|---|---|
| `.full` | Plan tab, PNG export | wall lengths, room names and areas, scale bar | zoom, pan, tap (handled by the parent) |
| `.mini` | Live capture overlay | none | none |
| `.thumbnail` | Home row (rendered once to a PNG at 120×120 pt @3×) | none | none |

**`FloorPlanLayout`** (pure and unit-tested) maps world `(x, z)` to view points:
1. Rotate by `planRotation` around the origin.
2. Compute the bounds of all floor polygons, wall endpoints, and object footprints.
3. Scale uniformly to fit the view minus padding (24 pt for `.full`, 8 pt for `.mini` and `.thumbnail`), keep the aspect ratio, and center the result.
4. Apply the user's zoom and pan on top. It also provides the inverse mapping for hit-testing.

**Draw order:**
1. **Floors:** fill each room polygon with its room tint at about 15% opacity. Rooms cycle through a small palette of system colors. The selected room uses the accent color at 30%.
2. **Objects** (if enabled): the rotated footprint, with a 1 pt `secondary` stroke and a `quaternary` fill.
3. **Walls:** a stroke in the `primary` color with round caps. The visual thickness is 0.12 m in world units, with a minimum of 3 pt, because RoomPlan walls have zero thickness.
4. **Doors, windows, and openings:** first stroke their segment with the **background color**, slightly wider than the wall stroke, to cut a gap. Then draw:
   - **Door:** a 1.5 pt `secondary` line plus short jamb ticks at both ends. A swing arc is [P2].
   - **Window:** two thin parallel blue lines, offset ±0.03 m.
   - **Opening:** a dashed `secondary` line.
5. **Wall length labels** (`.full` only, and only for walls 0.5 m or longer): `caption2`, centered at the wall midpoint, offset 12 pt perpendicular to the wall. Rotate the text to the wall angle and keep it upright (if the angle is outside −90°…90°, add 180°). Skip labels that would collide with an already-drawn label's bounding box.
6. **Room labels:** the name in `caption` with semibold weight, and the area in `caption2` below it, at the label position.
7. **Scale bar** (`.full`).

For accessibility, the canvas is one element. Its label reads like "Floor plan, 3 rooms, 84.2 square meters", with the hint "See the Measurements tab for details."

### 9.2 `SceneBuilder` (SceneKit)

`SceneBuilder.makeScene(_ geometry: ScanGeometry, showObjects: Bool) -> SCNScene`, which is pure apart from SceneKit objects:

| Element | Geometry | Material |
|---|---|---|
| Wall | `SCNBox(width: w, height: h, length: 0.10, chamferRadius: 0)`, `node.simdTransform = transform.matrix` | light gray, opaque |
| Door | `SCNBox(w, h, 0.14)`, so it pokes through the wall | warm brown |
| Window | `SCNBox(w, h, 0.14)` | light blue, `transparency = 0.5` |
| Opening | not rendered | — |
| Object | `SCNBox(w, h, d)`, using `transform` | muted color by group (furniture, appliances, fixtures), `transparency = 0.9` |
| Floor | `SCNShape` built from a `UIBezierPath` of the polygon points **`(x, −z)`**, with `extrusionDepth = 0.02` and `eulerAngles.x = −π/2`, placed at y = the room's minimum wall base | room tint |

- **Floor orientation:** `SCNShape` is built in local XY. Rotating it by −90° about X maps local `(px, py, 0)` to world `(px, 0, −py)`, which is why the path uses `(x, −z)`.
- Use the `.blinn` lighting model, `autoenablesDefaultLighting = true`, an extra ambient light at intensity 400, and the system background color behind the scene.
- **Camera:** an orthographic or 45° FOV perspective camera looking at the bounding-box center from the direction `(1, 1.2, 1)`, at a distance of 1.6 × the largest extent. There are no ceilings, so the user can see into the rooms. Apply the plan rotation to the initial azimuth (P2).
- **`SceneKitView`:** `allowsCameraControl = true`, `defaultCameraController.interactionMode = .orbitTurntable`, and `maximumVerticalAngle = 89`. Reset sets `pointOfView` back to the initial camera node.
- Respect Reduce Motion: no animated camera transitions.
- **Note:** Apple deprecated SceneKit at WWDC25. It still ships and works on current iOS. All SceneKit code is isolated in `SceneBuilder` and `SceneKitView`, so a later move to RealityKit stays local to those files.

---

## 10. Persistence

### 10.1 Stack

- **`PersistenceController`:** an `NSPersistentContainer(name: "RoomScanner")`, with a `shared` instance and an `inMemory` initializer for previews and tests (store URL `/dev/null`).
  - `viewContext.automaticallyMergesChangesFromParent = true`
  - `viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy`
  - Lightweight migration stays enabled (the default).
- All writes go through **`LocationRepository`**, which uses `container.performBackgroundTask` or a dedicated background context. The UI reads with `@FetchRequest` and `viewContext`.

```swift
protocol LocationRepository {
    func createDraft(name: String) async throws -> UUID
    func appendRoom(locationID: UUID, roomID: UUID, index: Int, name: String,
                    capturedRoom: CapturedRoom, floorArea: Double) async throws
    func deleteRoom(roomID: UUID) async throws
    func renameRoom(roomID: UUID, to name: String) async throws
    func finalize(locationID: UUID, geometry: ScanGeometry, structure: CapturedStructure?,
                  thumbnail: Data?) async throws
    func loadGeometry(locationID: UUID) async throws -> ScanGeometry?
    func loadCapturedRooms(locationID: UUID) async throws -> [(id: UUID, room: CapturedRoom)]
    func rename(locationID: UUID, to name: String) async throws
    func delete(locationID: UUID) async throws
    func insertSample(_ geometry: ScanGeometry, name: String) async throws -> UUID   // DEBUG
}
```

The exact signatures are the agent's choice. The responsibilities are not.

### 10.2 Draft lifecycle

1. The draft `Location` is created **when the first room completes**, not when the scan starts, so no empty drafts are ever created.
2. Each completed room is written right away (`appendRoom`) with its raw `capturedRoomJSON`. If the app is killed, the completed rooms survive.
3. Rescan calls `deleteRoom`. Cancel with "Discard scan" calls `delete(locationID:)`.
4. `finalize` sets the location to complete (§8.5).
5. On launch, delete any drafts that have zero rooms (a defensive cleanup).
6. A draft can't continue scanning after the session ends, because the world coordinate frame is lost. It can only be finished or deleted (§7.7.5).

---

## 11. Errors and edge cases

| Situation | Behavior |
|---|---|
| Device has no LiDAR | HOME-4: New Scan disabled, with an explanation. |
| Camera permission denied or restricted | CAP-1: alert with Open Settings. |
| RoomPlan error on a room (from `shouldPresent`, `didPresent`, or the session's end delegate) | The review sheet shows the error's `localizedDescription` and offers **Rescan this room**, **Finish with N rooms** (if N ≥ 1), and **Discard**. |
| World tracking lost, or the scene is too large | Same as the previous row. For a too-large scene, suggest finishing the room sooner. |
| App backgrounded during a scan | §8.6: the interruption flag drives the REV-5 warning. |
| App killed during a scan | The draft is persisted. Home shows it as Incomplete, and the detail view offers Finish or Delete. |
| `StructureBuilder` throws | Save without merging (`merged = nil`). The detail shows the DET-4 banner. |
| Core Data save fails | Alert "Couldn't save scan" with **Retry**. Keep the data in memory and log the error. |
| `geometryJSON` missing, fails to decode, or has a newer version | The detail shows "Couldn't open this scan". If raw room data exists, offer **Rebuild**, which re-runs §8.5 mapping from the raw data. |
| Room without a floor surface | Convex-hull area marked "≈" (§6.3). |
| Room with no walls | The room still appears in Measurements; the plan shows only what exists. |
| Location with 0 rooms after a Rescan followed by Cancel | Delete the draft. |

Log every error with `os.Logger` (subsystem = bundle ID; categories `capture`, `persistence`, `geometry`, `ui`).

---

## 12. Non-functional requirements

- **Performance**
  - The Home list scrolls smoothly with 100 locations. Only small thumbnails load, never payloads.
  - The detail view shows content within 1 s for a 10-room location, with decoding off the main thread.
  - Floor plan pinch and pan stay at about 60 fps for 10 or fewer rooms.
  - Live mapping runs at 4 Hz or less, off the main thread.
- **Privacy**
  - No network calls, no analytics, and no third-party SDKs.
  - `NSCameraUsageDescription`: *"RoomScanner uses the camera and LiDAR scanner to measure rooms and build floor plans. Scans stay on your device."*
  - `PrivacyInfo.xcprivacy` declares no tracking and no collected data. It lists the required-reason API `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`, because the app uses `@AppStorage`.
- **Accessibility**
  - Dynamic Type is supported throughout, except inside the canvas.
  - Every control has a VoiceOver label. Home rows are combined into one element ("Apartment, scanned October 16, 3 rooms, 84 square meters").
  - Tap targets are at least 44 pt.
  - The canvas and 3D views have summary labels that point users to the Measurements tab.
  - Reduce Motion is respected.
- **Appearance:** light and dark mode, system colors, and SF Symbols.
- **Localization:** all user-facing strings are in `Localizable.xcstrings`, in English only.
- **Code quality**
  - No force unwraps outside tests and previews.
  - No `print`; use `Log`.
  - Every view has a `#Preview` that uses the in-memory store and `SampleGeometry`.

---

## 13. Project setup

### 13.1 `project.yml` (sketch)

```yaml
name: RoomScanner
options:
  bundleIdPrefix: com.example
  deploymentTarget:
    iOS: "17.0"
  createIntermediateGroups: true
settings:
  base:
    SWIFT_VERSION: "5.0"
    SWIFT_STRICT_CONCURRENCY: targeted
    CODE_SIGN_STYLE: Automatic
    DEVELOPMENT_TEAM: ""            # set locally for device builds
    MARKETING_VERSION: "1.0"
    CURRENT_PROJECT_VERSION: "1"
targets:
  RoomScanner:
    type: application
    platform: iOS
    sources: [RoomScanner]
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.example.RoomScanner
        TARGETED_DEVICE_FAMILY: "1"
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        ENABLE_PREVIEWS: YES
    info:
      path: RoomScanner/Resources/Info.plist
      properties:
        CFBundleDisplayName: RoomScanner
        NSCameraUsageDescription: "RoomScanner uses the camera and LiDAR scanner to measure rooms and build floor plans. Scans stay on your device."
        UILaunchScreen: {}
        UISupportedInterfaceOrientations: [UIInterfaceOrientationPortrait]
        UIApplicationSceneManifest:
          UIApplicationSupportsMultipleScenes: false
  RoomScannerTests:
    type: bundle.unit-test
    platform: iOS
    sources: [RoomScannerTests]
    dependencies:
      - target: RoomScanner
    settings:
      base:
        GENERATE_INFOPLIST_FILE: YES
schemes:
  RoomScanner:
    build:
      targets:
        RoomScanner: all
        RoomScannerTests: [test]
    test:
      targets: [RoomScannerTests]
      gatherCoverageData: true
```

If RoomPlan symbols aren't available when building for the Simulator SDK, guard the capture code with `#if !targetEnvironment(simulator)` and provide stubs, so the rest of the app still builds and runs in the Simulator. Record this in NOTES.md.

### 13.2 Core Data model file

`RoomScanner/Persistence/RoomScanner.xcdatamodeld/RoomScanner.xcdatamodel/contents` is plain XML. Write it by hand to match §5.1, with `codeGenerationType="class"` **omitted** (manual codegen) and `allowsExternalBinaryDataStorage="YES"` on the binary attributes.

### 13.3 Sample data (DEBUG, previews, and tests)

`SampleGeometry` provides fixtures built directly as `ScanGeometry`, with no RoomPlan types:

- **`twoRoomApartment()`**
  - A living room of 5.0 × 4.0 m and a bedroom of 3.5 × 4.0 m that share the wall at x = 5.0.
  - Walls are 2.5 m high.
  - A 0.9 × 2.0 m door in the shared wall, an entry door in the living room's south wall, and one window in each room.
  - A sofa, a table, and a bed.
  - `merged` is set, with the shared wall deduplicated.
- **`lShapedRoom()`**: floor polygon `(0,0) (4,0) (4,2) (2,2) (2,5) (0,5)`, with area **14.0 m²** and perimeter **18.0 m**.
- **`rotated(_ g: ScanGeometry, by radians: Float)`**: rotates every transform and polygon about +Y. It's used to test `planRotation`.

The DEBUG "Add sample location" action inserts `twoRoomApartment()` as a complete location with a rendered thumbnail. This makes Home, Detail, Plan, 3D, Measurements, and Share fully usable in the Simulator.

### 13.4 Build and test

```bash
cd ios-client
xcodegen generate
xcrun simctl list devices available          # pick an available iPhone simulator
xcodebuild -project RoomScanner.xcodeproj -scheme RoomScanner \
  -destination 'platform=iOS Simulator,name=<iPhone model>,OS=latest' \
  build test
```

### 13.5 README

`ios-client/README.md` covers:
- requirements (Xcode, XcodeGen, a LiDAR device for scanning),
- setup (`brew install xcodegen && xcodegen generate`),
- how to run on a device (set `DEVELOPMENT_TEAM`),
- the DEBUG sample-data menu,
- the manual device checklist from §15.2.

---

## 14. Implementation order

| Milestone | Contents | Verifiable in the Simulator? |
|---|---|---|
| **M1: Skeleton** | `project.yml`, app entry, Core Data model and stack, `LocationRepository`, Home (list, empty state, delete, rename), Settings (units), DEBUG menu stub | ✅ |
| **M2: Geometry** | `ScanGeometry`, `GeometryMath`, `RoomMetrics`, `UnitFormatting`, `SampleGeometry`, plan rotation, all unit tests in §15.1 | ✅ |
| **M3: Rendering and detail** | `FloorPlanLayout`, `FloorPlanCanvas` (all styles, including the thumbnail), `SceneBuilder`, `SceneKitView`, Location detail with all three tabs, DEBUG "Add sample location" working end to end | ✅ |
| **M4: Capture** | `CaptureSessionController`, `CaptureViewModel` state machine, `RoomCaptureContainer`, live overlay, review sheet, save sheet, `RoomPlanMapping`, draft persistence, finalize | ⚠️ builds only; needs a device to run |
| **M5: Polish** | Share and export, draft recovery UI, error handling (§11), accessibility pass, README, NOTES.md | ✅ (USDZ export needs a device) |

Commit at the end of each milestone, with a message such as `M2: geometry model, metrics and formatting`.

---

## 15. Testing

### 15.1 Unit tests (Swift Testing, Simulator)

| Suite | Cases |
|---|---|
| `GeometryMathTests` | The shoelace area of a 5×4 rectangle is 20.0. The L-shape has area 14.0 and perimeter 18.0. The result is the same for clockwise and counter-clockwise polygons. The centroid of a rectangle is its center. The convex hull of a point cloud is correct. Point-in-polygon works for points inside, outside, and in the L-shape's notch. |
| `SurfaceProjectionTests` | A wall 4 m wide, centered at (1, 1.25, 2) and rotated 90° about Y, has endpoints {(1, 0), (1, 4)} (compare as an unordered set). An object's footprint corners are correct after rotation. |
| `PlanRotationTests` | After `rotated(twoRoomApartment(), by: 30°)`, applying the computed `planRotation` puts every wall direction within 0.5° of 0° or 90°. With no walls, the rotation is 0. |
| `RoomMetricsTests` | Ceiling height is the maximum wall height. Total area is the sum of the rooms. The footprint W × L of the sample apartment is 8.5 × 4.0 m. An approximate floor sets the flag. |
| `UnitFormattingTests` | All test vectors in §6.6, plus the automatic unit system resolving by locale (`en_US` → imperial, `es_EC` → metric). |
| `ScanGeometryCodingTests` | An encode/decode round trip is equal. An unknown `ObjectCategory` raw value decodes to `.other`. A newer `version` is detected. |
| `FloorPlanLayoutTests` | Fitted bounds lie inside the view rect minus padding. The aspect ratio is preserved. The layout is centered. `inverse(apply(p)) ≈ p`. |
| `LocationRepositoryTests` (in-memory) | Create a draft, append 2 rooms, finalize, then fetch: the status is complete, and the counts and area are correct. Rename works. Delete cascades (no `Room` or `LocationPayload` rows remain). Launch cleanup removes drafts with zero rooms. |

**Real fixtures [P2]:** after the first device scan, use the DEBUG raw JSON export (§7.7.4) to add a `CapturedRoom` JSON fixture to the tests, plus a test that `RoomPlanMapping` produces a non-empty floor polygon that overlaps the walls.

### 15.2 Manual device checklist (add to the README)

1. On a device without LiDAR, New Scan is disabled with an explanation, and saved scans can still be browsed.
2. Denying camera permission shows the Open Settings alert.
3. Scan one room and tap Done. The review sheet shows a plausible area. Measure one wall with a tape measure: the app's value is within a few cm.
4. Scan three rooms with Scan Next Room. The mini plan updates live, and the final plan shows all three rooms aligned and connected through their doors.
5. The floor polygon fills sit exactly inside the walls (this validates §6.3).
6. Force-quit the app after room 2. On relaunch, the location shows Incomplete, and Finish with 2 rooms produces a valid plan.
7. Rescan This Room replaces the room. Cancel offers Save, Discard, or Keep scanning.
8. Backgrounding the app during a scan shows the REV-5 warning on the next review.
9. 3D view: orbit, zoom, Reset View, and the Furniture toggle all work.
10. Share each format: the PNG opens in Photos, the CSV opens in Numbers, and the USDZ opens in Quick Look.
11. Switching units in Settings updates the Measurements tab and the plan labels immediately.
12. VoiceOver can read the Home rows and the Measurements tab.

---

## 16. Definition of Done

- [ ] `xcodegen generate` followed by `xcodebuild … build test` succeeds on an iOS Simulator. The build has no errors, and the `Geometry/` and `Persistence/` code has no warnings.
- [ ] Every [P0] requirement is implemented. Every [P1] requirement is implemented or listed in `NOTES.md` with a reason.
- [ ] All unit tests in §15.1 pass.
- [ ] In the Simulator with a DEBUG build, Home → Add sample location → Detail renders the Plan, 3D, and Measurements tabs correctly in light and dark mode, and units switch correctly.
- [ ] The device-only capture code compiles, and the pipeline follows §8 as written.
- [ ] `README.md` includes the setup steps and the §15.2 checklist. `NOTES.md` lists the deviations, the open risks, and anything left unverified because no device was available.
- [ ] No third-party dependencies, no networking, and the privacy manifest is present.

---

## 17. Risks and open questions

**Risks**

| Risk | Mitigation |
|---|---|
| RoomPlan API details here come from the iOS 17 SDK and may have changed. | Follow the installed SDK headers and record differences in NOTES.md. |
| Setting a live delegate on RoomCaptureView's session may interfere with its own UI. | Fallback in §8.4. |
| Floor `polygonCorners` axis conventions are unverified. | §6.3 fallbacks, plus checklist item 5. |
| Merge quality depends on uninterrupted tracking, so rooms may be misaligned after an interruption. | REV-5 warning and the unmerged fallback. |
| SceneKit is deprecated. | Isolated in two files; migrate to RealityKit later. |
| The capture flow can't be tested in CI or the Simulator. | All other logic is pure and tested. A manual checklist covers the rest. |

**Open questions for the product owner.** None of these block v1.

1. Should users be able to add rooms to an existing location on another day? This needs ARWorldMap persistence and relocalization.
2. Is multi-story support needed (story selector, stacked floor plans)?
3. Which export formats matter most? A PDF floor plan with a dimensions sheet could be a future addition.
4. Should scans eventually sync with the `api/` backend?

---

## Appendix A: RoomPlan quick reference (iOS 17)

Verify each item against the installed SDK.

| API | Use |
|---|---|
| `RoomCaptureSession.isSupported` | LiDAR or device support check |
| `RoomCaptureView(frame:arSession:)` | Capture view with coaching and live 3D, sharing a caller-owned `ARSession` |
| `RoomCaptureView.captureSession` | The underlying `RoomCaptureSession` |
| `RoomCaptureSession.run(configuration:)` | Start capturing a room |
| `RoomCaptureSession.stop(pauseARSession: false)` | End a room but keep tracking (multi-room) |
| `RoomCaptureSession.stop()` | End and pause the AR session |
| `RoomCaptureViewDelegate.captureView(shouldPresent:error:) -> Bool` | Return `true` to let the view process and present the room |
| `RoomCaptureViewDelegate.captureView(didPresent:error:)` | Receive the processed `CapturedRoom` |
| `RoomCaptureSessionDelegate.captureSession(_:didUpdate:)` | Live in-progress `CapturedRoom` |
| `StructureBuilder(options: [.beautifyObjects]).capturedStructure(from:) async throws` | Merge `[CapturedRoom]` into a `CapturedStructure` |
| `CapturedRoom.walls / doors / windows / openings / floors` | `[CapturedRoom.Surface]` |
| `CapturedRoom.objects` | `[CapturedRoom.Object]` |
| `CapturedRoom.sections` | Room-type labels (`label`, `center`) |
| `CapturedRoom.identifier`, `.story` | Room ID and story index |
| `Surface.category` | `.wall`, `.door(isOpen:)`, `.window`, `.opening`, `.floor` |
| `Surface.dimensions`, `.transform`, `.polygonCorners`, `.identifier`, `.confidence` | Geometry |
| `Object.category`, `.dimensions`, `.transform`, `.identifier` | Geometry |
| `CapturedStructure.rooms / walls / doors / windows / openings / objects` | Merged result |
| `CapturedRoom.export(to:…)`, `CapturedStructure.export(to:…)` with `.parametric` | USDZ export |
| `CapturedRoom` and `CapturedStructure` conform to `Codable` | Raw persistence |
