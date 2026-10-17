import type { ReactElement } from 'react';
import { useRecordContext } from 'react-admin';
import { QuoteStatus } from '../../../quotes/Chips';
import type { Quote } from '../../../types/quotes';

/** A quote's state as a table cell: its calculation while it runs, its status otherwise. */
const QuoteStatusField = (): ReactElement | null => {
  const quote: Quote | undefined = useRecordContext<Quote>();
  return quote ? <QuoteStatus quote={quote} dense /> : null;
};

export default QuoteStatusField;
