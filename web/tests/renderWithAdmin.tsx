// Wraps a unit in the react-admin context its hooks need, as in react-admin's UnitTesting guide:
// the app's Spanish i18n (so assertions read the real copy), a fresh memoryStore per render, a
// query client that never retries, a fake dataProvider, a signed-in authProvider, the app theme,
// notifications, and optionally a record and resource context.
import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  AdminContext,
  Notification,
  RecordContextProvider,
  ResourceContextProvider,
  memoryStore,
  testDataProvider,
  type AuthProvider,
  type UserIdentity,
} from 'react-admin';
import { AppConfigContext } from '../src/AppConfigContext';
import { i18nProvider } from '../src/i18n';
import { lightTheme } from '../src/theme';
import type { AppConfig } from '../src/types/config';
import type { AdminRenderOptions } from './types';

export const TEST_CONFIG: AppConfig = { apiUrl: 'http://api.test/api', appTitle: 'Inventario de limpieza', currency: 'USD' };

/** An authProvider signed in as `identity` (Ana, by default). */
export const authProviderFor = (
  identity: UserIdentity = { id: 1, fullName: 'Ana Pérez', email: 'ana@example.com' },
): AuthProvider => ({
  login: (): Promise<void> => Promise.resolve(),
  logout: (): Promise<void> => Promise.resolve(),
  checkAuth: (): Promise<void> => Promise.resolve(),
  checkError: (): Promise<void> => Promise.resolve(),
  getIdentity: (): Promise<UserIdentity> => Promise.resolve(identity),
  getPermissions: (): Promise<undefined> => Promise.resolve(undefined),
});

export const createTestQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

export const withAdmin = (ui: ReactNode, options: AdminRenderOptions = {}): ReactElement => {
  const {
    dataProvider = testDataProvider(),
    authProvider = authProviderFor(),
    record,
    resource,
    store = memoryStore(),
    queryClient = createTestQueryClient(),
  }: AdminRenderOptions = options;
  let content: ReactNode = ui;
  if (record) content = <RecordContextProvider value={record}>{content}</RecordContextProvider>;
  if (resource) content = <ResourceContextProvider value={resource}>{content}</ResourceContextProvider>;
  return (
    <AppConfigContext.Provider value={TEST_CONFIG}>
      <AdminContext
        dataProvider={dataProvider}
        authProvider={authProvider}
        i18nProvider={i18nProvider}
        store={store}
        queryClient={queryClient}
        theme={lightTheme}
      >
        {content}
        <Notification />
      </AdminContext>
    </AppConfigContext.Provider>
  );
};

export const renderWithAdmin = (ui: ReactNode, options?: AdminRenderOptions): RenderResult => {
  const admin: ReactElement = withAdmin(ui, options);
  // react-admin reuses a router it finds around it, so routed views get their URL from here.
  return render(options?.at ? <MemoryRouter initialEntries={[options.at]}>{admin}</MemoryRouter> : admin);
};
