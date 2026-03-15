/**
 * End-to-End Tests for Page Rendering and Content Management Workflows
 * Tests complete user workflows from content creation to page rendering
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api/cms`;

// Mock authentication token
const AUTH_TOKEN = 'test-auth-token';
const TENANT_ID = 'test-tenant';

// Test data
const testPageData = {
  slug: 'e2e-test-page',
  title: 'E2E Test Page',
  description: 'A page created for end-to-end testing',
  content: {
    blocks: [
      {
        id: 'hero-block',
        componentType: 'HeroSection',
        props: {
          title: 'Welcome to E2E Testing',
          subtitle: 'Testing the complete workflow',
          backgroundImage: '/images/hero-bg.jpg'
        }
      },
      {
        id: 'content-block',
        componentType: 'TextBlock',
        props: {
          text: 'This is a test page created through the E2E testing workflow.'
        }
      },
      {
        id: 'cta-block',
        componentType: 'CallToAction',
        props: {
          title: 'Get Started',
          buttonText: 'Learn More',
          buttonUrl: '/learn-more'
        }
      }
    ]
  },
  status: 'published',
  seo: {
    title: 'E2E Test Page - SEO Title',
    description: 'SEO description for the E2E test page',
    canonical: `${BASE_URL}/e2e-test-page`,
    robots: 'index,follow'
  }
};

const testBlockData = {
  id: 'e2e-test-block',
  name: 'E2E Test Block',
  description: 'A block created for end-to-end testing',
  category: 'content',
  tags: ['e2e', 'test'],
  content: {
    componentType: 'FeatureCard',
    props: {
      title: 'Test Feature',
      description: 'This is a test feature card',
      icon: 'star'
    }
  },
  constraints: {
    maxInstances: 3
  },
  variants: [
    {
      name: 'primary',
      description: 'Primary variant',
      props: { variant: 'primary' }
    }
  ]
};

// Helper functions
async function authenticateUser(page: Page) {
  // Set authentication cookies/tokens
  await page.addInitScript((token) => {
    localStorage.setItem('auth-token', token);
  }, AUTH_TOKEN);
  
  await page.addInitScript((tenantId) => {
    localStorage.setItem('tenant-id', tenantId);
  }, TENANT_ID);
}

async function createPageViaAPI(page: Page, pageData: any) {
  const response = await page.request.post(`${API_BASE_URL}/pages`, {
    data: pageData,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'X-Tenant-ID': TENANT_ID,
      'Content-Type': 'application/json'
    }
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

async function createBlockViaAPI(page: Page, blockData: any) {
  const response = await page.request.post(`${API_BASE_URL}/blocks`, {
    data: blockData,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'X-Tenant-ID': TENANT_ID,
      'Content-Type': 'application/json'
    }
  });
  
  expect(response.ok()).toBeTruthy();
  return await response.json();
}

async function deletePageViaAPI(page: Page, slug: string) {
  await page.request.delete(`${API_BASE_URL}/pages/${slug}`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'X-Tenant-ID': TENANT_ID
    }
  });
}

async function deleteBlockViaAPI(page: Page, id: string) {
  await page.request.delete(`${API_BASE_URL}/blocks/${id}`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'X-Tenant-ID': TENANT_ID
    }
  });
}

test.describe('Page Rendering E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await deletePageViaAPI(page, testPageData.slug);
    await deleteBlockViaAPI(page, testBlockData.id);
  });

  test('should render a complete page with multiple blocks', async ({ page }) => {
    // Create test page via API
    await createPageViaAPI(page, testPageData);

    // Navigate to the rendered page
    await page.goto(`${BASE_URL}/${testPageData.slug}`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title and meta tags
    await expect(page).toHaveTitle(testPageData.seo.title);
    
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', testPageData.seo.description);

    const canonicalLink = page.locator('link[rel="canonical"]');
    await expect(canonicalLink).toHaveAttribute('href', testPageData.seo.canonical);

    // Verify hero section renders correctly
    const heroSection = page.locator('[data-component="HeroSection"]');
    await expect(heroSection).toBeVisible();
    await expect(heroSection.locator('h1')).toContainText('Welcome to E2E Testing');
    await expect(heroSection.locator('p')).toContainText('Testing the complete workflow');

    // Verify text block renders correctly
    const textBlock = page.locator('[data-component="TextBlock"]');
    await expect(textBlock).toBeVisible();
    await expect(textBlock).toContainText('This is a test page created through the E2E testing workflow.');

    // Verify call-to-action block renders correctly
    const ctaBlock = page.locator('[data-component="CallToAction"]');
    await expect(ctaBlock).toBeVisible();
    await expect(ctaBlock.locator('h2')).toContainText('Get Started');
    
    const ctaButton = ctaBlock.locator('a[href="/learn-more"]');
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toContainText('Learn More');
  });

  test('should handle lazy-loaded components', async ({ page }) => {
    const lazyPageData = {
      ...testPageData,
      slug: 'lazy-test-page',
      content: {
        blocks: [
          {
            id: 'lazy-block',
            componentType: 'LazyGallery',
            props: {
              images: [
                { src: '/images/1.jpg', alt: 'Image 1' },
                { src: '/images/2.jpg', alt: 'Image 2' },
                { src: '/images/3.jpg', alt: 'Image 3' }
              ]
            }
          }
        ]
      }
    };

    await createPageViaAPI(page, lazyPageData);
    await page.goto(`${BASE_URL}/${lazyPageData.slug}`);

    // Wait for lazy component to load
    const lazyGallery = page.locator('[data-component="LazyGallery"]');
    await expect(lazyGallery).toBeVisible({ timeout: 10000 });

    // Verify images are loaded
    const images = lazyGallery.locator('img');
    await expect(images).toHaveCount(3);
    
    // Check that images have proper alt text
    await expect(images.nth(0)).toHaveAttribute('alt', 'Image 1');
    await expect(images.nth(1)).toHaveAttribute('alt', 'Image 2');
    await expect(images.nth(2)).toHaveAttribute('alt', 'Image 3');

    // Clean up
    await deletePageViaAPI(page, lazyPageData.slug);
  });

  test('should handle component errors gracefully', async ({ page }) => {
    const errorPageData = {
      ...testPageData,
      slug: 'error-test-page',
      content: {
        blocks: [
          {
            id: 'valid-block',
            componentType: 'TextBlock',
            props: {
              text: 'This block should render correctly'
            }
          },
          {
            id: 'invalid-block',
            componentType: 'NonExistentComponent',
            props: {
              someProperty: 'value'
            }
          },
          {
            id: 'another-valid-block',
            componentType: 'TextBlock',
            props: {
              text: 'This block should also render correctly'
            }
          }
        ]
      }
    };

    await createPageViaAPI(page, errorPageData);
    await page.goto(`${BASE_URL}/${errorPageData.slug}`);

    // Verify valid blocks still render
    const validBlocks = page.locator('[data-component="TextBlock"]');
    await expect(validBlocks).toHaveCount(2);
    await expect(validBlocks.nth(0)).toContainText('This block should render correctly');
    await expect(validBlocks.nth(1)).toContainText('This block should also render correctly');

    // Verify error fallback is shown for invalid component
    const errorFallback = page.locator('[data-component-error="NonExistentComponent"]');
    await expect(errorFallback).toBeVisible();
    await expect(errorFallback).toContainText('Component not found');

    // Clean up
    await deletePageViaAPI(page, errorPageData.slug);
  });

  test('should render page with dynamic content based on user context', async ({ page }) => {
    const dynamicPageData = {
      ...testPageData,
      slug: 'dynamic-test-page',
      content: {
        blocks: [
          {
            id: 'user-greeting',
            componentType: 'UserGreeting',
            props: {
              defaultMessage: 'Welcome, Guest!',
              authenticatedMessage: 'Welcome back!'
            }
          },
          {
            id: 'conditional-content',
            componentType: 'ConditionalContent',
            props: {
              showForRoles: ['editor', 'admin'],
              content: 'This content is only visible to editors and admins'
            }
          }
        ]
      }
    };

    await createPageViaAPI(page, dynamicPageData);
    await page.goto(`${BASE_URL}/${dynamicPageData.slug}`);

    // Verify user greeting shows authenticated message
    const userGreeting = page.locator('[data-component="UserGreeting"]');
    await expect(userGreeting).toBeVisible();
    await expect(userGreeting).toContainText('Welcome back!');

    // Verify conditional content is visible (user has editor role)
    const conditionalContent = page.locator('[data-component="ConditionalContent"]');
    await expect(conditionalContent).toBeVisible();
    await expect(conditionalContent).toContainText('This content is only visible to editors and admins');

    // Clean up
    await deletePageViaAPI(page, dynamicPageData.slug);
  });
});

test.describe('Content Management Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await deletePageViaAPI(page, testPageData.slug);
    await deleteBlockViaAPI(page, testBlockData.id);
  });

  test('should complete full content creation workflow', async ({ page }) => {
    // Navigate to CMS admin
    await page.goto(`${BASE_URL}/admin/cms`);

    // Create a new block first
    await page.click('[data-testid="create-block-button"]');
    
    // Fill block form
    await page.fill('[data-testid="block-id-input"]', testBlockData.id);
    await page.fill('[data-testid="block-name-input"]', testBlockData.name);
    await page.fill('[data-testid="block-description-input"]', testBlockData.description);
    await page.selectOption('[data-testid="block-category-select"]', testBlockData.category);
    
    // Add tags
    for (const tag of testBlockData.tags) {
      await page.fill('[data-testid="block-tags-input"]', tag);
      await page.press('[data-testid="block-tags-input"]', 'Enter');
    }

    // Configure block content
    await page.selectOption('[data-testid="component-type-select"]', testBlockData.content.componentType);
    await page.fill('[data-testid="component-props-editor"]', JSON.stringify(testBlockData.content.props));

    // Save block
    await page.click('[data-testid="save-block-button"]');
    
    // Verify block was created
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Block created successfully');

    // Navigate to page creation
    await page.click('[data-testid="create-page-button"]');

    // Fill page form
    await page.fill('[data-testid="page-slug-input"]', testPageData.slug);
    await page.fill('[data-testid="page-title-input"]', testPageData.title);
    await page.fill('[data-testid="page-description-input"]', testPageData.description);

    // Add blocks to page
    for (const block of testPageData.content.blocks) {
      await page.click('[data-testid="add-block-button"]');
      await page.selectOption('[data-testid="block-component-select"]', block.componentType);
      
      // Configure block props
      const propsEditor = page.locator(`[data-testid="block-props-editor-${block.id}"]`);
      await propsEditor.fill(JSON.stringify(block.props));
    }

    // Configure SEO
    await page.click('[data-testid="seo-tab"]');
    await page.fill('[data-testid="seo-title-input"]', testPageData.seo.title);
    await page.fill('[data-testid="seo-description-input"]', testPageData.seo.description);
    await page.fill('[data-testid="seo-canonical-input"]', testPageData.seo.canonical);

    // Publish page
    await page.selectOption('[data-testid="page-status-select"]', 'published');
    await page.click('[data-testid="save-page-button"]');

    // Verify page was created
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Page created successfully');

    // Preview the page
    await page.click('[data-testid="preview-page-button"]');
    
    // Verify page renders correctly in preview
    const previewFrame = page.frameLocator('[data-testid="page-preview-frame"]');
    await expect(previewFrame.locator('h1')).toContainText(testPageData.content.blocks[0].props.title);
  });

  test('should handle page editing workflow', async ({ page }) => {
    // Create initial page via API
    await createPageViaAPI(page, testPageData);

    // Navigate to CMS admin and find the page
    await page.goto(`${BASE_URL}/admin/cms/pages`);
    
    // Search for the page
    await page.fill('[data-testid="page-search-input"]', testPageData.slug);
    await page.press('[data-testid="page-search-input"]', 'Enter');

    // Click edit button
    await page.click(`[data-testid="edit-page-${testPageData.slug}"]`);

    // Modify page title
    const newTitle = 'Updated E2E Test Page';
    await page.fill('[data-testid="page-title-input"]', newTitle);

    // Add a new block
    await page.click('[data-testid="add-block-button"]');
    await page.selectOption('[data-testid="block-component-select"]', 'ImageBlock');
    
    const newBlockProps = {
      src: '/images/test-image.jpg',
      alt: 'Test image',
      caption: 'This is a test image'
    };
    
    await page.fill('[data-testid="block-props-editor-new"]', JSON.stringify(newBlockProps));

    // Save changes
    await page.click('[data-testid="save-page-button"]');

    // Verify changes were saved
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Page updated successfully');

    // Verify changes on the live page
    await page.goto(`${BASE_URL}/${testPageData.slug}`);
    await expect(page.locator('h1')).toContainText(newTitle);
    
    const imageBlock = page.locator('[data-component="ImageBlock"]');
    await expect(imageBlock).toBeVisible();
    await expect(imageBlock.locator('img')).toHaveAttribute('alt', 'Test image');
  });

  test('should handle page deletion workflow', async ({ page }) => {
    // Create page via API
    await createPageViaAPI(page, testPageData);

    // Navigate to CMS admin
    await page.goto(`${BASE_URL}/admin/cms/pages`);

    // Find and delete the page
    await page.fill('[data-testid="page-search-input"]', testPageData.slug);
    await page.press('[data-testid="page-search-input"]', 'Enter');

    // Click delete button
    await page.click(`[data-testid="delete-page-${testPageData.slug}"]`);

    // Confirm deletion in modal
    await page.click('[data-testid="confirm-delete-button"]');

    // Verify deletion success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Page deleted successfully');

    // Verify page is no longer accessible
    const response = await page.request.get(`${BASE_URL}/${testPageData.slug}`);
    expect(response.status()).toBe(404);
  });

  test('should handle draft and publish workflow', async ({ page }) => {
    const draftPageData = {
      ...testPageData,
      slug: 'draft-test-page',
      status: 'draft'
    };

    // Create draft page via API
    await createPageViaAPI(page, draftPageData);

    // Verify draft page is not publicly accessible
    const draftResponse = await page.request.get(`${BASE_URL}/${draftPageData.slug}`);
    expect(draftResponse.status()).toBe(404);

    // Navigate to CMS admin and publish the page
    await page.goto(`${BASE_URL}/admin/cms/pages`);
    await page.fill('[data-testid="page-search-input"]', draftPageData.slug);
    await page.press('[data-testid="page-search-input"]', 'Enter');

    // Click publish button
    await page.click(`[data-testid="publish-page-${draftPageData.slug}"]`);

    // Confirm publication
    await page.click('[data-testid="confirm-publish-button"]');

    // Verify publication success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Page published successfully');

    // Verify page is now publicly accessible
    await page.goto(`${BASE_URL}/${draftPageData.slug}`);
    await expect(page.locator('h1')).toContainText(draftPageData.content.blocks[0].props.title);

    // Clean up
    await deletePageViaAPI(page, draftPageData.slug);
  });
});

test.describe('Multi-tenant Content Management E2E Tests', () => {
  test('should isolate content between tenants', async ({ page, context }) => {
    // Create content for tenant 1
    await authenticateUser(page);
    await createPageViaAPI(page, { ...testPageData, slug: 'tenant1-page' });

    // Create a new page for tenant 2
    const tenant2Page = await context.newPage();
    await tenant2Page.addInitScript((token) => {
      localStorage.setItem('auth-token', token);
    }, AUTH_TOKEN);
    
    await tenant2Page.addInitScript(() => {
      localStorage.setItem('tenant-id', 'tenant-2');
    });

    // Verify tenant 2 cannot see tenant 1's content
    const response = await tenant2Page.request.get(`${API_BASE_URL}/pages`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'X-Tenant-ID': 'tenant-2'
      }
    });

    const data = await response.json();
    const pageExists = data.data.items.some((item: any) => item.slug === 'tenant1-page');
    expect(pageExists).toBe(false);

    // Clean up
    await deletePageViaAPI(page, 'tenant1-page');
    await tenant2Page.close();
  });
});

test.describe('Performance and Accessibility E2E Tests', () => {
  test('should meet performance benchmarks', async ({ page }) => {
    await createPageViaAPI(page, testPageData);
    
    // Navigate to page and measure performance
    await page.goto(`${BASE_URL}/${testPageData.slug}`);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check Core Web Vitals
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {
            LCP: 0,
            FID: 0,
            CLS: 0
          };
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.LCP = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              metrics.FID = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              metrics.CLS += entry.value;
            }
          });
          
          resolve(metrics);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        
        // Fallback timeout
        setTimeout(() => resolve({ LCP: 0, FID: 0, CLS: 0 }), 5000);
      });
    });

    // Assert performance thresholds
    expect(performanceMetrics.LCP).toBeLessThan(2500); // LCP should be under 2.5s
    expect(performanceMetrics.FID).toBeLessThan(100);  // FID should be under 100ms
    expect(performanceMetrics.CLS).toBeLessThan(0.1);  // CLS should be under 0.1
  });

  test('should be accessible', async ({ page }) => {
    await createPageViaAPI(page, testPageData);
    await page.goto(`${BASE_URL}/${testPageData.slug}`);

    // Run accessibility audit
    const accessibilityResults = await page.evaluate(async () => {
      // This would integrate with axe-core in a real implementation
      const issues = [];
      
      // Check for basic accessibility requirements
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.getAttribute('alt')) {
          issues.push(`Image ${index + 1} missing alt text`);
        }
      });

      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) {
        issues.push('No heading elements found');
      }

      const links = document.querySelectorAll('a');
      links.forEach((link, index) => {
        if (!link.textContent?.trim() && !link.getAttribute('aria-label')) {
          issues.push(`Link ${index + 1} has no accessible text`);
        }
      });

      return issues;
    });

    // Assert no critical accessibility issues
    expect(accessibilityResults).toHaveLength(0);
  });
});