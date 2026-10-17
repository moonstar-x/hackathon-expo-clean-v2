import type { Identifier } from 'react-admin';
import { downloadName, saveBlob } from '../utils/files';
import { authorizedFetch } from './authorizedFetch';

/** Downloads a TDR document's original file under its own name (SPEC-009 §5.1). */
export const downloadTdrFile = async (apiUrl: string, id: Identifier, fallback: string): Promise<void> => {
  const response: Response = await authorizedFetch(`${apiUrl.replace(/\/+$/, '')}/tdr-documents/${id}/file?download=1`);
  saveBlob(await response.blob(), downloadName(response.headers.get('Content-Disposition'), fallback));
};
