import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude:['src/test_utils.test.ts', 'node_modules']
  },
});
