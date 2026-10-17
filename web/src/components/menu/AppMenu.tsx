import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import type { ReactElement } from 'react';
import { Menu } from 'react-admin';
import SectionLabel from './SectionLabel';

/**
 * Home, Mediciones and Cotizaciones first (SPEC-004), then the screens by what they are for: the
 * stock itself, the catalog behind it (what is stocked and who supplies it), how quotes are worked
 * out, and the administration: who can sign in, the template of every quote, and the company that
 * issues them. SPEC-002's menu order is kept.
 */
const AppMenu = (): ReactElement => (
  <Menu>
    <Menu.DashboardItem />
    <Menu.ResourceItem name="measurements" />
    <Menu.ResourceItem name="quotes" />
    <SectionLabel label="app.menu.inventory" />
    <Menu.ResourceItem name="products" />
    {/* "Movimientos de inventario" would still be cut at the sidebar's width; under Inventario, "Movimientos" says it. */}
    <Menu.ResourceItem name="stock-movements" primaryText="app.menu.movements" />
    <SectionLabel label="app.menu.catalog" />
    <Menu.ResourceItem name="categories" />
    <Menu.ResourceItem name="suppliers" />
    <SectionLabel label="app.menu.quoting" />
    {/* Single records with no list: these items open them directly. */}
    <Menu.Item to="/quote-parameters/1" primaryText="app.menu.parameters" leftIcon={<SettingsIcon />} />
    <Menu.ResourceItem name="quote-zone-types" />
    <Menu.ResourceItem name="quote-schedules" />
    <Menu.ResourceItem name="quote-products" />
    <Menu.ResourceItem name="quote-location-types" />
    <SectionLabel label="app.menu.administration" />
    <Menu.ResourceItem name="users" />
    <Menu.Item to="/template" primaryText="app.menu.template" leftIcon={<DescriptionIcon />} />
    <Menu.Item to="/company" primaryText="app.menu.company" leftIcon={<BusinessIcon />} />
  </Menu>
);

export default AppMenu;
