import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import { Labeled, TextField, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { NONE } from '../../../constants/components';
import { notesSx } from '../../../styles/measurements';
import type { Measurement } from '../../../types/api';
import { formatArea, formatDimensions, formatNumber } from '../../../utils/format';
import { showsRoomsUnjoined } from '../../../utils/measurements';
import StatBar from '../../list/StatBar';

/**
 * The space at a glance (SPEC-004 WEB-MEAS-1): its area, rooms and outer dimensions, then the notes
 * and, when the phone couldn't join the rooms, why the plan shows them apart. It stays above the
 * tabs, so every tab reads against it.
 */
const SummaryCard = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <Card>
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <StatBar
            items={[
              {
                label: translate('resources.measurements.fields.totalFloorArea'),
                value: formatArea(record.totalFloorArea, record.isAreaApproximate),
              },
              { label: translate('resources.measurements.fields.roomCount'), value: formatNumber(record.roomCount) },
              {
                label: translate('resources.measurements.fields.footprint'),
                value: record.footprint ? formatDimensions([record.footprint.width, record.footprint.length]) : NONE,
              },
            ]}
          />
          {record.notes ? (
            <Labeled source="notes">
              <TextField source="notes" sx={notesSx} />
            </Labeled>
          ) : null}
          {showsRoomsUnjoined(record) ? (
            <Alert severity="info" sx={{ alignSelf: 'stretch' }}>
              {translate('app.measurements.roomsUnjoined')}
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
