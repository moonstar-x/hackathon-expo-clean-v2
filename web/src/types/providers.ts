// Types of the providers that connect react-admin to the inventory API.
import type { DataProvider } from 'react-admin';
import type { Quote, WasteControl } from './quotes';
import type { Stats } from './api';

/** What `httpClient` resolves with; `json` is the parsed body, typed by the caller. */
export interface HttpResponse<T> {
  status: number;
  headers: Headers;
  body: string;
  json: T;
}

/** The session kept in localStorage after signing in. */
export interface StoredAuth {
  token: string;
  /** ISO timestamp when the token expires. */
  expiresAt: string;
  userId: number;
  email: string;
  name: string | null;
}

/** What POST /auth/login answers with. */
export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: { id: number; email: string; name: string | null };
}

/** The credentials react-admin's login hands to `authProvider.login`. */
export interface LoginParams {
  username: string;
  password: string;
}

/** The simple REST provider plus `getStats()` for the dashboard. */
export interface InventoryDataProvider extends DataProvider {
  getStats: () => Promise<Stats>;
  quoteAction: (id:number,action:'recalculate' | 'regenerate') => Promise<Quote>;
  getWaste: (id:number,period:string) => Promise<WasteControl>;
  saveWaste: (id:number,period:string,rows:{ productId:number;actual:number | null }[]) => Promise<WasteControl>;
  createMeasurementQuote: (id:number) => Promise<Quote>;
}
