import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';
import type { ConfigEnv } from 'vite';
import { viteConfig } from './vite.config.ts';

// Two projects: `unit` for pure logic and `components` for react-admin units
// rendered in jsdom (react-admin's UnitTesting guide).
export default defineConfig(
  (env: ConfigEnv): ViteUserConfig =>
    mergeConfig(viteConfig(env), {
      test: {
        // Tests must not depend on a local .env file.
        env: { VITE_API_URL: 'http://api.test/api' },
        restoreMocks: true,
        unstubGlobals: true,
        projects: [
          {
            extends: true,
            test: { name: 'unit', environment: 'node', include: ['tests/lib/**/*.test.ts'] },
          },
          {
            extends: true,
            test: {
              name: 'components',
              environment: 'jsdom',
              include: ['tests/components/**/*.test.tsx'],
              setupFiles: ['./tests/setup.ts'],
              // Whole screens render in jsdom, many files at once: each passes in about a second
              // alone, but the default 5 s runs out when they share the CPU.
              testTimeout: 20_000,
            },
          },
        ],
        coverage: { provider: 'v8', include: ['src/**'], reporter: ['text', 'html'] },
      },
    }),
);
