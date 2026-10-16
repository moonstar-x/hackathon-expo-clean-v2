// What the measurement screens show, worked out from a record and its geometry.
import { MEASUREMENT_FILE_KINDS, OBJECT_CATEGORIES, ROOM_TINTS, ROOM_TYPES } from '../constants/measurements';
import type { Measurement, MeasurementFile, MeasurementFileKind, MeasurementRoom, RoomType } from '../types/api';
import type { GeometryRoom, ScanGeometry, ScanObject, Surface } from '../types/geometry';
import type { LegendEntry, StoredFile } from '../types/measurements';
import { GeometryError } from './geometry';

/** The translation key of a room type's name, or null when the phone didn't detect one. */
export const roomTypeKey = (type: RoomType | null): string | null =>
  type !== null && ROOM_TYPES.includes(type) ? `app.measurements.roomTypes.${type}` : null;

/** The translation key of an object category's name; "Objeto" for one the app doesn't name. */
export const objectCategoryKey = (category: string): string =>
  OBJECT_CATEGORIES.includes(category) ? `app.measurements.categories.${category}` : 'app.measurements.categories.other';

/** The translation key of why the geometry couldn't be shown. */
export const geometryErrorKey = (error: unknown): string =>
  error instanceof GeometryError ? `app.measurements.geometry.${error.reason}` : 'app.measurements.geometry.unavailable';

/** The rooms in the order they were scanned. */
export const roomsInOrder = (rooms: MeasurementRoom[]): MeasurementRoom[] =>
  [...rooms].sort((a: MeasurementRoom, b: MeasurementRoom): number => a.index - b.index);

/** The geometry of a room; the phone writes ids in upper case, the API stores them in lower case. */
export const geometryRoomFor = (geometry: ScanGeometry | undefined, roomId: string): GeometryRoom | undefined =>
  geometry?.rooms.find((room: GeometryRoom): boolean => room.id.toLowerCase() === roomId.toLowerCase());

/** The floor color of the room at `index` of the geometry, as the 3D view paints it. */
export const roomTint = (index: number): string => ROOM_TINTS[index % ROOM_TINTS.length];

/** Each room's floor color in the 3D view, named as the record names it. */
export const roomLegend = (geometry: ScanGeometry, rooms: MeasurementRoom[]): LegendEntry[] =>
  geometry.rooms.flatMap((geometryRoom: GeometryRoom, index: number): LegendEntry[] => {
    const room: MeasurementRoom | undefined = rooms.find(
      (candidate: MeasurementRoom): boolean => candidate.id.toLowerCase() === geometryRoom.id.toLowerCase(),
    );
    return room ? [{ id: room.id, name: room.name, color: roomTint(index) }] : [];
  });

/** A wall's length × height, or a door's, window's or opening's width × height. */
export const surfaceSize = (surface: Surface): number[] => surface.dimensions.slice(0, 2);

/** An object's width × depth × height. */
export const objectSize = (object: ScanObject): number[] => [
  object.dimensions[0],
  object.dimensions[2],
  object.dimensions[1],
];

/** When the phone couldn't join the rooms, the plan and model show them as scanned (SPEC-004 §6.5). */
export const showsRoomsUnjoined = (measurement: Measurement): boolean =>
  !measurement.isMerged && measurement.roomCount > 1;

/** The files stored for a measurement, in the order the Archivos tab lists them. */
export const storedFiles = (measurement: Measurement): StoredFile[] =>
  MEASUREMENT_FILE_KINDS.flatMap((kind: MeasurementFileKind): StoredFile[] => {
    const file: MeasurementFile | undefined = measurement.files[kind];
    return file ? [{ kind, file }] : [];
  });
