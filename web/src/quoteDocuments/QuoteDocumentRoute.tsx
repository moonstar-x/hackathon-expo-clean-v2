import type { ReactElement } from 'react';
import { Skeleton } from '@mui/material';
import { useAuthState } from 'react-admin';
import { Navigate, useLocation, type Location } from 'react-router-dom';
import { QuoteDocumentPage } from './QuoteDocumentPage';

// Like the resource views, wait for authentication before fetching anything. Use a route
// redirect here: logout-on-failure guards can loop with this app's React 19/router 7 setup.
export function QuoteDocumentRoute(): ReactElement {
  const auth: ReturnType<typeof useAuthState> = useAuthState();
  const location: Location = useLocation();
  if (auth.isPending) return <Skeleton variant="rectangular" height="70vh" />;
  if (!auth.authenticated) return <Navigate to="/login" replace state={{ nextPathname: location.pathname, nextSearch: location.search }} />;
  return <QuoteDocumentPage />;
}
