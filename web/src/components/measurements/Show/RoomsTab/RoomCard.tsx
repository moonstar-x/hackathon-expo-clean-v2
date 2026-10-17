import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { APP_LOCALE } from '../../../../constants/app';
import { ROOM_PARTS } from '../../../../constants/measurements';
import { roomCardSx } from '../../../../styles/measurements';
import type { RoomPart as Part } from '../../../../types/geometry';
import type { RoomCardProps } from '../../../../types/measurements';
import { formatArea, formatLength } from '../../../../utils/format';
import { roomTypeKey } from '../../../../utils/measurements';
import KeyFigures from '../../../KeyFigures';
import OutlinedBadge from '../../../list/OutlinedBadge';
import RoomPart from './RoomPart';

const sameName = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase(APP_LOCALE) === b.trim().toLocaleLowerCase(APP_LOCALE);

/**
 * One room (SPEC-004 WEB-MEAS-2): its area, perimeter and ceiling height, then its walls, doors,
 * windows, openings and objects. The detected type shows only when the name doesn't already say it:
 * "Sala comedor" gets "Sala", a room named "Cocina" doesn't get "Cocina" again.
 */
const RoomCard = ({ room, geometryRoom }: RoomCardProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const typeKey: string | null = roomTypeKey(room.type);
  const typeName: string | null = typeKey ? translate(typeKey) : null;
  const headingId: string = `room-${room.id}`;
  return (
    <Paper variant="outlined" component="section" aria-labelledby={headingId} sx={roomCardSx}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography id={headingId} variant="h6" component="h2">
          {room.name}
        </Typography>
        {typeName && !sameName(typeName, room.name) ? <OutlinedBadge label={typeName} /> : null}
      </Stack>
      <KeyFigures
        size="small"
        items={[
          { label: translate('app.measurements.room.area'), value: formatArea(room.floorArea, room.isFloorApproximate) },
          { label: translate('app.measurements.room.perimeter'), value: formatLength(room.perimeter) },
          { label: translate('app.measurements.room.ceilingHeight'), value: formatLength(room.ceilingHeight) },
        ]}
      />
      <Box>
        {ROOM_PARTS.map(
          (part: Part): ReactElement => (
            <RoomPart key={part} part={part} room={room} geometryRoom={geometryRoom} />
          ),
        )}
      </Box>
    </Paper>
  );
};

export default RoomCard;
