import type { ReactElement } from 'react';
import Button from '@mui/material/Button';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { Link } from 'react-router-dom';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import useCreateMeasurementQuote from '../../../hooks/useCreateMeasurementQuote';
import type { Measurement } from '../../../types/api';

/**
 * The measurement page's way to its quote: "Ver cotización" once there is one (its state shows in the
 * summary), "Crear cotización" before, as the page's main action.
 */
const QuoteButton = (): ReactElement | null => {
  const measurement: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  const { create, creating } = useCreateMeasurementQuote();
  if (!measurement) return null;
  return measurement.quote ? (
    <Button variant="outlined" component={Link} to={`/quotes/${measurement.quote.id}/show`} startIcon={<RequestQuoteIcon />}>
      {translate('app.measurements.quote.view')}
    </Button>
  ) : (
    <Button
      variant="contained"
      disabled={creating}
      onClick={(): void => void create(measurement.id)}
      startIcon={<RequestQuoteIcon />}
    >
      {translate('app.measurements.quote.create')}
    </Button>
  );
};

export default QuoteButton;
