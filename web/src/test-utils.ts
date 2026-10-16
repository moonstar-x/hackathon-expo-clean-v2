import { vi } from 'vitest';

/** Builds a fetch Response with a JSON body. */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  });
}

/** Replaces global fetch with a mock and returns it. Restored automatically (unstubGlobals). */
export function mockFetch(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const r of responses) {
    if (r instanceof Error) fetchMock.mockRejectedValueOnce(r);
    else fetchMock.mockResolvedValueOnce(r);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Header value from a mocked fetch call's init, whatever shape the headers were given in. */
export function sentHeader(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}
