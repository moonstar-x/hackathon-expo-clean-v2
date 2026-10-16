import CategoryIcon from '@mui/icons-material/Category';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { esES } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';
import { useMemo } from 'react';
import { Admin, defaultDarkTheme, defaultLightTheme, Resource } from 'react-admin';
import type { AppConfig } from './config';
import { Dashboard } from './dashboard/Dashboard';
import { APP_LOCALE } from './i18n/locale';
import { i18nProvider } from './i18n/provider';
import { createAuthProvider } from './providers/authProvider';
import { createDataProvider } from './providers/dataProvider';
import { CategoryCreate, CategoryEdit, CategoryList } from './resources/categories';
import { ProductCreate, ProductEdit, ProductList, ProductShow } from './resources/products';
import { StockMovementCreate, StockMovementList, StockMovementShow } from './resources/stockMovements';
import { SupplierCreate, SupplierEdit, SupplierList } from './resources/suppliers';
import type { Product } from './types';

const localizedComponents = { components: { RaDateField: { defaultProps: { locales: APP_LOCALE } } } };
const lightTheme = createTheme(defaultLightTheme, esES, localizedComponents);
const darkTheme = createTheme(defaultDarkTheme, esES, localizedComponents);

export default function App({ config }: { config: AppConfig }) {
  const dataProvider = useMemo(() => createDataProvider(config.apiUrl), [config.apiUrl]);
  const authProvider = useMemo(() => createAuthProvider(config.apiUrl), [config.apiUrl]);

  return (
    <Admin
      title={config.appTitle}
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      theme={lightTheme}
      darkTheme={darkTheme}
      dashboard={Dashboard}
      // No `requireAuth`: with React 19 + react-router 7 it loops between LogoutOnMount and
      // /login when logged out. Resource views check auth themselves, and the dashboard is
      // wrapped in <Authenticated>, so nothing is fetched before checkAuth passes.
      disableTelemetry
    >
      <Resource
        name="products"
        icon={Inventory2Icon}
        list={ProductList}
        create={ProductCreate}
        edit={ProductEdit}
        show={ProductShow}
        recordRepresentation={(record: Product) => `${record.sku} — ${record.name}`}
      />
      <Resource
        name="stock-movements"
        icon={SwapVertIcon}
        list={StockMovementList}
        create={StockMovementCreate}
        show={StockMovementShow}
        recordRepresentation={(record) => `Movimiento n.º ${record.id}`}
      />
      <Resource
        name="categories"
        icon={CategoryIcon}
        list={CategoryList}
        create={CategoryCreate}
        edit={CategoryEdit}
        recordRepresentation="name"
      />
      <Resource
        name="suppliers"
        icon={LocalShippingIcon}
        list={SupplierList}
        create={SupplierCreate}
        edit={SupplierEdit}
        recordRepresentation="name"
      />
    </Admin>
  );
}
