import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import useGeometry from '../../../../hooks/useGeometry';
import { roomGridSx } from '../../../../styles/measurements';
import type { Measurement, MeasurementRoom } from '../../../../types/api';
import type { ScanGeometry } from '../../../../types/geometry';
import { geometryErrorKey, geometryRoomFor, roomsInOrder } from '../../../../utils/measurements';
import RoomCard from './RoomCard';

/**
 * The Medidas tab: a card per room, in the order they were scanned. The rooms' own numbers come with
 * the record; their walls, doors, windows and objects come from the geometry, and when it can't be
 * loaded a note says the cards show the numbers alone (SPEC-004 WEB-MEAS-2).
 */
const RoomsTab = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  const { data: geometry, error }: UseQueryResult<ScanGeometry, Error> = useGeometry(record?.id);
  if (!record) return null;
  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {error ? (
        <Alert severity="info">
          {translate('app.measurements.room.metricsOnly', { reason: translate(geometryErrorKey(error)) })}
        </Alert>
      ) : null}
      <Box sx={roomGridSx}>
        {roomsInOrder(record.rooms).map(
          (room: MeasurementRoom): ReactElement => (
            <RoomCard key={room.id} room={room} geometryRoom={geometryRoomFor(geometry, room.id)} />
          ),
        )}
      </Box>
    </Stack>
  );
};

export default RoomsTab;
