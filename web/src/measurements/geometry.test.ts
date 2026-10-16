import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/two-room-apartment.geometry.json';
import { bounds, objectFootprint, parseGeometry, planSegment, renderSource } from './geometry';
import { area, categoryName, length, roomType, size } from './format';
const g = parseGeometry(fixture);
describe('Swift geometry contract', () => {
  it('parses the sample and rejects unsupported and malformed shapes', () => {
    expect(g.rooms).toHaveLength(2); expect(() => parseGeometry({ ...fixture, version: 2 })).toThrow(/versión/);
    expect(() => parseGeometry({ ...fixture, planRotation: Infinity })).toThrow();
    expect(() => parseGeometry('invalid')).toThrow();
  });
  it('uses merged surfaces or falls back to rooms', () => {
    expect(renderSource(g).walls).toHaveLength(7);
    expect(renderSource({ ...g, merged: null }).walls).toHaveLength(8);
  });
  it('projects a rotated wall and object footprint in world space', () => {
    const wall = g.rooms[0].walls[1]; expect(planSegment(wall)).toEqual({ start: [5, 0], end: [5, 4] });
    const footprint = bounds(objectFootprint(g.rooms[0].objects[0]))!;
    expect(footprint.max[0] - footprint.min[0]).toBeCloseTo(2.1);
    expect(footprint.max[1] - footprint.min[1]).toBeCloseTo(0.9);
  });
  it('formats metric values and categories in Spanish', () => {
    expect(length(3.42)).toBe('3,42 m'); expect(area(34)).toBe('34,0 m²'); expect(area(null)).toBe('—');
    expect(size([2.1, 0.9, 0.85])).toBe('2,10 × 0,90 × 0,85 m');
    expect(roomType('livingRoom')).toBe('Sala'); expect(categoryName('sofa')).toBe('Sofá'); expect(categoryName('unknown')).toBe('Objeto');
  });
});
