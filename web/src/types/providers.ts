// Types of the providers that connect react-admin to the inventory API.
import type { DataProvider } from 'react-admin';
import type { Quote, QuotePreview, SummaryEdits, WasteControl, ZonePatch } from './quotes';
import type { Stats } from './api';
import type { TdrDocument } from './tdr';

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
  /** Queues a TDR document's analysis again (SPEC-009 §5.1); it replaces the edits. */
  analyzeTdr: (id:number) => Promise<TdrDocument>;
  /** Creates the quote of a reviewed TDR document. */
  createTdrQuote: (id:number) => Promise<Quote>;
  /** `zones`, when given, replace the saved ones as PUT /quotes/:id takes them: every zone, by id, with only what changes. */
  previewQuote: (id:number,edits:SummaryEdits,zones?:({ id?: number } & ZonePatch)[]) => Promise<QuotePreview>;
}
