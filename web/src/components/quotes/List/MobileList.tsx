import type { ReactElement } from 'react';
import { InfiniteList, SimpleList } from 'react-admin';
import { QUOTE_SORT } from '../../../constants/quotes';
import { QuoteStatus } from '../../../quotes/Chips';
import { listRowSx } from '../../../styles/list';
import type { Quote } from '../../../types/quotes';
import EmptyState from '../../list/EmptyState';
import PrimaryRow from '../../list/PrimaryRow';
import MobileActions from './MobileActions';
import QuoteSecondary from './QuoteSecondary';
import { quoteFilters } from './quoteFilters';
import SeeMeasurementsButton from './SeeMeasurementsButton';

/** The quotes as cards that load more as you scroll, each with its state top-right; a card opens the quote. */
const MobileList = (): ReactElement => (
  <InfiniteList
    sort={QUOTE_SORT}
    filters={quoteFilters}
    actions={<MobileActions />}
    empty={<EmptyState variant="page" action={<SeeMeasurementsButton />} />}
  >
    <SimpleList<Quote>
      rowClick="show"
      primaryText={(quote: Quote): ReactElement => <PrimaryRow end={<QuoteStatus quote={quote} dense />}>{quote.name}</PrimaryRow>}
      secondaryText={<QuoteSecondary />}
      empty={<EmptyState />}
      sx={listRowSx()}
    />
  </InfiniteList>
);

export default MobileList;
