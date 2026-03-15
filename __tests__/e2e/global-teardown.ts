/**
 * Global teardown for E2E tests
 * Cleans up test environment and data
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  // Launch browser for cleanup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

    // Clean up test data
    await cleanupTestData(page, baseURL);

    // Clean up test files
    await cleanupTestFiles();

    console.log('✅ E2E test environment cleanup complete');

  } catch (error) {
    console.error('❌ E2E cleanup failed:', error);
    // Don't throw error in cleanup to avoid masking test failures
  } finally {
    await browser.close();
  }
}

async function cleanupTestData(page: any, baseURL: string) {
  console.log('🗑️  Cleaning up test data...');

  // Delete test pages
  const testPageSlugs = [
    'e2e-test-page',
    'lazy-test-page',
    'error-test-page',
    'dynamic-test-page',
    'draft-test-page',
    'tenant1-page'
  ];

  for (const slug of testPageSlugs) {
    try {
      await page.request.delete(`${baseURL}/api/cms/pages/${slug}`, {
        headers: {
          'Authorization': 'Bearer test-auth-token',
          'X-Tenant-ID': 'test-tenant'
        }
      });
    } catch (error) {
      // Page might not exist, that's okay
    }
  }

  // Delete test blocks
  const testBlockIds = [
    'e2e-test-block',
    'hero-block',
    'content-block',
    'cta-block'
  ];

  for (const id of testBlockIds) {
    try {
      await page.request.delete(`${baseURL}/api/cms/blocks/${id}`, {
        headers: {
          'Authorization': 'Bearer test-auth-token',
          'X-Tenant-ID': 'test-tenant'
        }
      });
    } catch (error) {
      // Block might not exist, that's okay
    }
  }

  // Delete test components
  const testComponentKeys = [
    'test-component',
    'e2e-test-component'
  ];

  for (const key of testComponentKeys) {
    try {
      await page.request.delete(`${baseURL}/api/cms/components/${key}`, {
        headers: {
          'Authorization': 'Bearer test-auth-token',
          'X-Tenant-ID': 'test-tenant'
        }
      });
    } catch (error) {
      // Component might not exist, that's okay
    }
  }

  // Clean up test tenant (if needed)
  try {
    await page.request.delete(`${baseURL}/api/cms/tenants/e2e-test-tenant`, {
      headers: {
        'Authorization': 'Bearer test-admin-token'
      }
    });
  } catch (error) {
    // Tenant might not exist or deletion might be restricted
  }

  console.log('✅ Test data cleanup complete');
}

async function cleanupTestFiles() {
  console.log('📁 Cleaning up test files...');

  const fs = await import('fs/promises');
  const path = await import('path');

  // Clean up test data directory
  const testDataDir = path.resolve('./test-data');
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist
  }

  // Clean up temporary test files
  const tempFiles = [
    './temp-test-config.json',
    './test-cache.json',
    './test-session.json'
  ];

  for (const file of tempFiles) {
    try {
      await fs.unlink(file);
    } catch (error) {
      // File might not exist
    }
  }

  console.log('✅ Test files cleanup complete');
}

export default globalTeardown;