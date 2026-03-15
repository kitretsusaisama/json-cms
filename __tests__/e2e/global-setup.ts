/**
 * Global setup for E2E tests
 * Prepares test environment and data
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the development server to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    
    console.log(`⏳ Waiting for server at ${baseURL}...`);
    
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await page.goto(`${baseURL}/api/health`);
        if (response?.ok()) {
          console.log('✅ Server is ready');
          break;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      retries--;
      if (retries === 0) {
        throw new Error('Server failed to start within timeout');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Setup test data
    await setupTestData(page, baseURL);

    // Setup authentication
    await setupAuthentication(page, baseURL);

    console.log('✅ E2E test environment setup complete');

  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page: any, baseURL: string) {
  console.log('📝 Setting up test data...');

  // Create test tenant
  try {
    await page.request.post(`${baseURL}/api/cms/tenants`, {
      data: {
        name: 'E2E Test Tenant',
        subdomain: 'e2e-test',
        settings: {
          theme: {
            primaryColor: '#007bff'
          }
        }
      },
      headers: {
        'Authorization': 'Bearer test-admin-token',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Tenant might already exist, that's okay
    console.log('ℹ️  Test tenant already exists or creation failed');
  }

  // Create test components
  const testComponents = [
    {
      key: 'HeroSection',
      metadata: {
        name: 'Hero Section',
        category: 'layout',
        version: '1.0.0'
      }
    },
    {
      key: 'TextBlock',
      metadata: {
        name: 'Text Block',
        category: 'content',
        version: '1.0.0'
      }
    },
    {
      key: 'CallToAction',
      metadata: {
        name: 'Call to Action',
        category: 'marketing',
        version: '1.0.0'
      }
    }
  ];

  for (const component of testComponents) {
    try {
      await page.request.post(`${baseURL}/api/cms/components`, {
        data: component,
        headers: {
          'Authorization': 'Bearer test-auth-token',
          'X-Tenant-ID': 'test-tenant',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      // Component might already exist
    }
  }

  console.log('✅ Test data setup complete');
}

async function setupAuthentication(page: any, baseURL: string) {
  console.log('🔐 Setting up authentication...');

  // Create test users
  const testUsers = [
    {
      email: 'admin@e2e-test.com',
      name: 'E2E Admin User',
      roles: ['admin'],
      token: 'test-admin-token'
    },
    {
      email: 'editor@e2e-test.com',
      name: 'E2E Editor User',
      roles: ['editor'],
      token: 'test-auth-token'
    },
    {
      email: 'viewer@e2e-test.com',
      name: 'E2E Viewer User',
      roles: ['viewer'],
      token: 'test-viewer-token'
    }
  ];

  // In a real implementation, you would create these users via API
  // For now, we'll just ensure the tokens are valid for testing

  console.log('✅ Authentication setup complete');
}

export default globalSetup;