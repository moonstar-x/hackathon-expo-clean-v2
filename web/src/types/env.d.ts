/// <reference types="vite/client" />

// Variables read from web/.env (see .env.example).
interface ImportMetaEnv {
  /** Base URL of the API including `/api`, e.g. `https://inventory.example.com/api`. */
  readonly VITE_API_URL?: string;
  /** Shown in the app bar, the sign-in page and the document title. Defaults to "Inventario de limpieza". */
  readonly VITE_APP_TITLE?: string;
  /** ISO 4217 currency code used to display money. Defaults to "USD". */
  readonly VITE_CURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
