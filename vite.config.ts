import { defineConfig } from 'vitest/config';

// Just a basic config
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary'],
      reportsDirectory: './coverage',
    },
    environment: 'node',
  },
});
