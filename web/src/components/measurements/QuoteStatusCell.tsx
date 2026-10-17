import type { MouseEvent, ReactElement } from 'react';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { Link, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import useCreateMeasurementQuote from '../../hooks/useCreateMeasurementQuote';
import { quoteEnums } from '../../i18n/quotes';
import { StateChip } from '../../quotes/Chips';
import { quoteCellLinkSx } from '../../styles/measurements';
import type { Measurement } from '../../types/api';
import { quoteState } from '../../utils/quotes';

/** The row opens the measurement; a click in this cell is the cell's own. */
const stopRowClick = (event: MouseEvent): void => event.stopPropagation();

/**
 * The measurements table's quote column: the quote's state as a badge that opens the quote, or
 * "Crear cotización" when the measurement has none yet.
 */
const QuoteStatusCell = (): ReactElement | null => {
  const measurement: Measurement | undefined = useRecordContext<Measurement>();
  const translate: TranslateFunction = useTranslate();
  const { create, creating } = useCreateMeasurementQuote();
  if (!measurement) return null;

  const { quote } = measurement;
  if (quote) {
    const state: string | null = quoteState(quote.calculationState, quote.status);
    return (
      <Tooltip title={translate('app.measurements.quote.open')}>
        <Link
          to={`/quotes/${quote.id}/show`}
          underline="none"
          onClick={stopRowClick}
          aria-label={translate('app.measurements.quote.openState', { state: state ? (quoteEnums[state] ?? state) : '' })}
          sx={quoteCellLinkSx}
        >
          <StateChip value={state} dense />
        </Link>
      </Tooltip>
    );
  }
  return (
    <Button
      size="small"
      disabled={creating}
      onClick={(event: MouseEvent): void => {
        stopRowClick(event);
        void create(measurement.id);
      }}
    >
      {translate('app.measurements.quote.create')}
    </Button>
  );
};

export default QuoteStatusCell;
