import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import useMeasurementFile from '../../../hooks/useMeasurementFile';
import useObjectUrl from '../../../hooks/useObjectUrl';
import { planImageSx, planLoadingSx, planSheetSx, stageToolbarSx } from '../../../styles/measurements';
import type { Measurement } from '../../../types/api';

/**
 * The plan the phone drew, on its white sheet and as wide as the tab (SPEC-004 WEB-PLAN-1). The
 * sheet and the button both open the full-size image in a new tab.
 */
const PlanTab = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  const hasPlan: boolean = Boolean(record?.files.floorPlan);
  const { data, error }: UseQueryResult<Blob, Error> = useMeasurementFile(record?.id, 'floorPlan', hasPlan);
  const url: string | undefined = useObjectUrl(data);
  if (!record) return null;
  if (!hasPlan) return <Alert severity="info">{translate('app.measurements.plan.missing')}</Alert>;
  if (error) {
    return <Alert severity="error">{translate('app.measurements.plan.failed', { error: error.message })}</Alert>;
  }
  if (!url) {
    return (
      <Skeleton variant="rounded" role="progressbar" aria-label={translate('app.measurements.plan.loading')} sx={planLoadingSx} />
    );
  }
  return (
    <Box>
      <Box sx={stageToolbarSx}>
        <Button variant="outlined" href={url} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewIcon />}>
          {translate('app.measurements.plan.open')}
        </Button>
      </Box>
      {/* Out of the tab order: the button above is the same link, for the keyboard. */}
      <Box component="a" href={url} target="_blank" rel="noopener noreferrer" tabIndex={-1} sx={planSheetSx}>
        <Box component="img" src={url} alt={translate('app.measurements.plan.alt', { name: record.name })} sx={planImageSx} />
      </Box>
    </Box>
  );
};

export default PlanTab;
