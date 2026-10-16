import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite';

// https://vite.dev/config/
export const viteConfig = ({ mode }: ConfigEnv): UserConfig => {
  // '' loads every variable, not only VITE_*. PORT stays server-side: only
  // VITE_* variables are ever exposed to the browser bundle.
  const env: Record<string, string> = loadEnv(mode, process.cwd(), '');
  const port: number = Number.parseInt(env.PORT ?? '', 10) || 5173;

  return {
    plugins: [react()],
    // react-admin + MUI is ~1.1 MB minified (~350 kB gzip) in a single chunk; that is expected for an admin SPA.
    build: { chunkSizeWarningLimit: 1500 },
    server: { port, strictPort: true },
    preview: { port, strictPort: true },
  };
};

export default defineConfig(viteConfig);
