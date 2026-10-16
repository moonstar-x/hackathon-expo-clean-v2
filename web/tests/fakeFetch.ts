import { vi } from 'vitest';
import type { FetchMock } from './types';

/** Builds a fetch Response with a JSON body. */
export const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  });

/** Replaces global fetch with a mock answering `responses` in order. Restored automatically (unstubGlobals). */
export const mockFetch = (...responses: Array<Response | Error>): FetchMock => {
  const fetchMock: FetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** Header value from a mocked fetch call's init, whatever shape the headers were given in. */
export const sentHeader = (init: RequestInit | undefined, name: string): string | null =>
  new Headers(init?.headers).get(name);
