import simpleRestProvider from 'ra-data-simple-rest';
import type { CreateParams, CreateResult, DataProvider, GetListParams, GetListResult, RaRecord } from 'react-admin';
import type { Quote, QuotePreview, SummaryEdits, WasteControl, ZonePatch } from '../types/quotes';
import type { Stats } from '../types/api';
import type { TdrDocument } from '../types/tdr';
import type { HttpResponse, InventoryDataProvider } from '../types/providers';
import { httpClient } from './httpClient';

/** The upload of a TDR document as the API takes it: one multipart `file` (SPEC-009 §5.1). */
const tdrUpload = (data: { file?: { rawFile?: File } }): FormData => {
  const body: FormData = new FormData();
  if (data.file?.rawFile) body.append('file', data.file.rawFile, data.file.rawFile.name);
  return body;
};

/** The off-the-shelf simple REST provider plus `getStats()` for the dashboard. */
export const createDataProvider = (apiUrl: string): InventoryDataProvider => {
  const base: DataProvider = simpleRestProvider(apiUrl, httpClient);
  return {
    ...base,
    getList: <R extends RaRecord>(resource: string,params: GetListParams): Promise<GetListResult<R>> => {
      const filter: Record<string,unknown> = (params.filter ?? {}) as Record<string,unknown>;
      return base.getList<R>(resource,resource === 'quote-location-types' && filter.zoneTypeId === 'unmapped' ? { ...params,filter:{ ...filter,zoneTypeId:null } } : params);
    },
    // FormData: fetchJson leaves its Content-Type to the browser, which adds the multipart boundary.
    create: async <R extends RaRecord>(resource: string, params: CreateParams): Promise<CreateResult<R>> =>
      resource === 'tdr-documents'
        ? { data: (await httpClient(`${apiUrl}/tdr-documents`, { method: 'POST', body: tdrUpload(params.data as { file?: { rawFile?: File } }) })).json as R }
        : base.create<R>(resource, params),
    analyzeTdr: async (id:number): Promise<TdrDocument> => (await httpClient(`${apiUrl}/tdr-documents/${id}/analyze`,{ method:'POST' })).json as TdrDocument,
    createTdrQuote: async (id:number): Promise<Quote> => (await httpClient(`${apiUrl}/tdr-documents/${id}/quote`,{ method:'POST' })).json as Quote,
    quoteAction: async (id:number,action:'recalculate' | 'regenerate'): Promise<Quote> => (await httpClient(`${apiUrl}/quotes/${id}/${action}`,{ method:'POST' })).json as Quote,
    getWaste: async (id:number,period:string): Promise<WasteControl> => (await httpClient(`${apiUrl}/quotes/${id}/waste-controls/${period}`)).json as WasteControl,
    saveWaste: async (id:number,period:string,rows:{ productId:number;actual:number | null }[]): Promise<WasteControl> => (await httpClient(`${apiUrl}/quotes/${id}/waste-controls/${period}`,{ method:'PUT',body:JSON.stringify({ rows }) })).json as WasteControl,
    previewQuote: async (id:number,edits:SummaryEdits,zones?:({ id?: number } & ZonePatch)[]): Promise<QuotePreview> => (await httpClient(`${apiUrl}/quotes/${id}/preview`,{ method:'POST',body:JSON.stringify({ edits,zones }) })).json as QuotePreview,
    createMeasurementQuote: async (id:number): Promise<Quote> => (await httpClient(`${apiUrl}/measurements/${id}/quote`,{ method:'POST' })).json as Quote,
    getStats: async (): Promise<Stats> => {
      const { json }: HttpResponse<unknown> = await httpClient(`${apiUrl}/stats`);
      return json as Stats;
    },
  };
};
