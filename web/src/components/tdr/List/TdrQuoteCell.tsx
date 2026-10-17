import type { MouseEvent, ReactElement } from 'react';
import { Link, useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { NONE } from '../../../constants/components';
import type { TdrDocument } from '../../../types/tdr';

/** The row opens the document; a click on its quote's link opens the quote instead. */
const stopRowClick = (event: MouseEvent): void => event.stopPropagation();

/** The quote created from the document, as a link, or a dash. */
const TdrQuoteCell = (): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  const translate: TranslateFunction = useTranslate();
  if (!doc) return null;
  if (doc.quoteId === null) return <>{NONE}</>;
  return (
    <Link to={`/quotes/${doc.quoteId}/show`} onClick={stopRowClick}>
      {translate('app.tdr.actions.viewQuote')}
    </Link>
  );
};

export default TdrQuoteCell;
