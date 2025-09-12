import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['src/test-setup.ts'],
    alias: {
      $app: '/mock/app',
      $lib: '/src/lib'
    }
  },
  resolve: {
    conditions: ['browser']
  }
});