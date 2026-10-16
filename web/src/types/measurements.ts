// Props and values of the measurement screens (components/measurements).
import type { ReactNode } from 'react';
import type { Identifier } from 'react-admin';
import type { Group, Scene } from 'three';
import type { MeasurementFile, MeasurementFileKind, MeasurementRoom } from './api';
import type { GeometryRoom, RoomPart, ScanGeometry } from './geometry';

export interface TabContentProps {
  /** Always false: <TabbedShowLayout.Tab> labels each child unless it says not to. */
  label: false;
  children: ReactNode;
}

/** A file the API stores for a measurement. */
export interface StoredFile {
  kind: MeasurementFileKind;
  file: MeasurementFile;
}

export interface FileRowProps extends StoredFile {
  measurementId: Identifier;
}

export interface RoomCardProps {
  room: MeasurementRoom;
  /** The room's surfaces and objects; missing while the geometry loads, or when it can't be read. */
  geometryRoom?: GeometryRoom;
}

export interface RoomPartProps extends RoomCardProps {
  part: RoomPart;
}

/** One line of a room part's table, such as "Pared 1" and "3,42 × 2,51 m". */
export interface RoomPartRow {
  key: string;
  label: string;
  /** Shown after the label, such as "abierta" on an open door. */
  flag?: string;
  size: string;
}

/** A room's floor color in the 3D view. */
export interface LegendEntry {
  id: string;
  name: string;
  color: string;
}

export interface RoomLegendProps {
  entries: LegendEntry[];
}

export interface ModelViewerProps {
  geometry: ScanGeometry;
  /** What the view shows, for screen readers, such as "Modelo 3D de Apartamento". */
  label: string;
  legend: LegendEntry[];
}

/** What the 3D viewer keeps of a built scene, to change it without building it again. */
export interface ViewerStage {
  scene: Scene;
  group: Group;
  /** Draws the next frame; the view draws only when something changed. */
  requestDraw: () => void;
  /** Puts the camera back where it started. */
  reset: () => void;
}

/** What fetching a measurement file accepts besides its measurement and kind. */
export interface FileRequestOptions {
  /** Asks for `Content-Disposition: attachment`, with the file's name. */
  download?: boolean;
  signal?: AbortSignal;
}
