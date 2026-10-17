import { HttpError } from 'react-admin';
import { NETWORK_ERROR_MESSAGE } from '../constants/http';
import { translateApiError } from '../i18n/apiErrors';
import type { ApiErrorBody } from '../types/api';
import type { StoredAuth } from '../types/providers';
import { readAuth } from './authStorage';

/** An error response's JSON body, whole (callers read its `code` and `errors`), when it has one. */
const errorBody = async (response: Response): Promise<ApiErrorBody> => {
  try {
    const body: unknown = await response.json();
    return body !== null && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
};

/**
 * `fetch` with the stored token, for what the data provider doesn't fetch (files, images), handled
 * like `httpClient` handles records: API errors become an HttpError in Spanish carrying the response's
 * body (so a 401 signs out as usual), and an unreachable API a readable message.
 */
export const authorizedFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const auth: StoredAuth | null = readAuth();
  const headers: Headers = new Headers(init.headers);
  if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`);
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
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
