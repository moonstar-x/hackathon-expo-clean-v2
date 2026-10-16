export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export interface Transform { c0: Vec4; c1: Vec4; c2: Vec4; c3: Vec4 }
export interface Surface { id: string; kind: 'wall' | 'door' | 'window' | 'opening'; transform: Transform; dimensions: Vec3; isOpen?: boolean | null }
export interface ScanObject { id: string; category: string; transform: Transform; dimensions: Vec3 }
export interface RenderSource { walls: Surface[]; doors: Surface[]; windows: Surface[]; openings: Surface[]; objects: ScanObject[] }
export interface GeometryRoom extends RenderSource { id: string; detectedType?: string | null; floorPolygon: Vec2[]; isFloorApproximate: boolean; labelPosition?: Vec2 | null }
export interface ScanGeometry { version: number; rooms: GeometryRoom[]; merged?: RenderSource | null; planRotation: number }
export class GeometryError extends Error {
  readonly reason: 'invalid' | 'unsupported version';
  constructor(reason: 'invalid' | 'unsupported version') {
    super(reason === 'unsupported version' ? 'Esta versión de geometría aún no es compatible.' : 'No se pudieron leer los datos de geometría.');
    this.reason = reason;
  }
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const vector = (v: unknown, n: number) => Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));
function element(v: unknown, isObject = false): boolean {
  if (!object(v) || typeof v.id !== 'string' || !vector(v.dimensions, 3) || (v.dimensions as number[]).some((x) => x < 0) || !object(v.transform)) return false;
  if (!['c0', 'c1', 'c2', 'c3'].every((k) => vector((v.transform as Record<string, unknown>)[k], 4))) return false;
  return isObject ? typeof v.category === 'string' : ['wall', 'door', 'window', 'opening'].includes(String(v.kind)) && (v.isOpen == null || typeof v.isOpen === 'boolean');
}
function source(v: unknown): boolean {
  return object(v) && ['walls', 'doors', 'windows', 'openings', 'objects'].every((k) => Array.isArray(v[k]) && (v[k] as unknown[]).every((e) => element(e, k === 'objects')));
}
export function parseGeometry(json: unknown): ScanGeometry {
  const v: unknown = typeof json === 'string' ? (() => { try { return JSON.parse(json); } catch { throw new GeometryError('invalid'); } })() : json;
  if (!object(v) || !Number.isInteger(v.version) || Number(v.version) < 1) throw new GeometryError('invalid');
  if (Number(v.version) > 1) throw new GeometryError('unsupported version');
  if (typeof v.planRotation !== 'number' || !Number.isFinite(v.planRotation) || !Array.isArray(v.rooms) || !v.rooms.length || !v.rooms.every((r: unknown) => object(r) && typeof r.id === 'string' && typeof r.isFloorApproximate === 'boolean' && Array.isArray(r.floorPolygon) && r.floorPolygon.every((p) => vector(p, 2)) && (r.labelPosition == null || vector(r.labelPosition, 2)) && source(r)) || (v.merged != null && !source(v.merged))) throw new GeometryError('invalid');
  return v as unknown as ScanGeometry;
}
export function renderSource(g: ScanGeometry): RenderSource {
  if (g.merged) return g.merged;
  return { walls: g.rooms.flatMap((r) => r.walls), doors: g.rooms.flatMap((r) => r.doors), windows: g.rooms.flatMap((r) => r.windows), openings: g.rooms.flatMap((r) => r.openings), objects: g.rooms.flatMap((r) => r.objects) };
}
export function transformPoint(t: Transform, [x, y, z]: Vec3): Vec3 {
  return [0, 1, 2].map((i) => t.c0[i] * x + t.c1[i] * y + t.c2[i] * z + t.c3[i]) as Vec3;
}
export function planSegment(s: Surface): { start: Vec2; end: Vec2 } {
  const project = (x: number): Vec2 => { const p = transformPoint(s.transform, [x, 0, 0]); return [p[0], p[2]]; };
  return { start: project(-s.dimensions[0] / 2), end: project(s.dimensions[0] / 2) };
}
export function objectFootprint(o: ScanObject): Vec2[] {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => { const p = transformPoint(o.transform, [x * o.dimensions[0] / 2, 0, z * o.dimensions[2] / 2]); return [p[0], p[2]]; });
}
export function bounds(points: Vec2[]): { min: Vec2; max: Vec2 } | null {
  if (!points.length) return null;
  return { min: [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))], max: [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))] };
}
