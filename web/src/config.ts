export interface AppConfig {
  /** API base URL including `/api`, without a trailing slash. */
  apiUrl: string;
  appTitle: string;
  currency: string;
}

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; errors: string[] };

export const DEFAULT_APP_TITLE = 'Cleaning Inventory';
export const DEFAULT_CURRENCY = 'USD';

type EnvSource = Partial<Record<'VITE_API_URL' | 'VITE_APP_TITLE' | 'VITE_CURRENCY', unknown>>;

const clean = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSupportedCurrency(code: string): boolean {
  try {
    new Intl.NumberFormat(undefined, { style: 'currency', currency: code });
    return /^[A-Za-z]{3}$/.test(code);
  } catch {
    return false;
  }
}

/**
 * Validates the build-time `VITE_*` variables. Vite inlines them when building,
 * so changing them requires a rebuild.
 */
export function parseConfig(env: EnvSource): ConfigResult {
  const errors: string[] = [];

  let apiUrl = clean(env.VITE_API_URL);
  if (!apiUrl) {
    errors.push('VITE_API_URL is not set. Set it to the API base URL including /api, e.g. https://api.example.com/api.');
  } else {
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (!isHttpUrl(apiUrl)) errors.push(`VITE_API_URL must be an absolute http(s) URL, got "${apiUrl}".`);
  }

  const currency = (clean(env.VITE_CURRENCY) ?? DEFAULT_CURRENCY).toUpperCase();
  if (!isSupportedCurrency(currency)) {
    errors.push(`VITE_CURRENCY must be an ISO 4217 currency code such as USD or EUR, got "${currency}".`);
  }

  if (errors.length > 0 || !apiUrl) return { ok: false, errors };
  return {
    ok: true,
    config: { apiUrl, appTitle: clean(env.VITE_APP_TITLE) ?? DEFAULT_APP_TITLE, currency },
  };
}

export const configResult: ConfigResult = parseConfig(import.meta.env);
