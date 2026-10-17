import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import PercentOutlined from '@mui/icons-material/PercentOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { useAppConfig } from '../../../AppConfigContext';
import { StateChip } from '../../../quotes/Chips';
import { percent } from '../../../quotes/format';
import type { Quote } from '../../../types/quotes';
import { formatDateTime } from '../../../utils/dates';
import { formatCurrency } from '../../../utils/format';
import MetaRow from '../../list/MetaRow';

/** Mobile row details: the price, the margin with how healthy it is, and when it was calculated. */
const QuoteSecondary = (): ReactElement | null => {
  const quote: Quote | undefined = useRecordContext<Quote>();
  const translate: TranslateFunction = useTranslate();
  const { currency } = useAppConfig();
  if (!quote) return null;
  const marginStatus: string | null = quote.summary.marginStatus;
  return (
    <Stack component="span" spacing={0.5} sx={{ display: 'flex' }}>
      <MetaRow icon={PaidOutlined}>{formatCurrency(quote.summary.offeredPrice, currency)}</MetaRow>
      <MetaRow icon={PercentOutlined}>
        {translate('app.quotes.marginLine', { margin: percent(quote.summary.margin) })}{' '}
        {marginStatus ? <StateChip value={marginStatus} dense /> : null}
      </MetaRow>
      {quote.calculation.calculatedAt ? (
        <MetaRow icon={ScheduleOutlined}>{formatDateTime(quote.calculation.calculatedAt)}</MetaRow>
      ) : null}
    </Stack>
  );
};

export default QuoteSecondary;
