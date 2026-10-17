import { HttpError } from 'react-admin';
import { brandingText } from '../i18n/quoteDocuments';
import { translateApiMessage } from '../i18n/apiErrors';
import type { ApiErrorBody } from '../types/api';
import type { LogoInfo } from '../types/quoteDocuments';
import { authorizedFetch } from './authorizedFetch';

// The company logo printed on quote documents (SPEC-007). Like measurement files, the API serves it
// only to a bearer token, and its Cross-Origin-Resource-Policy blocks a plain <img src>: it is fetched.

export const companyLogoUrl = (apiUrl: string): string => `${apiUrl.replace(/\/+$/, '')}/quote-document-settings/1/logo`;

/** The company's logo, or null while it has none. */
export const fetchCompanyLogo = async (apiUrl: string, signal?: AbortSignal): Promise<Blob | null> => {
  try {
    const response: Response = await authorizedFetch(companyLogoUrl(apiUrl), { signal });
    return await response.blob();
  } catch (error: unknown) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
};

/**
 * Saves a logo (a PNG or JPEG already fitted by `fitLogo`). When the API refuses it, the error says
 * why in Spanish: too heavy, or which image check it failed.
 */
export const uploadCompanyLogo = async (apiUrl: string, logo: Blob): Promise<LogoInfo> => {
  try {
    const response: Response = await authorizedFetch(companyLogoUrl(apiUrl), {
      method: 'PUT',
      headers: { 'Content-Type': logo.type },
      body: logo,
    });
    return (await response.json()) as LogoInfo;
  } catch (error: unknown) {
    if (!(error instanceof HttpError)) throw error;
    if (error.status === 413) throw new HttpError(brandingText.logoTooLarge, 413, error.body);
    const reason: unknown = (error.body as ApiErrorBody | undefined)?.errors?.logo;
    if (error.status === 422 && typeof reason === 'string') {
      throw new HttpError(translateApiMessage(reason, error.message), 422, error.body);
    }
    throw error;
  }
};

/** Removes the logo; new documents show the trade name in its place. */
export const removeCompanyLogo = async (apiUrl: string): Promise<void> => {
  await authorizedFetch(companyLogoUrl(apiUrl), { method: 'DELETE' });
};
