import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { Labeled, TextField, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { NONE } from '../../../constants/components';
import { StateChip } from '../../../quotes/Chips';
import { notesSx } from '../../../styles/measurements';
import type { Measurement } from '../../../types/api';
import { formatArea, formatDimensions, formatNumber } from '../../../utils/format';
import { showsRoomsUnjoined } from '../../../utils/measurements';
import { quoteState } from '../../../utils/quotes';
import KeyFigures from '../../KeyFigures';
import ShowSection from '../../show/ShowSection';

/**
 * The space at a glance (SPEC-004 WEB-MEAS-1): its area, rooms and outer dimensions and where its
 * quote stands, then the notes and, when the phone couldn't join the rooms, why the plan shows them
 * apart. It stays above the tabs, so every tab reads against it.
 */
const SummarySection = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <ShowSection title={translate('app.measurements.summary')}>
      <Stack spacing={2.5}>
        <KeyFigures
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
            {
              label: translate('resources.measurements.fields.quote'),
              value: record.quote ? (
                <StateChip value={quoteState(record.quote.calculationState, record.quote.status)} />
              ) : (
                translate('app.measurements.quote.none')
              ),
            },
          ]}
        />
        {record.notes ? (
          <Labeled source="notes">
            <TextField source="notes" sx={notesSx} />
          </Labeled>
        ) : null}
        {showsRoomsUnjoined(record) ? <Alert severity="info">{translate('app.measurements.roomsUnjoined')}</Alert> : null}
      </Stack>
    </ShowSection>
  );
};

export default SummarySection;
