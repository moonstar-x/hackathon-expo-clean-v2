import type { ReactElement } from 'react';
import Skeleton from '@mui/material/Skeleton';
import { useAuthState } from 'react-admin';
import { Navigate, useLocation, type Location } from 'react-router-dom';
import type { ChildrenProps } from '../types/components';

/**
 * A custom route's page, shown once the session is confirmed, like a resource view: a placeholder
 * while it is checked, then the page, or the sign-in screen with the way back. It redirects with a
 * route on purpose: logout-on-failure guards can loop with this app's React 19 / router 7 setup.
 */
const AuthenticatedRoute = ({ children }: ChildrenProps): ReactElement => {
  const auth: ReturnType<typeof useAuthState> = useAuthState();
  const location: Location = useLocation();
  if (auth.isPending) return <Skeleton variant="rectangular" height="70vh" />;
  if (!auth.authenticated) {
    return <Navigate to="/login" replace state={{ nextPathname: location.pathname, nextSearch: location.search }} />;
  }
  return <>{children}</>;
};

export default AuthenticatedRoute;
