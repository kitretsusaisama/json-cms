import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    include: [
      'src/**/*.performance.test.{js,mjs,cjs,ts,mts,cts}',
      'src/boilerplate/cache/__tests__/performance.test.{js,mjs,cjs,ts,mts,cts}',
      'src/boilerplate/**/__tests__/performance.test.{js,mjs,cjs,ts,mts,cts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      '**/*.unit.test.*',
      '**/*.integration.test.*',
      '**/*.e2e.test.*'
    ],
    testTimeout: 60000, // Longer timeout for performance tests
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Performance tests should run sequentially
        maxThreads: 1,
        minThreads: 1
      }
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/performance-results.json'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/boilerplate': resolve(__dirname, './src/boilerplate'),
      '@/app': resolve(__dirname, './src/app')
    }
  }
});