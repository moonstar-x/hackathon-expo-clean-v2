import { HttpError, type Identifier } from 'react-admin';
import { NETWORK_ERROR_MESSAGE } from '../constants/http';
import { translateApiError } from '../i18n/apiErrors';
import type { ApiErrorBody, MeasurementFileKind } from '../types/api';
import type { FileRequestOptions } from '../types/measurements';
import type { StoredAuth } from '../types/providers';
import { downloadName, saveBlob } from '../utils/files';
import { readAuth } from './authStorage';

// The API serves measurement files only to a bearer token, and its Cross-Origin-Resource-Policy
// blocks a plain <img src> from the admin's origin, so files are fetched (SPEC-004 §6.3).

/**
 * A file's address under the admin's own VITE_API_URL rather than the record's `files.*.url`, so it
 * keeps working when the admin reaches the API at another address than PUBLIC_URL (e.g. localhost).
 */
export const measurementFileUrl = (apiUrl: string, id: Identifier, kind: MeasurementFileKind): string =>
  `${apiUrl.replace(/\/+$/, '')}/measurements/${id}/files/${kind}`;

/** The `message` and `code` of an error response, when it has a JSON body. */
const errorBody = async (response: Response): Promise<ApiErrorBody> => {
  try {
    const body: unknown = await response.json();
    if (body === null || typeof body !== 'object') return {};
    const { message, code }: ApiErrorBody = body as ApiErrorBody;
    return { message, code };
  } catch {
    return {};
  }
};

/**
 * Fetches a file with the stored token, like `httpClient` does for records: API errors become an
 * HttpError in Spanish (so a 401 signs out as usual) and an unreachable API a readable message.
 */
export const fetchMeasurementFile = async (
  apiUrl: string,
  id: Identifier,
  kind: MeasurementFileKind,
  { download = false, signal }: FileRequestOptions = {},
): Promise<Response> => {
  const auth: StoredAuth | null = readAuth();
  const url: string = `${measurementFileUrl(apiUrl, id, kind)}${download ? '?download=1' : ''}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}, signal });
  } catch (error: unknown) {
    if (error instanceof TypeError) throw new Error(NETWORK_ERROR_MESSAGE, { cause: error });
    throw error;
  }
  if (!response.ok) {
    const body: ApiErrorBody = await errorBody(response);
    throw new HttpError(translateApiError(body.message, body.code), response.status, body);
  }
  return response;
};

/** Downloads a file under the name the API gives it, such as `Apartamento-plano.png`. */
export const downloadMeasurementFile = async (apiUrl: string, id: Identifier, kind: MeasurementFileKind): Promise<void> => {
  const response: Response = await fetchMeasurementFile(apiUrl, id, kind, { download: true });
  const blob: Blob = await response.blob();
  saveBlob(blob, downloadName(response.headers.get('Content-Disposition'), `medicion-${id}-${kind}`));
};
