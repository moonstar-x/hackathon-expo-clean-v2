// The JSON that Swift's JSONEncoder writes for RoomScanner's ScanGeometry (SPEC-001 §5.2, SPEC-004 §6.2).
// SIMD values are arrays, and a transform is the four columns of a 4 × 4 matrix. Optional values are
// left out when they're nil; null is read the same way.

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

/** The columns of a 4 × 4 matrix, as simd_float4x4 stores them (column-major). */
export interface Transform {
  c0: Vec4;
  c1: Vec4;
  c2: Vec4;
  c3: Vec4;
}

export type SurfaceKind = 'wall' | 'door' | 'window' | 'opening';

/** A wall, door, window or opening: width × height × depth, in meters, placed by its transform. */
export interface Surface {
  id: string;
  kind: SurfaceKind;
  transform: Transform;
  dimensions: Vec3;
  isOpen?: boolean | null;
}

/** A piece of furniture or a fixture: width × height × depth, in meters. */
export interface ScanObject {
  id: string;
  category: string;
  transform: Transform;
  dimensions: Vec3;
}

/** Everything the 3D view draws, apart from the floors. */
export interface RenderSource {
  walls: Surface[];
  doors: Surface[];
  windows: Surface[];
  openings: Surface[];
  objects: ScanObject[];
}

export interface GeometryRoom extends RenderSource {
  id: string;
  detectedType?: string | null;
  /** The floor's corners as [x, z]. */
  floorPolygon: Vec2[];
  isFloorApproximate: boolean;
  labelPosition?: Vec2 | null;
}

export interface ScanGeometry {
  version: number;
  rooms: GeometryRoom[];
  /** The rooms' surfaces joined into one structure, when the phone could join them. */
  merged?: RenderSource | null;
  /** Turns the model square to the screen, like the plan (radians about Y). */
  planRotation: number;
}

/** Why a geometry file can't be shown: it can't be read, or a newer app wrote it. */
export type GeometryErrorReason = 'invalid' | 'unsupportedVersion';

/** The parts of a room that the Medidas tab lists, in this order. */
export type RoomPart = 'walls' | 'doors' | 'windows' | 'openings' | 'objects';

/** The materials of the 3D view. */
export type SceneMaterial = 'wall' | 'door' | 'window' | 'furniture' | 'appliance' | 'fixture';

export interface SceneOptions {
  /** Adds furniture and fixtures to the scene. */
  showObjects: boolean;
}
