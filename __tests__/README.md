# JSON CMS Boilerplate Testing Suite

This directory contains comprehensive tests for the JSON CMS Boilerplate system, covering unit tests, integration tests, end-to-end tests, and performance tests.

## Test Structure

```
__tests__/
├── e2e/                          # End-to-end tests
│   ├── page-rendering.test.ts    # Page rendering workflows
│   ├── global-setup.ts           # E2E test setup
│   └── global-teardown.ts        # E2E test cleanup
└── README.md                     # This file

src/
├── boilerplate/
│   ├── registry/__tests__/
│   │   ├── enhanced-registry.test.ts      # Existing registry tests
│   │   └── component-registry-unit.test.ts # Comprehensive unit tests
│   ├── providers/__tests__/
│   │   └── api-bridge-unit.test.ts        # API bridge unit tests
│   ├── cache/__tests__/
│   │   └── performance.test.ts            # Cache performance tests
│   └── [module]/__tests__/                # Module-specific tests
└── app/api/cms/__tests__/
    ├── basic-functionality.test.ts        # Basic API tests
    ├── api-routes.test.ts                 # Existing API tests
    └── integration.test.ts                # API integration tests
```

## Test Categories

### 1. Unit Tests
**Location**: `src/**/__tests__/*.test.ts` (excluding integration/e2e/performance)
**Purpose**: Test individual components, functions, and classes in isolation
**Command**: `npm run test:unit`

**Coverage**:
- Component Registry system
- API Bridge utilities
- Content validation
- Authentication and authorization
- Caching mechanisms
- Plugin system
- Multi-tenant functionality

### 2. Integration Tests
**Location**: `src/**/__tests__/*.integration.test.ts`
**Purpose**: Test interactions between components and external systems
**Command**: `npm run test:integration`

**Coverage**:
- API endpoint functionality
- Database operations
- Provider switching (file ↔ database)
- Authentication flows
- Multi-tenant data isolation
- Plugin loading and management

### 3. End-to-End Tests
**Location**: `__tests__/e2e/*.test.ts`
**Purpose**: Test complete user workflows from UI to backend
**Command**: `npm run test:e2e`

**Coverage**:
- Page rendering with multiple components
- Content management workflows
- Draft/publish workflows
- Multi-tenant content isolation
- Error handling and fallbacks
- Performance and accessibility

### 4. Performance Tests
**Location**: `src/**/__tests__/*.performance.test.ts`
**Purpose**: Test system performance and optimization features
**Command**: `npm run test:performance`

**Coverage**:
- Cache performance (memory, Redis, multi-level)
- High-frequency operations
- Memory usage optimization
- Concurrent access patterns
- Cache warming and invalidation

## Running Tests

### Individual Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance

# Watch mode for development
npm run test:unit:watch
npm run test:integration:watch
```

### Comprehensive Testing

```bash
# Run all test suites sequentially
npm run test:all

# Run specific suites
npm run test:all unit integration

# Run in parallel (faster)
npm run test:all --parallel

# Stop on first failure
npm run test:all --bail

# Verbose output
npm run test:all --verbose

# CI mode (parallel + bail)
npm run test:ci
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

## Test Configuration

### Vitest Configurations

- **`vitest.config.ts`**: Main unit test configuration
- **`vitest.integration.config.ts`**: Integration test configuration
- **`vitest.performance.config.ts`**: Performance test configuration

### Playwright Configuration

- **`playwright.config.ts`**: E2E test configuration
- Supports multiple browsers (Chrome, Firefox, Safari)
- Mobile device testing
- Automatic screenshot/video on failure

### Test Setup

- **`src/test-setup.ts`**: Global test setup and mocks
- **`__tests__/e2e/global-setup.ts`**: E2E environment setup
- **`__tests__/e2e/global-teardown.ts`**: E2E cleanup

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRegistry } from '../component-registry';

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  it('should register component successfully', () => {
    const component = () => null;
    registry.register('TestComponent', { component });
    
    expect(registry.has('TestComponent')).toBe(true);
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

describe('Pages API Integration', () => {
  it('should create page via API', async () => {
    const { POST } = await import('../pages/route');
    const request = new NextRequest('http://localhost/api/cms/pages', {
      method: 'POST',
      body: JSON.stringify(pageData)
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should render page with components', async ({ page }) => {
  await page.goto('/test-page');
  
  const heroSection = page.locator('[data-component="HeroSection"]');
  await expect(heroSection).toBeVisible();
  await expect(heroSection.locator('h1')).toContainText('Welcome');
});
```

### Performance Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Cache Performance', () => {
  it('should handle high-frequency operations', async () => {
    const start = performance.now();
    
    for (let i = 0; i < 10000; i++) {
      await cache.set(`key${i}`, data);
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // Under 1 second
  });
});
```

## Test Data and Mocks

### Mock Data
- Consistent test data across all test suites
- Located in test files or shared utilities
- Includes realistic page, block, and component data

### Mocking Strategy
- **Unit Tests**: Mock external dependencies (APIs, databases)
- **Integration Tests**: Use test databases or in-memory stores
- **E2E Tests**: Use real services with test data
- **Performance Tests**: Use controlled data sets

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e
```

### Test Requirements

**For Pull Requests**:
- All unit tests must pass
- Integration tests must pass
- Code coverage > 80%
- No performance regressions

**For Releases**:
- All test suites must pass
- E2E tests must pass
- Performance benchmarks met
- Security tests passed

## Debugging Tests

### Unit/Integration Tests

```bash
# Debug specific test
npx vitest run --reporter=verbose src/path/to/test.ts

# Debug with Node inspector
node --inspect-brk ./node_modules/.bin/vitest run test.ts
```

### E2E Tests

```bash
# Run with UI mode
npm run test:e2e:ui

# Debug specific test
npx playwright test --debug page-rendering.test.ts

# View test results
npx playwright show-report
```

### Performance Tests

```bash
# Run with detailed output
npm run test:performance -- --reporter=verbose

# Profile memory usage
node --inspect ./node_modules/.bin/vitest run performance.test.ts
```

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and independent

### Performance Considerations
- Use `beforeEach`/`afterEach` for setup/cleanup
- Mock expensive operations in unit tests
- Use realistic data sizes in performance tests
- Clean up resources after tests

### Maintenance
- Update tests when changing functionality
- Remove obsolete tests
- Keep test data current
- Monitor test execution times

## Troubleshooting

### Common Issues

**Tests timing out**:
- Increase timeout in test configuration
- Check for unresolved promises
- Verify mock implementations

**Flaky E2E tests**:
- Add proper wait conditions
- Use stable selectors
- Check for race conditions

**Performance test failures**:
- Verify system resources
- Check for background processes
- Review performance thresholds

**Memory leaks in tests**:
- Ensure proper cleanup
- Check for circular references
- Monitor memory usage

### Getting Help

1. Check test output and error messages
2. Review test configuration files
3. Run tests in isolation to identify issues
4. Check CI logs for environment-specific problems
5. Consult team documentation or create issues

## Metrics and Reporting

### Coverage Reports
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

### Performance Metrics
- Operation latency (p50, p95, p99)
- Throughput (operations/second)
- Memory usage
- Cache hit ratios

### E2E Metrics
- Page load times
- Core Web Vitals
- Accessibility scores
- Cross-browser compatibility

### Quality Gates
- Minimum 80% code coverage
- All critical paths tested
- Performance within acceptable limits
- Zero high-severity security issues