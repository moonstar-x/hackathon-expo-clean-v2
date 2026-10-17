import type { Identifier } from 'react-admin';
import type { MeasurementFileKind } from '../types/api';
import type { FileRequestOptions } from '../types/measurements';
import { downloadName, saveBlob } from '../utils/files';
import { authorizedFetch } from './authorizedFetch';

// The API serves measurement files only to a bearer token, and its Cross-Origin-Resource-Policy
// blocks a plain <img src> from the admin's origin, so files are fetched (SPEC-004 §6.3).

/**
 * A file's address under the admin's own VITE_API_URL rather than the record's `files.*.url`, so it
 * keeps working when the admin reaches the API at another address than PUBLIC_URL (e.g. localhost).
 */
export const measurementFileUrl = (apiUrl: string, id: Identifier, kind: MeasurementFileKind): string =>
  `${apiUrl.replace(/\/+$/, '')}/measurements/${id}/files/${kind}`;

/**
 * Fetches a file with the stored token, like `httpClient` does for records: API errors become an
 * HttpError in Spanish (so a 401 signs out as usual) and an unreachable API a readable message.
 */
export const fetchMeasurementFile = (
  apiUrl: string,
  id: Identifier,
  kind: MeasurementFileKind,
  { download = false, signal }: FileRequestOptions = {},
): Promise<Response> => authorizedFetch(`${measurementFileUrl(apiUrl, id, kind)}${download ? '?download=1' : ''}`, { signal });

/** Downloads a file under the name the API gives it, such as `Apartamento-plano.png`. */
export const downloadMeasurementFile = async (apiUrl: string, id: Identifier, kind: MeasurementFileKind): Promise<void> => {
  const response: Response = await fetchMeasurementFile(apiUrl, id, kind, { download: true });
  const blob: Blob = await response.blob();
  saveBlob(blob, downloadName(response.headers.get('Content-Disposition'), `medicion-${id}-${kind}`));
};
