import type { ReactElement } from 'react';
import { Menu } from 'react-admin';
import SectionLabel from './SectionLabel';

/**
 * Home, then the screens by what they are for: the stock itself, the catalog behind it (what is
 * stocked and who supplies it), and who can sign in. SPEC-002's menu order is kept.
 */
const AppMenu = (): ReactElement => (
  <Menu>
    <Menu.DashboardItem />
    <SectionLabel label="app.menu.inventory" />
    <Menu.ResourceItem name="products" />
    {/* "Movimientos de inventario" would be cut at the sidebar's width; under Inventario, "Movimientos" says it. */}
    <Menu.ResourceItem name="stock-movements" primaryText="app.menu.movements" />
    <SectionLabel label="app.menu.catalog" />
    <Menu.ResourceItem name="categories" />
    <Menu.ResourceItem name="suppliers" />
    <SectionLabel label="app.menu.administration" />
    <Menu.ResourceItem name="users" />
  </Menu>
);

export default AppMenu;
