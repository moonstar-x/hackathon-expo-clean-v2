import { fetchUtils, HttpError } from 'react-admin';
import { NETWORK_ERROR_MESSAGE } from '../constants/http';
import { translateApiError, translateApiMessage } from '../i18n/apiErrors';
import type { ApiErrorBody } from '../types/api';
import type { HttpResponse, StoredAuth } from '../types/providers';
import { readAuth } from './authStorage';

/**
 * When the API returns field errors, react-admin shows them under the inputs and a
 * generic "form is not valid" toast. Adding `root.serverError` makes the toast show
 * the API's top-level `message` instead (e.g. "SKU already exists").
 */
const withServerMessage = (error: HttpError): HttpError => {
  const body: ApiErrorBody | undefined = error.body as ApiErrorBody | undefined;
  const message: string = translateApiError(body?.message ?? error.message, body?.code);
  const errors: Record<string, string> | undefined =
    body?.errors && typeof body.errors === 'object'
      ? Object.fromEntries(
          Object.entries(body.errors).map(([field, value]: [string, unknown]): [string, string] => [
            field,
            translateApiMessage(value, 'Valor no válido.'),
          ]),
        )
      : undefined;
  return new HttpError(message, error.status, {
    ...body,
    message,
    ...(errors ? { errors: { ...errors, root: { serverError: message } } } : {}),
  });
};

/**
 * `fetchUtils.fetchJson` plus the stored bearer token. Network failures
 * (API down, CORS refused) become a readable error instead of "Failed to fetch".
 */
export const httpClient = async (url: string, options: fetchUtils.Options = {}): Promise<HttpResponse<unknown>> => {
  const auth: StoredAuth | null = readAuth();
  const finalOptions: fetchUtils.Options = auth?.token
    ? { ...options, user: { authenticated: true, token: `Bearer ${auth.token}` } }
    : options;
  try {
    return await fetchUtils.fetchJson(url, finalOptions);
  } catch (error: unknown) {
    if (error instanceof HttpError) throw withServerMessage(error);
    if (error instanceof TypeError) throw new Error(NETWORK_ERROR_MESSAGE, { cause: error });
    throw error;
  }
};
