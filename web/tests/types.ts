// Types of the test helpers.
import type { QueryClient } from '@tanstack/react-query';
import type { AuthProvider, DataProvider, RaRecord, Store } from 'react-admin';
import type { Mock } from 'vitest';

export interface AdminRenderOptions {
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  record?: RaRecord;
  resource?: string;
  store?: Store;
  queryClient?: QueryClient;
  /** Renders inside a MemoryRouter at this URL; the test declares the <Routes> it needs. */
  at?: string;
}

/** What the jsdom matchMedia shim returns. */
export interface MediaQueryListStub {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: () => void;
  removeEventListener: () => void;
  addListener: () => void;
  removeListener: () => void;
  dispatchEvent: () => boolean;
}

export type FetchMock = Mock<typeof fetch>;
