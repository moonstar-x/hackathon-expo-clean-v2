import { TDR_BUSY, TDR_POLL_MS } from '../constants/tdr';
import type { TdrDocument } from '../types/tdr';

/** What react-query keeps: a list's page, an infinite list's pages, or one record. */
type QueryData = { data?: TdrDocument[]; pages?: { data: TdrDocument[] }[]; status?: string };

/** A list's or a page's TDR documents, whatever shape its query keeps them in (a page, pages, one record). */
const documentsIn = (data: unknown): TdrDocument[] => {
  if (!data || typeof data !== 'object') return [];
  const d: QueryData = data;
  if (Array.isArray(d.pages)) return d.pages.flatMap((page: { data: TdrDocument[] }): TdrDocument[] => page.data);
  if (Array.isArray(d.data)) return d.data;
  return typeof d.status === 'string' ? [data as TdrDocument] : [];
};

/** react-query's refetchInterval: ask again while an entry is still being analyzed, and stop after. */
export const tdrRefetchInterval = (query: { state: { data?: unknown } }): number | false =>
  documentsIn(query.state.data).some((doc: TdrDocument): boolean => TDR_BUSY.has(doc.status)) ? TDR_POLL_MS : false;

/** What an entry is called: the service the document names, else its file name. */
export const tdrName = (doc: Pick<TdrDocument, 'title' | 'fileName'>): string => doc.title ?? doc.fileName;
