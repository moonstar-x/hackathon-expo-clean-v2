/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API including `/api`, e.g. `https://inventory.example.com/api`. */
  readonly VITE_API_URL?: string;
  /** Shown in the app bar and the document title. Defaults to "Cleaning Inventory". */
  readonly VITE_APP_TITLE?: string;
  /** ISO 4217 currency code used to display money. Defaults to "USD". */
  readonly VITE_CURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
