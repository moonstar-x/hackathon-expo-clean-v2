import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { userEvent, type UserEvent } from '@testing-library/user-event';
import RoomCard from '../../../src/components/measurements/Show/RoomsTab/RoomCard';
import type { MeasurementRoom } from '../../../src/types/api';
import type { GeometryRoom, ScanGeometry } from '../../../src/types/geometry';
import { parseGeometry } from '../../../src/utils/geometry';
import fixture from '../../fixtures/two-room-apartment.geometry.json';
import { renderWithAdmin } from '../../renderWithAdmin';

const geometry: ScanGeometry = parseGeometry(fixture);
const livingRoom: GeometryRoom = geometry.rooms[0];

const room = (fields: Partial<MeasurementRoom> = {}): MeasurementRoom => ({
  id: livingRoom.id.toLowerCase(),
  index: 0,
  name: 'Sala comedor',
  type: 'livingRoom',
  floorArea: 20,
  isFloorApproximate: true,
  perimeter: 18,
  ceilingHeight: null,
  wallCount: 4,
  doorCount: 2,
  windowCount: 1,
  openingCount: 0,
  objectCount: 2,
  ...fields,
});

/** The summary row of a room part, such as "Puertas 2". */
const partRow = (name: string): HTMLElement => screen.getByRole('button', { name: new RegExp(`^${name}`) });

describe('RoomCard', () => {
  it('shows the room’s area, perimeter and ceiling height, dashing what’s unknown', (): void => {
    renderWithAdmin(<RoomCard room={room()} />);
    expect(screen.getByRole('heading', { name: 'Sala comedor' })).toBeInTheDocument();
    expect(screen.getByText('≈ 20,0 m²')).toBeInTheDocument();
    expect(screen.getByText('18,00 m')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('names the detected type only when the name doesn’t already say it', (): void => {
    const { unmount } = renderWithAdmin(<RoomCard room={room()} />);
    expect(screen.getByText('Sala')).toBeInTheDocument();
    unmount();
    renderWithAdmin(<RoomCard room={room({ name: 'Sala' })} />);
    expect(screen.getAllByText('Sala')).toHaveLength(1);
  });

  it('counts the parts from the record until the geometry arrives, without opening them', (): void => {
    renderWithAdmin(<RoomCard room={room()} />);
    expect(partRow('Puertas')).toHaveTextContent('2');
    expect(partRow('Puertas')).toBeDisabled();
  });

  it('opens a part into its sizes once the geometry has loaded', async (): Promise<void> => {
    const user: UserEvent = userEvent.setup();
    renderWithAdmin(<RoomCard room={room()} geometryRoom={livingRoom} />);
    await user.click(partRow('Puertas'));
    const doors: HTMLElement = screen.getByRole('table');
    expect(within(doors).getByText('Ancho × alto')).toBeInTheDocument();
    expect(within(doors).getAllByText('0,90 × 2,00 m')).toHaveLength(2);
    expect(within(doors).getByText('abierta')).toBeInTheDocument();
  });

  it('lists objects by name as width × depth × height', async (): Promise<void> => {
    const user: UserEvent = userEvent.setup();
    renderWithAdmin(<RoomCard room={room()} geometryRoom={livingRoom} />);
    await user.click(partRow('Objetos'));
    const objects: HTMLElement = screen.getByRole('table');
    expect(within(objects).getByText('Sofá')).toBeInTheDocument();
    expect(within(objects).getByText('2,10 × 0,90 × 0,85 m')).toBeInTheDocument();
  });

  it('keeps a part with nothing to list closed', (): void => {
    renderWithAdmin(<RoomCard room={room()} geometryRoom={livingRoom} />);
    expect(partRow('Aberturas')).toHaveTextContent('0');
    expect(partRow('Aberturas')).toBeDisabled();
  });
});
