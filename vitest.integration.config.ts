import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    include: [
      'src/**/*.integration.test.{js,mjs,cjs,ts,mts,cts}',
      'src/app/api/**/__tests__/integration.test.{js,mjs,cjs,ts,mts,cts}',
      'src/boilerplate/**/__tests__/integration.test.{js,mjs,cjs,ts,mts,cts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      '**/*.unit.test.*',
      '**/*.e2e.test.*',
      '**/*.performance.test.*'
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
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