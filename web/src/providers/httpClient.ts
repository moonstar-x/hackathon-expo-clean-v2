import { fetchUtils, HttpError } from 'react-admin';
import { translateApiError, translateApiMessage } from '../i18n/apiErrors';
import { readAuth } from './authStorage';

export const NETWORK_ERROR_MESSAGE = 'No se puede conectar con el servidor de inventario. Comprueba la conexión e inténtalo de nuevo.';

/**
 * When the API returns field errors, react-admin shows them under the inputs and a
 * generic "form is not valid" toast. Adding `root.serverError` makes the toast show
 * the API's top-level `message` instead (e.g. "SKU already exists").
 */
function withServerMessage(error: HttpError): HttpError {
  const body = error.body as { code?: unknown; message?: unknown; errors?: Record<string, unknown> } | undefined;
  const message = translateApiError(body?.message ?? error.message, body?.code);
  const errors = body?.errors && typeof body.errors === 'object'
    ? Object.fromEntries(Object.entries(body.errors).map(([field, value]) => [field, translateApiMessage(value, 'Valor no válido.')]))
    : undefined;
  return new HttpError(message, error.status, {
    ...body,
    message,
    ...(errors ? { errors: { ...errors, root: { serverError: message } } } : {}),
  });
}

/**
 * `fetchUtils.fetchJson` plus the stored bearer token. Network failures
 * (API down, CORS refused) become a readable error instead of "Failed to fetch".
 */
export async function httpClient(url: string, options: fetchUtils.Options = {}) {
  const auth = readAuth();
  const finalOptions: fetchUtils.Options = auth?.token
    ? { ...options, user: { authenticated: true, token: `Bearer ${auth.token}` } }
    : options;
  try {
    return await fetchUtils.fetchJson(url, finalOptions);
  } catch (error) {
    if (error instanceof HttpError) throw withServerMessage(error);
    if (error instanceof TypeError) throw new Error(NETWORK_ERROR_MESSAGE, { cause: error });
    throw error;
  }
}
