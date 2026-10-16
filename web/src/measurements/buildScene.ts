import * as THREE from 'three';
import { renderSource, type ScanGeometry, type ScanObject, type Surface, type Transform } from './geometry';
const matrix = (t: Transform) => new THREE.Matrix4().fromArray([...t.c0, ...t.c1, ...t.c2, ...t.c3]);
export function buildScene(geometry: ScanGeometry, { showObjects }: { showObjects: boolean }): THREE.Group {
  const group = new THREE.Group();
  const c = Math.cos(geometry.planRotation), s = Math.sin(geometry.planRotation);
  group.matrix.fromArray([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]); group.matrixAutoUpdate = false;
  function box(e: Surface | ScanObject, depth: number, color: string, opacity = 1) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(e.dimensions[0], e.dimensions[1], depth), new THREE.MeshStandardMaterial({ color, opacity, transparent: opacity < 1 }));
    mesh.matrix.copy(matrix(e.transform)); mesh.matrixAutoUpdate = false; mesh.name = e.id; group.add(mesh);
  }
  const src = renderSource(geometry);
  src.walls.forEach((e) => box(e, 0.10, '#DBDBDB'));
  src.doors.forEach((e) => box(e, 0.14, 'rgb(158,110,71)'));
  src.windows.forEach((e) => box(e, 0.14, 'rgb(158,209,255)', 0.5));
  if (showObjects) src.objects.forEach((e) => {
    const color = ['storage', 'bed', 'table', 'sofa', 'chair'].includes(e.category) ? 'rgb(140,158,184)' : ['refrigerator', 'stove', 'washerDryer', 'oven', 'dishwasher', 'television'].includes(e.category) ? 'rgb(158,173,158)' : 'rgb(184,168,148)';
    box(e, e.dimensions[2], color, 0.9);
  });
  const palette = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#30B0C7', '#FFCC00', '#00C7BE'];
  geometry.rooms.forEach((room, i) => {
    if (room.floorPolygon.length < 3) return;
    const shape = new THREE.Shape(room.floorPolygon.map(([x, z]) => new THREE.Vector2(x, -z)));
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: palette[i % palette.length], transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = room.walls.length ? Math.min(...room.walls.map((w) => w.transform.c3[1] - w.dimensions[1] / 2)) : 0;
    group.add(floor);
  });
  group.updateMatrixWorld(true);
  return group;
}
export function disposeGroup(group: THREE.Group) {
  group.traverse((node) => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); const materials = Array.isArray(node.material) ? node.material : [node.material]; materials.forEach((m: THREE.Material) => m.dispose()); } });
}
