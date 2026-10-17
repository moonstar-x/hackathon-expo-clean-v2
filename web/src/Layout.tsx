import type { ReactElement } from 'react';
import { CheckForApplicationUpdate, Layout } from 'react-admin';
import AppAppBar from './components/appBar/AppBar';
import AppMenu from './components/menu/AppMenu';
import { layoutSx } from './styles/layout';
import type { ChildrenProps } from './types/components';

// A wide table widens the page on desktop rather than losing its last columns (see layoutSx).
const AppLayout = ({ children }: ChildrenProps): ReactElement => (
  <Layout appBar={AppAppBar} menu={AppMenu} sx={layoutSx}>
    {children}
    {/* Production builds only: offers a reload once a new build is deployed. */}
    <CheckForApplicationUpdate />
  </Layout>
);

export default AppLayout;
