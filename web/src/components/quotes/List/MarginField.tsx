import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRecordContext } from 'react-admin';
import { StateChip } from '../../../quotes/Chips';
import { percent } from '../../../quotes/format';
import type { Quote } from '../../../types/quotes';

/** A quote's margin and how healthy it is, on one line: "35,0 %" then "Saludable". */
const MarginField = (): ReactElement | null => {
  const quote: Quote | undefined = useRecordContext<Quote>();
  if (!quote) return null;
  return (
    <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center', whiteSpace: 'nowrap' }}>
      <Typography component="span" variant="body2">
        {percent(quote.summary.margin)}
      </Typography>
      {quote.summary.marginStatus ? <StateChip value={quote.summary.marginStatus} dense /> : null}
    </Stack>
  );
};

export default MarginField;
