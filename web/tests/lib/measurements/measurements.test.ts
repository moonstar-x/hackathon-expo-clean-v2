import { describe, expect, it } from 'vitest';
import { ROOM_TINTS } from '../../../src/constants/measurements';
import { i18nProvider } from '../../../src/i18n';
import type { Measurement, MeasurementRoom } from '../../../src/types/api';
import type { ScanGeometry, ScanObject, Surface } from '../../../src/types/geometry';
import { GeometryError, parseGeometry } from '../../../src/utils/geometry';
import {
  geometryErrorKey,
  geometryRoomFor,
  objectCategoryKey,
  objectSize,
  roomLegend,
  roomsInOrder,
  roomTypeKey,
  showsRoomsUnjoined,
  storedFiles,
  surfaceSize,
} from '../../../src/utils/measurements';
import fixture from '../../fixtures/two-room-apartment.geometry.json';

const geometry: ScanGeometry = parseGeometry(fixture);
const t = (key: string): string => i18nProvider.translate(key);

const room = (id: string, index: number, name: string): MeasurementRoom => ({
  id,
  index,
  name,
  type: null,
  floorArea: 10,
  isFloorApproximate: false,
  perimeter: 12,
  ceilingHeight: 2.5,
  wallCount: 4,
  doorCount: 1,
  windowCount: 1,
  openingCount: 0,
  objectCount: 0,
});

// The API stores room ids in lower case; the phone's geometry keeps them in upper case.
const [livingId, bedroomId]: string[] = geometry.rooms.map((r: { id: string }): string => r.id.toLowerCase());

describe('names (SPEC-004 WEB-MEAS-3)', () => {
  it('names room types, and nothing when the phone didn’t detect one', (): void => {
    expect(t(roomTypeKey('livingRoom') ?? '')).toBe('Sala');
    expect(t(roomTypeKey('bathroom') ?? '')).toBe('Baño');
    expect(roomTypeKey(null)).toBeNull();
  });

  it('names object categories, with "Objeto" for one the app doesn’t name', (): void => {
    expect(t(objectCategoryKey('sofa'))).toBe('Sofá');
    expect(t(objectCategoryKey('washerDryer'))).toBe('Lavadora/Secadora');
    expect(t(objectCategoryKey('other'))).toBe('Objeto');
    expect(t(objectCategoryKey('somethingNew'))).toBe('Objeto');
  });

  it('says why a geometry can’t be shown', (): void => {
    expect(t(geometryErrorKey(new GeometryError('unsupportedVersion')))).toBe('Esta versión de geometría aún no es compatible.');
    expect(t(geometryErrorKey(new Error('Failed to fetch')))).toBe('No se pudo cargar la geometría.');
  });
});

describe('rooms', () => {
  it('lists rooms in the order they were scanned', (): void => {
    const rooms: MeasurementRoom[] = [room('b', 1, 'Dormitorio'), room('a', 0, 'Sala')];
    expect(roomsInOrder(rooms).map((r: MeasurementRoom): string => r.name)).toEqual(['Sala', 'Dormitorio']);
  });

  it('finds a room’s geometry whatever the case of its id', (): void => {
    expect(geometryRoomFor(geometry, bedroomId)?.id).toBe(geometry.rooms[1].id);
    expect(geometryRoomFor(undefined, bedroomId)).toBeUndefined();
  });

  it('names each floor color in the order the 3D view paints them', (): void => {
    const rooms: MeasurementRoom[] = [room(bedroomId, 1, 'Dormitorio'), room(livingId, 0, 'Sala')];
    expect(roomLegend(geometry, rooms)).toEqual([
      { id: livingId, name: 'Sala', color: ROOM_TINTS[0] },
      { id: bedroomId, name: 'Dormitorio', color: ROOM_TINTS[1] },
    ]);
  });

  it('measures a wall as length × height and an object as width × depth × height', (): void => {
    const wall: Surface = geometry.rooms[0].walls[0];
    const object: ScanObject = geometry.rooms[0].objects[0];
    expect(surfaceSize(wall)).toEqual(wall.dimensions.slice(0, 2));
    expect(objectSize(object)).toEqual([object.dimensions[0], object.dimensions[2], object.dimensions[1]]);
  });
});

describe('a measurement', () => {
  const measurement = (fields: Partial<Measurement>): Measurement => ({ isMerged: true, roomCount: 2, files: {}, ...fields }) as Measurement;

  it('notes rooms shown apart only when there are several the phone couldn’t join', (): void => {
    expect(showsRoomsUnjoined(measurement({ isMerged: false, roomCount: 2 }))).toBe(true);
    expect(showsRoomsUnjoined(measurement({ isMerged: false, roomCount: 1 }))).toBe(false);
    expect(showsRoomsUnjoined(measurement({ isMerged: true, roomCount: 3 }))).toBe(false);
  });

  it('lists the stored files plan first, skipping the ones that weren’t uploaded', (): void => {
    const file: Measurement['files']['csv'] = { url: 'x', contentType: 'text/csv', size: 1 };
    const files: string[] = storedFiles(measurement({ files: { csv: file, geometry: file, floorPlan: file } })).map(
      (stored: { kind: string }): string => stored.kind,
    );
    expect(files).toEqual(['floorPlan', 'geometry', 'csv']);
  });
});
