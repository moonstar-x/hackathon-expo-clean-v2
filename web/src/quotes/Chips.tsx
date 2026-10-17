import type { ReactElement } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import OutlinedBadge from '../components/list/OutlinedBadge';
import { NONE } from '../constants/components';
import { QUOTE_STATE_TONE } from '../constants/quotes';
import { quoteEnums } from '../i18n/quotes';
import type { QuoteStatusProps, StateChipProps } from '../types/quotes';
import { quoteState } from '../utils/quotes';

/** A quote's, a margin's or a waste row's state as the app's one badge, with a spinner while it calculates. */
export const StateChip = ({ value, dense = false }: StateChipProps): ReactElement => (
  <OutlinedBadge
    label={value ? (quoteEnums[value] ?? NONE) : NONE}
    tone={value ? QUOTE_STATE_TONE[value] : undefined}
    dense={dense}
    icon={value === 'pending' || value === 'running' ? <CircularProgress size={10} color="inherit" /> : undefined}
  />
);

/** A quote's badge: its calculation while it runs or after it failed, its status otherwise. */
export const QuoteStatus = ({ quote, dense }: QuoteStatusProps): ReactElement => (
  <StateChip value={quoteState(quote.calculation.state, quote.status)} dense={dense} />
);
