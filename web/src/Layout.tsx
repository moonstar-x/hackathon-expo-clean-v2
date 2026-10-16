import type { ReactElement } from 'react';
import { CheckForApplicationUpdate, Layout } from 'react-admin';
import AppAppBar from './components/appBar/AppBar';
import AppMenu from './components/menu/AppMenu';
import type { ChildrenProps } from './types/components';

// minWidth 0 lets wide tables stay inside their card instead of stretching the page.
const AppLayout = ({ children }: ChildrenProps): ReactElement => (
  <Layout appBar={AppAppBar} menu={AppMenu} sx={{ minWidth: 0, '& .RaLayout-content': { minWidth: 0 } }}>
    {children}
    {/* Production builds only: offers a reload once a new build is deployed. */}
    <CheckForApplicationUpdate />
  </Layout>
);

export default AppLayout;
