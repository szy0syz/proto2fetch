import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: [
      'node_modules',
      'dist',
      'examples',
      'docs'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'examples/',
        'docs/',
        'src/cli.ts'
      ]
    },
    testTimeout: 10000
  }
});