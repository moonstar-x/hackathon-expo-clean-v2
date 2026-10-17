import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import type { ResourceProps } from 'react-admin';
import { QuoteEdit } from '../../quotes/QuoteEdit';
import { QuoteList } from '../../quotes/QuoteList';
import { QuoteShow } from '../../quotes/QuoteShow';

// No create: a quote starts from a measurement ("Crear cotización" on its page).
const quotes: Omit<ResourceProps, 'name'> = {
  list: QuoteList,
  show: QuoteShow,
  edit: QuoteEdit,
  icon: RequestQuoteIcon,
  recordRepresentation: 'name',
};

export default quotes;
