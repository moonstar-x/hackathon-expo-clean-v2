// Reading RoomScanner's geometry JSON, and the plan helpers ported from the iPhone app
// (SPEC-001 §5.2 and §6.2, SPEC-004 §6.2).
import { GEOMETRY_VERSION } from '../constants/measurements';
import type {
  GeometryErrorReason,
  RenderSource,
  ScanGeometry,
  ScanObject,
  Surface,
  Transform,
  Vec2,
  Vec3,
} from '../types/geometry';

/** A geometry file the admin can't show; `reason` says why. */
export class GeometryError extends Error {
  readonly reason: GeometryErrorReason;

  constructor(reason: GeometryErrorReason) {
    super(reason === 'unsupportedVersion' ? 'Unsupported geometry version' : 'Invalid geometry');
    this.name = 'GeometryError';
    this.reason = reason;
  }
}

const TRANSFORM_COLUMNS: (keyof Transform)[] = ['c0', 'c1', 'c2', 'c3'];
const SURFACE_KINDS: string[] = ['wall', 'door', 'window', 'opening'];
const SURFACE_LISTS: (keyof RenderSource)[] = ['walls', 'doors', 'windows', 'openings'];

const isMissing = (value: unknown): value is null | undefined => value === null || value === undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isVector = (value: unknown, length: number): boolean =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((n: unknown): boolean => typeof n === 'number' && Number.isFinite(n));

const isListOf = (value: unknown, check: (item: unknown) => boolean): boolean => Array.isArray(value) && value.every(check);

/** Something placed in the room: an id, non-negative dimensions and a full transform. */
const isPlaced = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  isVector(value.dimensions, 3) &&
  (value.dimensions as number[]).every((n: number): boolean => n >= 0) &&
  isRecord(value.transform) &&
  TRANSFORM_COLUMNS.every((column: keyof Transform): boolean => isVector((value.transform as Record<string, unknown>)[column], 4));

const isSurface = (value: unknown): boolean =>
  isPlaced(value) &&
  SURFACE_KINDS.includes(String(value.kind)) &&
  (isMissing(value.isOpen) || typeof value.isOpen === 'boolean');

const isScanObject = (value: unknown): boolean => isPlaced(value) && typeof value.category === 'string';

const isRenderSource = (value: unknown): boolean =>
  isRecord(value) &&
  SURFACE_LISTS.every((list: keyof RenderSource): boolean => isListOf(value[list], isSurface)) &&
  isListOf(value.objects, isScanObject);

const isPoint = (value: unknown): boolean => isVector(value, 2);

const isRoom = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.isFloorApproximate === 'boolean' &&
  isListOf(value.floorPolygon, isPoint) &&
  (isMissing(value.labelPosition) || isPoint(value.labelPosition)) &&
  isRenderSource(value);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeometryError('invalid');
  }
};

/**
 * Checks the parts of the geometry the admin uses and returns it typed. Throws a GeometryError for
 * anything else, including a version newer than this admin reads.
 */
export const parseGeometry = (json: unknown): ScanGeometry => {
  const value: unknown = typeof json === 'string' ? parseJson(json) : json;
  if (!isRecord(value) || !Number.isInteger(value.version) || Number(value.version) < 1) {
    throw new GeometryError('invalid');
  }
  if (Number(value.version) > GEOMETRY_VERSION) throw new GeometryError('unsupportedVersion');
  const valid: boolean =
    typeof value.planRotation === 'number' &&
    Number.isFinite(value.planRotation) &&
    Array.isArray(value.rooms) &&
    value.rooms.length > 0 &&
    value.rooms.every(isRoom) &&
    (isMissing(value.merged) || isRenderSource(value.merged));
  if (!valid) throw new GeometryError('invalid');
  return value as unknown as ScanGeometry;
};

/** What the 3D view draws: the merged surfaces when the phone joined the rooms, otherwise every room's own. */
export const renderSource = (geometry: ScanGeometry): RenderSource => {
  if (geometry.merged) return geometry.merged;
  return {
    walls: geometry.rooms.flatMap((room: RenderSource): Surface[] => room.walls),
    doors: geometry.rooms.flatMap((room: RenderSource): Surface[] => room.doors),
    windows: geometry.rooms.flatMap((room: RenderSource): Surface[] => room.windows),
    openings: geometry.rooms.flatMap((room: RenderSource): Surface[] => room.openings),
    objects: geometry.rooms.flatMap((room: RenderSource): ScanObject[] => room.objects),
  };
};

/** A point moved by a column-major transform. */
export const transformPoint = (transform: Transform, [x, y, z]: Vec3): Vec3 =>
  [0, 1, 2].map(
    (i: number): number => transform.c0[i] * x + transform.c1[i] * y + transform.c2[i] * z + transform.c3[i],
  ) as Vec3;

/** Where a wall, door or window runs on the plan, as [x, z] end points. */
export const planSegment = (surface: Surface): { start: Vec2; end: Vec2 } => {
  const project = (x: number): Vec2 => {
    const point: Vec3 = transformPoint(surface.transform, [x, 0, 0]);
    return [point[0], point[2]];
  };
  return { start: project(-surface.dimensions[0] / 2), end: project(surface.dimensions[0] / 2) };
};

/** The corners of an object's footprint on the plan, as [x, z]. */
export const objectFootprint = (object: ScanObject): Vec2[] =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, z]: number[]): Vec2 => {
    const point: Vec3 = transformPoint(object.transform, [
      (x * object.dimensions[0]) / 2,
      0,
      (z * object.dimensions[2]) / 2,
    ]);
    return [point[0], point[2]];
  });

/** The smallest box around some plan points, or null for none. */
export const bounds = (points: Vec2[]): { min: Vec2; max: Vec2 } | null => {
  if (points.length === 0) return null;
  const xs: number[] = points.map((point: Vec2): number => point[0]);
  const zs: number[] = points.map((point: Vec2): number => point[1]);
  return { min: [Math.min(...xs), Math.min(...zs)], max: [Math.max(...xs), Math.max(...zs)] };
};

/** A plan point turned like the 3D model (SPEC-004 §6.2), as SVG x and y. */
export const turnPoint = (rotation: number) => ([x, z]: Vec2): Vec2 => [Math.cos(rotation) * x - Math.sin(rotation) * z, Math.sin(rotation) * x + Math.cos(rotation) * z];

/** The average of some plan points: where a room's label goes when the scan has none. */
export const centroid = (points: Vec2[]): Vec2 => [points.reduce((n: number, p: Vec2): number => n + p[0], 0) / points.length, points.reduce((n: number, p: Vec2): number => n + p[1], 0) / points.length];

/** Plan points as an SVG polygon's `points`. */
export const svgPoints = (points: Vec2[]): string => points.map(([x, y]: Vec2): string => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
