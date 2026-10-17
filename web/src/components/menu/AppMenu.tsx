import SettingsIcon from '@mui/icons-material/Settings';
import type { ReactElement } from 'react';
import { Menu } from 'react-admin';
import SectionLabel from './SectionLabel';

/**
 * Home and Mediciones (first, as SPEC-004 asks), then the screens by what they are for: the stock
 * itself, the catalog behind it (what is stocked and who supplies it), and who can sign in.
 * SPEC-002's menu order is kept.
 */
const AppMenu = (): ReactElement => (
  <Menu>
    <Menu.DashboardItem />
    <Menu.ResourceItem name="measurements" />
    <Menu.ResourceItem name="quotes" />
    <SectionLabel label="app.menu.inventory" />
    <Menu.ResourceItem name="products" />
    {/* "Movimientos de inventario" would be cut at the sidebar's width; under Inventario, "Movimientos" says it. */}
    <Menu.ResourceItem name="stock-movements" primaryText="app.menu.movements" />
    <SectionLabel label="app.menu.catalog" />
    <Menu.ResourceItem name="categories" />
    <Menu.ResourceItem name="suppliers" />
    <SectionLabel label="app.menu.quoting" />
    <Menu.Item to="/quote-parameters/1" primaryText="Parámetros" leftIcon={<SettingsIcon />} />
    <Menu.Item to="/quote-document-settings/1" primaryText="Empresa y plantilla" leftIcon={<SettingsIcon />} />
    <Menu.ResourceItem name="quote-zone-types" />
    <Menu.ResourceItem name="quote-schedules" />
    <Menu.ResourceItem name="quote-products" />
    <Menu.ResourceItem name="quote-location-types" />
    <SectionLabel label="app.menu.administration" />
    <Menu.ResourceItem name="users" />
  </Menu>
);

export default AppMenu;
