import * as THREE from 'three';
import { expect, it } from 'vitest';
import fixture from './__fixtures__/two-room-apartment.geometry.json';
import { buildScene, disposeGroup } from './buildScene';
import { parseGeometry, renderSource } from './geometry';
it('builds the expected meshes, matrices, positions and furniture visibility without WebGL', () => {
  const g = parseGeometry(fixture); g.planRotation = 0.3;
  const src = renderSource(g), group = buildScene(g, { showObjects: true });
  expect(group.children).toHaveLength(src.walls.length + src.doors.length + src.windows.length + src.objects.length + 2);
  const c = Math.cos(0.3), s = Math.sin(0.3);
  expect(group.matrix.elements).toEqual([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]);
  const noRotation = buildScene({ ...g, planRotation: 0 }, { showObjects: false });
  expect(noRotation.children).toHaveLength(group.children.length - src.objects.length);
  const position = noRotation.children[0].getWorldPosition(new THREE.Vector3());
  expect(position.toArray()).toEqual(src.walls[0].transform.c3.slice(0, 3));
  disposeGroup(group); disposeGroup(noRotation);
});
