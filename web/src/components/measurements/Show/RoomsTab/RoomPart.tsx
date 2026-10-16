import type { ReactElement } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { ROOM_PART_COUNTS } from '../../../../constants/measurements';
import { roomPartCountSx, roomPartSx, roomPartTableSx } from '../../../../styles/measurements';
import type { GeometryRoom, RoomPart as Part, ScanObject, Surface } from '../../../../types/geometry';
import type { RoomPartProps, RoomPartRow } from '../../../../types/measurements';
import { formatDimensions } from '../../../../utils/format';
import { objectCategoryKey, objectSize, surfaceSize } from '../../../../utils/measurements';
import OutlinedBadge from '../../../list/OutlinedBadge';

/** The table lines of a part (SPEC-004 WEB-MEAS-2): "Pared 1, 3,42 × 2,51 m", or an object's name and size. */
const partRows = (part: Part, room: GeometryRoom, translate: TranslateFunction): RoomPartRow[] => {
  if (part === 'objects') {
    return room.objects.map(
      (object: ScanObject): RoomPartRow => ({
        key: object.id,
        label: translate(objectCategoryKey(object.category)),
        size: formatDimensions(objectSize(object)),
      }),
    );
  }
  return room[part].map(
    (surface: Surface, index: number): RoomPartRow => ({
      key: surface.id,
      label: translate(`app.measurements.room.part.${part}`, { number: index + 1 }),
      flag: surface.isOpen ? translate('app.measurements.room.open') : undefined,
      size: formatDimensions(surfaceSize(surface)),
    }),
  );
};

/**
 * One part of a room, such as its walls: how many there are and, once the geometry has loaded, a table
 * of their sizes that opens from the row. The count comes from the record until then. A part with
 * nothing to list doesn't open; its chevron keeps its place, so the counts stay in a column.
 */
const RoomPart = ({ part, room, geometryRoom }: RoomPartProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const rows: RoomPartRow[] | undefined = geometryRoom ? partRows(part, geometryRoom, translate) : undefined;
  const count: number = rows ? rows.length : room[ROOM_PART_COUNTS[part]];
  const expandable: boolean = rows !== undefined && rows.length > 0;
  return (
    <Accordion
      disableGutters
      square
      elevation={0}
      disabled={!expandable}
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={roomPartSx}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ visibility: expandable ? 'visible' : 'hidden' }} />}>
        <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
          {translate(`app.measurements.room.parts.${part}`)}
        </Typography>
        <Typography component="span" variant="body2" sx={roomPartCountSx}>
          {count}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Table size="small" sx={roomPartTableSx}>
          <TableHead>
            <TableRow>
              <TableCell>{translate(`app.measurements.room.item.${part}`)}</TableCell>
              <TableCell>{translate(`app.measurements.room.size.${part}`)}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows?.map(
              (row: RoomPartRow): ReactElement => (
                <TableRow key={row.key}>
                  <TableCell>
                    {row.label}
                    {row.flag ? (
                      <>
                        {' '}
                        <OutlinedBadge label={row.flag} dense />
                      </>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.size}</TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </AccordionDetails>
    </Accordion>
  );
};

export default RoomPart;
