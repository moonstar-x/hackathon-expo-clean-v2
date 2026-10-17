import { HttpError } from 'react-admin';
import { NETWORK_ERROR_MESSAGE } from '../constants/http';
import { translateApiError } from '../i18n/apiErrors';
import type { ApiErrorBody } from '../types/api';
import type { DocumentExport, DocumentFormat, DocumentState, QuoteDocumentData } from '../types/quoteDocuments';
import type { StoredAuth } from '../types/providers';
import { downloadName } from '../utils/files';
import { readAuth } from './authStorage';
import { httpClient } from './httpClient';

export interface DocumentFile { blob: Blob; hash: string; name: string }
const url = (apiUrl: string, id: number): string => `${apiUrl.replace(/\/+$/, '')}/quotes/${id}/document`;
export const getDocumentState = async (apiUrl: string, id: number): Promise<DocumentState> => (await httpClient(url(apiUrl, id))).json as DocumentState;
export const putDocumentData = async (apiUrl: string, id: number, data: Partial<QuoteDocumentData>): Promise<DocumentState> => (await httpClient(url(apiUrl, id), { method: 'PUT', body: JSON.stringify(data) })).json as DocumentState;
export const getDocumentExports = async (apiUrl: string, id: number): Promise<DocumentExport[]> => (await httpClient(`${url(apiUrl, id)}/exports`)).json as DocumentExport[];
export const registerDocumentExport = async (apiUrl: string, id: number, format: DocumentFormat, contentHash: string): Promise<DocumentExport> => (await httpClient(`${url(apiUrl, id)}/exports`, { method: 'POST', body: JSON.stringify({ format, contentHash }) })).json as DocumentExport;
export const fetchDocumentFile = async (apiUrl: string, id: number, format: DocumentFormat, signal?: AbortSignal): Promise<DocumentFile> => {
  const auth: StoredAuth | null = readAuth();
  let response: Response;
  try { response = await fetch(`${url(apiUrl, id)}/${format}`, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}, signal }); }
  catch (error: unknown) { if (error instanceof TypeError) throw new Error(NETWORK_ERROR_MESSAGE, { cause: error }); throw error; }
  if (!response.ok) {
    let body: ApiErrorBody = {};
    try { body = await response.json() as ApiErrorBody; } catch { /* Use the status when no JSON body exists. */ }
    throw new HttpError(translateApiError(body.message, body.code), response.status, body);
  }
  return { blob: await response.blob(), hash: response.headers.get('X-Document-Hash') ?? '', name: downloadName(response.headers.get('Content-Disposition'), `Cotizacion-${id}.${format}`) };
};
