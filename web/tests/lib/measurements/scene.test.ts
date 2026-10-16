import { Vector3, type Group, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { SCENE_COLORS } from '../../../src/constants/measurements';
import type { RenderSource, ScanGeometry } from '../../../src/types/geometry';
import { parseGeometry, renderSource } from '../../../src/utils/geometry';
import { buildScene, disposeGroup, objectColor, setObjectsVisible } from '../../../src/utils/scene';
import fixture from '../../fixtures/two-room-apartment.geometry.json';

// buildScene is pure three.js, so the model is checked here without WebGL (SPEC-004 §6.7).
const geometry: ScanGeometry = { ...parseGeometry(fixture), planRotation: 0.3 };
const source: RenderSource = renderSource(geometry);
const drawn: number = source.walls.length + source.doors.length + source.windows.length;

describe('buildScene', () => {
  it('draws walls, doors, windows, objects and one floor per room', (): void => {
    const group: Group = buildScene(geometry, { showObjects: true });
    expect(group.children).toHaveLength(drawn + source.objects.length + geometry.rooms.length);
    disposeGroup(group);
  });

  it('turns the whole model by the plan rotation', (): void => {
    const group: Group = buildScene(geometry, { showObjects: true });
    const c: number = Math.cos(0.3);
    const s: number = Math.sin(0.3);
    expect(group.matrix.elements).toEqual([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]);
    disposeGroup(group);
  });

  it('places each wall by its own transform', (): void => {
    const group: Group = buildScene({ ...geometry, planRotation: 0 }, { showObjects: false });
    expect(group.children).toHaveLength(drawn + geometry.rooms.length);
    const position: Vector3 = group.children[0].getWorldPosition(new Vector3());
    expect(position.toArray()).toEqual(source.walls[0].transform.c3.slice(0, 3));
    disposeGroup(group);
  });
});

describe('the furniture toggle', () => {
  it('hides and shows the objects of a built scene, and only them', (): void => {
    const group: Group = buildScene(geometry, { showObjects: true });
    const visible = (): number => group.children.filter((child: Object3D): boolean => child.visible).length;
    setObjectsVisible(group, false);
    expect(visible()).toBe(drawn + geometry.rooms.length);
    setObjectsVisible(group, true);
    expect(visible()).toBe(group.children.length);
    disposeGroup(group);
  });

  it('colors objects by the iPhone app’s groups', (): void => {
    expect(objectColor('sofa')).toBe(SCENE_COLORS.furniture);
    expect(objectColor('oven')).toBe(SCENE_COLORS.appliance);
    expect(objectColor('toilet')).toBe(SCENE_COLORS.fixture);
    expect(objectColor('somethingNew')).toBe(SCENE_COLORS.fixture);
  });
});
