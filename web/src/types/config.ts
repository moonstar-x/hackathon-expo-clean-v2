// Types of the build-time configuration (config.ts).

export interface AppConfig {
  /** API base URL including `/api`, without a trailing slash. */
  apiUrl: string;
  appTitle: string;
  currency: string;
}

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; errors: string[] };

/** The `VITE_*` variables config.ts reads, as Vite inlines them. */
export type EnvSource = Partial<Record<'VITE_API_URL' | 'VITE_APP_TITLE' | 'VITE_CURRENCY', unknown>>;

export interface ConfigErrorPageProps {
  errors: string[];
}

export interface AppProps {
  config: AppConfig;
}
