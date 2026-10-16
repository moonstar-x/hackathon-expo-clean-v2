import { fetchUtils, HttpError } from 'react-admin';
import { readAuth } from './authStorage';

export const NETWORK_ERROR_MESSAGE = 'Cannot reach the inventory API. Check that it is running and try again.';

/**
 * When the API returns field errors, react-admin shows them under the inputs and a
 * generic "form is not valid" toast. Adding `root.serverError` makes the toast show
 * the API's top-level `message` instead (e.g. "SKU already exists").
 */
function withServerMessage(error: HttpError): HttpError {
  const body = error.body as { message?: unknown; errors?: Record<string, unknown> } | undefined;
  if (body?.errors && typeof body.errors === 'object' && typeof body.message === 'string') {
    body.errors = { ...body.errors, root: { serverError: body.message } };
  }
  return error;
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
