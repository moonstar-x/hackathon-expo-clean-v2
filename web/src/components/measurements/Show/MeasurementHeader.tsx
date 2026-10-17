import { MeasurementQuoteLink } from '../../../quotes/MeasurementQuoteLink';
import type { ReactElement } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  DeleteButton,
  EditButton,
  ListButton,
  useRecordContext,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import type { Measurement } from '../../../types/api';
import { formatDateTime } from '../../../utils/dates';
import PageHeader from '../../PageHeader';

/** The measurement page's heading: when the space was scanned, over its name, then what can be done with it. */
const MeasurementHeader = (): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <PageHeader
      eyebrow={translate('app.measurements.scannedOn', { date: formatDateTime(record.scannedAt) })}
      title={record.name}
      actions={
        <>
          <ListButton label="ra.action.back" icon={<ArrowBackIcon />} />
          <MeasurementQuoteLink />
          <EditButton variant="outlined" />
          <DeleteButton mutationMode="pessimistic" confirmContent="La cotización se conserva." />
        </>
      }
    />
  );
};

export default MeasurementHeader;
