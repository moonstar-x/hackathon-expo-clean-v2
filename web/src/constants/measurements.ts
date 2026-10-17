import type { SortPayload } from 'react-admin';
import type { MeasurementFileKind, RoomCountField, RoomType } from '../types/api';
import type { RoomPart, SceneMaterial, Vec3 } from '../types/geometry';

/** Newest uploads first, as the API sorts them by default (SPEC-004 §4.4). */
export const MEASUREMENT_SORT: SortPayload = { field: 'createdAt', order: 'DESC' };
export const MEASUREMENT_PER_PAGE: number = 25;

/** How a measurement gets here, taught by the empty list: scan, save, and the app uploads it (SPEC-004 SYNC-1). */
export const MEASUREMENT_EMPTY_STEPS: string[] = [
  'app.empty.measurements.steps.scan',
  'app.empty.measurements.steps.save',
  'app.empty.measurements.steps.upload',
];

/** Fields the API can sort measurements by that the phone list offers (api/src/modules/measurements). */
export const MEASUREMENT_SORT_FIELDS: string[] = ['createdAt', 'scannedAt', 'name', 'totalFloorArea', 'roomCount'];

/** The order the Archivos tab lists a measurement's files in (SPEC-004 §6.5). */
export const MEASUREMENT_FILE_KINDS: MeasurementFileKind[] = ['floorPlan', 'thumbnail', 'geometry', 'model', 'csv', 'raw'];

/** Side of a list thumbnail, in px (SPEC-004 §6.4). */
export const THUMBNAIL_SIZE: number = 48;

/** The newest geometry format this admin can read; a newer one shows an error in the 3D tab. */
export const GEOMETRY_VERSION: number = 1;

/** Room types with a Spanish name under app.measurements.roomTypes. */
export const ROOM_TYPES: RoomType[] = ['bedroom', 'bathroom', 'kitchen', 'livingRoom', 'diningRoom'];

/** Object categories with a Spanish name under app.measurements.categories; any other is "Objeto". */
export const OBJECT_CATEGORIES: string[] = [
  'storage',
  'refrigerator',
  'stove',
  'bed',
  'sink',
  'washerDryer',
  'toilet',
  'bathtub',
  'oven',
  'dishwasher',
  'table',
  'sofa',
  'chair',
  'fireplace',
  'television',
  'stairs',
];

/** The parts of a room the Medidas tab lists, in order (SPEC-004 WEB-MEAS-2). */
export const ROOM_PARTS: RoomPart[] = ['walls', 'doors', 'windows', 'openings', 'objects'];

/** The room field that counts each part, shown before the geometry has loaded. */
export const ROOM_PART_COUNTS: Record<RoomPart, RoomCountField> = {
  walls: 'wallCount',
  doors: 'doorCount',
  windows: 'windowCount',
  openings: 'openingCount',
  objects: 'objectCount',
};

// The 3D view (SPEC-004 §6.5, WEB-3D-1 and WEB-3D-2). Its materials match the iPhone app's SceneKit
// scene rather than the admin theme, so a model looks the same on the phone and here.

export const SCENE_COLORS: Record<SceneMaterial, string> = {
  wall: '#DBDBDB',
  door: 'rgb(158,110,71)',
  window: 'rgb(158,209,255)',
  furniture: 'rgb(140,158,184)',
  appliance: 'rgb(158,173,158)',
  fixture: 'rgb(184,168,148)',
};

/** Object categories in the furniture and appliance groups of ObjectCategory.group; the rest are fixtures. */
export const FURNITURE_CATEGORIES: string[] = ['storage', 'bed', 'table', 'sofa', 'chair'];
export const APPLIANCE_CATEGORIES: string[] = ['refrigerator', 'stove', 'washerDryer', 'oven', 'dishwasher', 'television'];

/** Floor tints by room, in the order of SceneBuilder.roomTint on iOS. */
export const ROOM_TINTS: string[] = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#30B0C7', '#FFCC00', '#00C7BE'];

/** Depth of a wall, and of a door or window, in meters. Openings aren't drawn. */
export const WALL_DEPTH: number = 0.1;
export const OPENING_DEPTH: number = 0.14;

export const WINDOW_OPACITY: number = 0.5;
export const OBJECT_OPACITY: number = 0.9;
export const FLOOR_OPACITY: number = 0.6;

export const LIGHT_COLOR: string = '#FFFFFF';
export const AMBIENT_INTENSITY: number = 2;
export const DIRECTIONAL_INTENSITY: number = 3;
export const LIGHT_POSITION: Vec3 = [5, 10, 8];

/** The camera looks at the model's center from this direction, at this many times its largest side. */
export const CAMERA_FOV: number = 45;
export const CAMERA_DIRECTION: Vec3 = [1, 1.2, 1];
export const CAMERA_DISTANCE: number = 1.6;

/** Shortest the 3D view gets, in px (WEB-3D-3). */
export const VIEWER_MIN_HEIGHT: number = 420;

/** Sharp on retina screens without rendering more pixels than that. */
export const MAX_PIXEL_RATIO: number = 2;

/** How long a downloaded file's object URL is kept, in ms; some browsers start the download after click() returns. */
export const DOWNLOAD_URL_LIFETIME: number = 1000;
