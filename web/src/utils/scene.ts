// The three.js model of a measurement (SPEC-004 WEB-3D-1), built as SPEC-001 §9.2 builds it on the
// iPhone. Pure, so it can be tested without WebGL. Only the lazily loaded 3D viewer imports this file,
// which keeps three.js out of the main bundle.
import {
  BoxGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
  type Material,
  type Object3D,
} from 'three';
import {
  APPLIANCE_CATEGORIES,
  FLOOR_OPACITY,
  FURNITURE_CATEGORIES,
  OBJECT_OPACITY,
  OPENING_DEPTH,
  SCENE_COLORS,
  WALL_DEPTH,
  WINDOW_OPACITY,
} from '../constants/measurements';
import type { GeometryRoom, RenderSource, ScanGeometry, ScanObject, SceneOptions, Surface, Transform, Vec2 } from '../types/geometry';
import { renderSource } from './geometry';
import { roomTint } from './measurements';

/** Marks the meshes of furniture and fixtures, so the viewer can hide them without rebuilding the scene. */
const OBJECT_MESH: string = 'object';

const matrixOf = (transform: Transform): Matrix4 =>
  new Matrix4().fromArray([...transform.c0, ...transform.c1, ...transform.c2, ...transform.c3]);

/** The color of an object, by the group the iPhone app puts its category in (ObjectCategory.group). */
export const objectColor = (category: string): string => {
  if (FURNITURE_CATEGORIES.includes(category)) return SCENE_COLORS.furniture;
  if (APPLIANCE_CATEGORIES.includes(category)) return SCENE_COLORS.appliance;
  return SCENE_COLORS.fixture;
};

/** A box as wide and tall as the element, `depth` deep, placed by the element's own transform. */
const box = (element: Surface | ScanObject, depth: number, color: string, opacity: number = 1): Mesh => {
  const mesh: Mesh = new Mesh(
    new BoxGeometry(element.dimensions[0], element.dimensions[1], depth),
    new MeshStandardMaterial({ color, opacity, transparent: opacity < 1 }),
  );
  mesh.matrix.copy(matrixOf(element.transform));
  mesh.matrixAutoUpdate = false;
  mesh.name = element.id;
  return mesh;
};

/** A room's floor: its polygon in the room's tint, laid flat at the base of its lowest wall. */
const floor = (room: GeometryRoom, tint: string): Mesh => {
  const shape: Shape = new Shape(room.floorPolygon.map(([x, z]: Vec2): Vector2 => new Vector2(x, -z)));
  const mesh: Mesh = new Mesh(
    new ShapeGeometry(shape),
    new MeshStandardMaterial({ color: tint, transparent: true, opacity: FLOOR_OPACITY, side: DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y =
    room.walls.length > 0
      ? Math.min(...room.walls.map((wall: Surface): number => wall.transform.c3[1] - wall.dimensions[1] / 2))
      : 0;
  return mesh;
};

/**
 * Walls, doors, windows, objects (when `showObjects`) and floors, in that order, in one group turned
 * by the plan rotation so the model starts square to the screen, like the plan. Openings aren't drawn.
 */
export const buildScene = (geometry: ScanGeometry, { showObjects }: SceneOptions): Group => {
  const group: Group = new Group();
  const c: number = Math.cos(geometry.planRotation);
  const s: number = Math.sin(geometry.planRotation);
  group.matrix.fromArray([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]);
  group.matrixAutoUpdate = false;

  const source: RenderSource = renderSource(geometry);
  source.walls.forEach((wall: Surface): void => {
    group.add(box(wall, WALL_DEPTH, SCENE_COLORS.wall));
  });
  source.doors.forEach((door: Surface): void => {
    group.add(box(door, OPENING_DEPTH, SCENE_COLORS.door));
  });
  source.windows.forEach((pane: Surface): void => {
    group.add(box(pane, OPENING_DEPTH, SCENE_COLORS.window, WINDOW_OPACITY));
  });
  if (showObjects) {
    source.objects.forEach((object: ScanObject): void => {
      const mesh: Mesh = box(object, object.dimensions[2], objectColor(object.category), OBJECT_OPACITY);
      mesh.userData.kind = OBJECT_MESH;
      group.add(mesh);
    });
  }
  geometry.rooms.forEach((room: GeometryRoom, index: number): void => {
    if (room.floorPolygon.length >= 3) group.add(floor(room, roomTint(index)));
  });

  group.updateMatrixWorld(true);
  return group;
};

/** Shows or hides the furniture and fixtures of a scene built with `showObjects`. */
export const setObjectsVisible = (group: Group, visible: boolean): void => {
  group.children.forEach((child: Object3D): void => {
    if (child.userData.kind === OBJECT_MESH) child.visible = visible;
  });
};

/** three's own flag, which narrows to Mesh as built here; `instanceof` would narrow to Mesh<any, any>. */
const isMesh = (node: Object3D): node is Mesh => (node as Mesh).isMesh === true;

/** Frees the GPU memory of a scene's geometries and materials. */
export const disposeGroup = (group: Group): void => {
  group.traverse((node: Object3D): void => {
    if (!isMesh(node)) return;
    node.geometry.dispose();
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material: Material): void => material.dispose());
  });
};
