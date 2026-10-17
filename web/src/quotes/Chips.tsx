import type { ReactElement } from 'react';
import { Chip, CircularProgress } from '@mui/material';
import { quoteEnums } from '../i18n/quotes';
import type { Quote } from '../types/quotes';
const colors: Record<string, 'default' | 'error' | 'warning' | 'info' | 'success'> = { failed: 'error', needsReview: 'warning', simulation: 'info', loss: 'error', belowMinimum: 'warning', acceptable: 'info', healthy: 'success', ok: 'success', watch: 'warning', alert: 'error' };
export const StateChip = ({ value }: {
    value: string | null;
}): ReactElement => <Chip size="small" label={value ? quoteEnums[value] ?? '—' : '—'} color={colors[value ?? ''] ?? 'default'} icon={value === 'pending' || value === 'running' ? <CircularProgress size={12}/> : undefined}/>;
export const QuoteStatus = ({ quote }: {
    quote: Pick<Quote, 'status' | 'calculation'>;
}): ReactElement => <StateChip value={['pending', 'running', 'failed'].includes(quote.calculation.state) ? quote.calculation.state : quote.status}/>;
