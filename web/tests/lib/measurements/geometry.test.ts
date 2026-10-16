import { describe, expect, it } from 'vitest';
import type { ScanGeometry, ScanObject, Surface, Vec2 } from '../../../src/types/geometry';
import { bounds, GeometryError, objectFootprint, parseGeometry, planSegment, renderSource } from '../../../src/utils/geometry';
import fixture from '../../fixtures/two-room-apartment.geometry.json';

// The shared contract fixture (SPEC-004 §7): two rooms of 20 and 14 m², joined, 8.5 × 4 m.
const geometry: ScanGeometry = parseGeometry(fixture);

const reasonOf = (json: unknown): string | undefined => {
  try {
    parseGeometry(json);
    return undefined;
  } catch (error: unknown) {
    return error instanceof GeometryError ? error.reason : 'not a GeometryError';
  }
};

describe('parseGeometry', () => {
  it('reads the fixture the iPhone app writes, from JSON text too', (): void => {
    expect(geometry.rooms).toHaveLength(2);
    expect(parseGeometry(JSON.stringify(fixture)).rooms).toHaveLength(2);
  });

  it('refuses a newer version as unsupported, and anything malformed as invalid', (): void => {
    expect(reasonOf({ ...fixture, version: 2 })).toBe('unsupportedVersion');
    expect(reasonOf({ ...fixture, version: 0 })).toBe('invalid');
    expect(reasonOf({ ...fixture, planRotation: Infinity })).toBe('invalid');
    expect(reasonOf({ ...fixture, rooms: [] })).toBe('invalid');
    expect(reasonOf('not json')).toBe('invalid');
  });

  it('treats a null optional value like a missing one', (): void => {
    expect(parseGeometry({ ...fixture, merged: null }).merged).toBeNull();
  });
});

describe('renderSource', () => {
  it('uses the merged surfaces when the phone joined the rooms, each room’s own otherwise', (): void => {
    expect(renderSource(geometry).walls).toHaveLength(7);
    expect(renderSource({ ...geometry, merged: null }).walls).toHaveLength(8);
  });
});

describe('plan helpers', () => {
  it('projects a turned wall onto the plan', (): void => {
    const wall: Surface = geometry.rooms[0].walls[1];
    expect(planSegment(wall)).toEqual({ start: [5, 0], end: [5, 4] });
  });

  it('measures an object’s footprint', (): void => {
    const object: ScanObject = geometry.rooms[0].objects[0];
    const box: { min: Vec2; max: Vec2 } | null = bounds(objectFootprint(object));
    expect(box?.max[0] ?? 0).toBeCloseTo((box?.min[0] ?? 0) + 2.1);
    expect(box?.max[1] ?? 0).toBeCloseTo((box?.min[1] ?? 0) + 0.9);
    expect(bounds([])).toBeNull();
  });
});
