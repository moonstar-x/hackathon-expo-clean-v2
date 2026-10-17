import { HttpError } from 'react-admin';
import type { SignatureInfo } from '../types/quoteDocuments';
import { readBase64 } from '../utils/files';
import { authorizedFetch } from './authorizedFetch';

// The company's electronic signature (a .p12 and its password), which signs every quote PDF. The API
// answers with the certificate's details only; the file and the password never come back.

export const companySignatureUrl = (apiUrl: string): string => `${apiUrl.replace(/\/+$/, '')}/quote-document-settings/1/signature`;

/** The signature's certificate, or null while the company has none. */
export const fetchCompanySignature = async (apiUrl: string, signal?: AbortSignal): Promise<SignatureInfo | null> => {
  try {
    const response: Response = await authorizedFetch(companySignatureUrl(apiUrl), { signal });
    return (await response.json()) as SignatureInfo;
  } catch (error: unknown) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
};

/**
 * Loads a .p12 with its password, replacing the current signature. A refusal is an HttpError whose body's
 * `errors` say which of the two to fix (a wrong password, an expired certificate...).
 */
export const uploadCompanySignature = async (apiUrl: string, file: Blob, password: string): Promise<SignatureInfo> => {
  const response: Response = await authorizedFetch(companySignatureUrl(apiUrl), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: await readBase64(file), password }),
  });
  return (await response.json()) as SignatureInfo;
};

/** Removes the signature; new PDFs leave the space to sign by hand. */
export const removeCompanySignature = async (apiUrl: string): Promise<void> => {
  await authorizedFetch(companySignatureUrl(apiUrl), { method: 'DELETE' });
};
