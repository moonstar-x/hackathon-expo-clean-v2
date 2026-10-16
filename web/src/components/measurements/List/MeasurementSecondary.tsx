import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SquareFootOutlined from '@mui/icons-material/SquareFootOutlined';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { Measurement } from '../../../types/api';
import { formatDateTime } from '../../../utils/dates';
import { formatArea } from '../../../utils/format';
import MetaRow from '../../list/MetaRow';

/** Mobile row details: how big the space is, when it was scanned, and who uploaded it. */
const MeasurementSecondary = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <Stack component="span" spacing={0.5} sx={{ display: 'flex' }}>
      <MetaRow icon={SquareFootOutlined}>
        {translate('app.measurements.areaAndRooms', {
          area: formatArea(record.totalFloorArea, record.isAreaApproximate),
          rooms: translate('app.measurements.rooms', { smart_count: record.roomCount }),
        })}
      </MetaRow>
      <MetaRow icon={ScheduleOutlined}>{formatDateTime(record.scannedAt)}</MetaRow>
      <MetaRow icon={PersonOutlined}>{record.createdBy}</MetaRow>
    </Stack>
  );
};

export default MeasurementSecondary;
