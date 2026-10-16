import type { AppConfig, ConfigResult, EnvSource } from './types/config';

export const DEFAULT_APP_TITLE: string = 'Inventario de limpieza';
export const DEFAULT_CURRENCY: string = 'USD';

const clean = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const isHttpUrl = (value: string): boolean => {
  try {
    const url: URL = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isSupportedCurrency = (code: string): boolean => {
  try {
    new Intl.NumberFormat(undefined, { style: 'currency', currency: code });
    return /^[A-Za-z]{3}$/.test(code);
  } catch {
    return false;
  }
};

/**
 * Validates the build-time `VITE_*` variables. Vite inlines them when building,
 * so changing them requires a rebuild.
 */
export const parseConfig = (env: EnvSource): ConfigResult => {
  const errors: string[] = [];

  let apiUrl: string | undefined = clean(env.VITE_API_URL);
  if (!apiUrl) {
    errors.push('VITE_API_URL no está definida. Indica la URL base de la API con /api, por ejemplo https://api.example.com/api.');
  } else {
    apiUrl = apiUrl.replace(/\/+$/, '');
    if (!isHttpUrl(apiUrl)) errors.push(`VITE_API_URL debe ser una URL absoluta http(s); se recibió "${apiUrl}".`);
  }

  const currency: string = (clean(env.VITE_CURRENCY) ?? DEFAULT_CURRENCY).toUpperCase();
  if (!isSupportedCurrency(currency)) {
    errors.push(`VITE_CURRENCY debe ser un código de moneda ISO 4217, como USD o EUR; se recibió "${currency}".`);
  }

  if (errors.length > 0 || !apiUrl) return { ok: false, errors };
  const config: AppConfig = { apiUrl, appTitle: clean(env.VITE_APP_TITLE) ?? DEFAULT_APP_TITLE, currency };
  return { ok: true, config };
};

export const configResult: ConfigResult = parseConfig(import.meta.env);
