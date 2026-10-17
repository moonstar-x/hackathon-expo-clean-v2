import type { ReactElement } from 'react';
import AuthenticatedRoute from '../components/AuthenticatedRoute';
import { QuoteDocumentPage } from './QuoteDocumentPage';

// Like the resource views, wait for authentication before fetching anything.
export function QuoteDocumentRoute(): ReactElement {
  return <AuthenticatedRoute><QuoteDocumentPage /></AuthenticatedRoute>;
}
