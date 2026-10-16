import CategoryIcon from '@mui/icons-material/Category';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { useMemo } from 'react';
import { Admin, Resource } from 'react-admin';
import type { AppConfig } from './config';
import { Dashboard } from './dashboard/Dashboard';
import { createAuthProvider } from './providers/authProvider';
import { createDataProvider } from './providers/dataProvider';
import { CategoryCreate, CategoryEdit, CategoryList } from './resources/categories';
import { ProductCreate, ProductEdit, ProductList, ProductShow } from './resources/products';
import { StockMovementCreate, StockMovementList, StockMovementShow } from './resources/stockMovements';
import { SupplierCreate, SupplierEdit, SupplierList } from './resources/suppliers';
import type { Product } from './types';

export default function App({ config }: { config: AppConfig }) {
  const dataProvider = useMemo(() => createDataProvider(config.apiUrl), [config.apiUrl]);
  const authProvider = useMemo(() => createAuthProvider(config.apiUrl), [config.apiUrl]);

  return (
    <Admin
      title={config.appTitle}
      dataProvider={dataProvider}
      authProvider={authProvider}
      dashboard={Dashboard}
      // No `requireAuth`: with React 19 + react-router 7 it loops between LogoutOnMount and
      // /login when logged out. Resource views check auth themselves, and the dashboard is
      // wrapped in <Authenticated>, so nothing is fetched before checkAuth passes.
      disableTelemetry
    >
      <Resource
        name="products"
        options={{ label: 'Products' }}
        icon={Inventory2Icon}
        list={ProductList}
        create={ProductCreate}
        edit={ProductEdit}
        show={ProductShow}
        recordRepresentation={(record: Product) => `${record.sku} — ${record.name}`}
      />
      <Resource
        name="stock-movements"
        options={{ label: 'Stock movements' }}
        icon={SwapVertIcon}
        list={StockMovementList}
        create={StockMovementCreate}
        show={StockMovementShow}
        recordRepresentation={(record) => `Movement #${record.id}`}
      />
      <Resource
        name="categories"
        options={{ label: 'Categories' }}
        icon={CategoryIcon}
        list={CategoryList}
        create={CategoryCreate}
        edit={CategoryEdit}
        recordRepresentation="name"
      />
      <Resource
        name="suppliers"
        options={{ label: 'Suppliers' }}
        icon={LocalShippingIcon}
        list={SupplierList}
        create={SupplierCreate}
        edit={SupplierEdit}
        recordRepresentation="name"
      />
    </Admin>
  );
}
