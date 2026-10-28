import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Same env files as `next dev` (.env.development.local wins), so DB tests hit the local database.
const env = loadEnv('development', process.cwd(), '');

// The tests create and delete rows, so never let them reach a shared database (.env.local holds
// production's Neon URL and would be used if .env.development.local were missing).
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
const dbHost = (() => {
  try { return new URL(env.DATABASE_URL ?? '').hostname; } catch { return ''; }
})();
if (!LOCAL_HOSTS.includes(dbHost)) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL points at "${dbHost || '(not set)'}", not a local database. ` +
    'Run `docker compose up -d postgres && npx prisma migrate deploy` and set DATABASE_URL in ' +
    '.env.development.local (see .env.example).'
  );
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env,
    // The integration tests share one database and some read global rows (e.g. every staff
    // account), so test files run one at a time to keep them from racing each other
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
