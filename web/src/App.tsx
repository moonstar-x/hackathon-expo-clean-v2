import { useMemo, type ReactElement } from 'react';
import { Admin, CustomRoutes, Resource, type AuthProvider, type ResourceProps } from 'react-admin';
import { Navigate, Route } from 'react-router-dom';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import Dashboard from './components/dashboard/Dashboard';
import LoginPage from './components/login/LoginPage';
import { i18nProvider } from './i18n';
import AppLayout from './Layout';
import { createAuthProvider } from './providers/authProvider';
import { createDataProvider } from './providers/dataProvider';
import categories from './resources/categories';
import measurements from './resources/measurements';
import products from './resources/products';
import CompanySettings from './quoteDocuments/CompanySettings';
import { QuoteDocumentRoute } from './quoteDocuments/QuoteDocumentRoute';
import TemplateSettings from './quoteDocuments/TemplateSettings';
import { quoteCatalogs, quoteParameters } from './resources/quote-settings';
import quotes from './resources/quotes';
import stockMovements from './resources/stock-movements';
import suppliers from './resources/suppliers';
import users from './resources/users';
import { darkTheme, lightTheme } from './theme';
import type { AppProps } from './types/config';
import type { InventoryDataProvider } from './types/providers';

const App = ({ config }: AppProps): ReactElement => {
  const dataProvider: InventoryDataProvider = useMemo(
    (): InventoryDataProvider => createDataProvider(config.apiUrl),
    [config.apiUrl],
  );
  const authProvider: AuthProvider = useMemo((): AuthProvider => createAuthProvider(config.apiUrl), [config.apiUrl]);

  return (
    <Admin
      title={config.appTitle}
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      layout={AppLayout}
      loginPage={LoginPage}
      dashboard={Dashboard}
      theme={lightTheme}
      darkTheme={darkTheme}
      defaultTheme="light"
      // No `requireAuth`: with React 19 + react-router 7 it loops between LogoutOnMount and
      // /login when logged out. Resource views check auth themselves, the dashboard is wrapped in
      // <Authenticated>, and the login page sends a signed-in user home.
      disableTelemetry
    >
      <Resource name="measurements" {...measurements} />
      <Resource name="quotes" {...quotes} />
      <Resource name="products" {...products} />
      <Resource name="stock-movements" {...stockMovements} />
      <Resource name="categories" {...categories} />
      <Resource name="suppliers" {...suppliers} />
      <Resource name="quote-parameters" {...quoteParameters} />
      {quoteCatalogs.map(
        ([name, resource]: [string, Omit<ResourceProps, 'name'>]): ReactElement => (
          <Resource key={name} name={name} {...resource} />
        ),
      )}
      <CustomRoutes>
        <Route path="/quotes/:id/document" element={<QuoteDocumentRoute />} />
        {/* The quote documents' settings (one record) as two pages under Administración. */}
        <Route path="/template" element={<AuthenticatedRoute><TemplateSettings /></AuthenticatedRoute>} />
        <Route path="/company" element={<AuthenticatedRoute><CompanySettings /></AuthenticatedRoute>} />
        {/* Their former single page, for old links and bookmarks. Exactly this path: a wider one would
            also catch react-admin's own redirects to the resource's list. */}
        <Route path="/quote-document-settings/1" element={<Navigate to="/company" replace />} />
      </CustomRoutes>
      <Resource name="users" {...users} />
    </Admin>
  );
};

export default App;
