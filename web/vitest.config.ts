import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Tests must not depend on a local .env file.
    env: { VITE_API_URL: 'http://api.test/api' },
    restoreMocks: true,
    unstubGlobals: true,
  },
});
