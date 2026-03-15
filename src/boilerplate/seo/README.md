# SEO Management System

A comprehensive SEO management system for the JSON CMS Boilerplate that extends existing SEO functionality with centralized management, optimization engine, structured data generation, and health checking.

## Features

### 1. Centralized SEO Management
- **SEO Manager**: Unified interface for all SEO operations
- **Metadata Generation**: Automatic metadata generation from page content
- **Multi-tenant Support**: Tenant-aware SEO management
- **Context-aware Processing**: Locale and domain-specific SEO handling

### 2. SEO Optimization Engine
- **Content Analysis**: Word count, readability, keyword density analysis
- **Technical SEO Scoring**: Comprehensive scoring system (0-100)
- **Issue Detection**: Automatic identification of SEO problems
- **Improvement Suggestions**: Actionable recommendations with impact scores
- **Performance Insights**: Content structure and optimization analysis

### 3. Enhanced Structured Data Generation
- **Automatic Generation**: Extract structured data from page components
- **Multiple Schema Types**: WebSite, Article, Product, Organization, BreadcrumbList
- **Validation**: Built-in structured data validation
- **Component-based Extraction**: Smart extraction from page component props

### 4. SEO Validation Engine
- **Best Practice Validation**: Title, description, canonical URL validation
- **Length Optimization**: Optimal length checking for meta elements
- **Format Validation**: URL format, robots directive, social media validation
- **Structured Data Validation**: Schema.org compliance checking

### 5. Health Checker
- **Comprehensive Scoring**: Technical, content, performance, accessibility scores
- **Issue Identification**: Categorized issue detection and reporting
- **Recommendations**: Prioritized improvement recommendations
- **Multi-category Analysis**: Holistic SEO health assessment

## API Endpoints

### SEO Optimization
```
GET /api/cms/seo/optimize/[pageId]?content=<html_content>
```
Analyzes page content and returns optimization recommendations.

### Health Check
```
GET /api/cms/seo/health/[pageId]?performance=true&accessibility=true
```
Returns comprehensive health score and analysis.

### Structured Data Generation
```
POST /api/cms/seo/structured-data
Content-Type: application/json

{
  "version": 2,
  "slug": "page-slug",
  "components": [...]
}
```
Generates structured data from page content.

### SEO Validation
```
POST /api/cms/seo/validate
Content-Type: application/json

{
  "id": "page-id",
  "type": "page",
  "title": "Page Title",
  "description": "Page Description",
  ...
}
```
Validates SEO data against best practices.

### Metadata Generation
```
POST /api/cms/seo/metadata
Content-Type: application/json

{
  "pageData": {...},
  "context": {
    "tenantId": "tenant-1",
    "locale": "en",
    "domain": "example.com"
  }
}
```
Generates comprehensive metadata for a page.

## Usage Examples

### Basic SEO Manager Usage
```typescript
import { CentralizedSEOManager } from '@/boilerplate/seo';

const seoManager = new CentralizedSEOManager();

// Generate metadata for a page
const metadata = await seoManager.generateMetadata(pageData, {
  tenantId: 'tenant-1',
  locale: 'en'
});

// Optimize page content
const optimization = await seoManager.optimizePage('page-id', htmlContent);

// Get health score
const healthScore = await seoManager.getHealthScore('page-id');
```

### Optimization Engine Usage
```typescript
import { OptimizationEngine } from '@/boilerplate/seo/optimization-engine';

const engine = new OptimizationEngine();
const analysis = await engine.analyzePage('page-id', htmlContent);

console.log(`SEO Score: ${analysis.score}`);
console.log(`Issues: ${analysis.issues.length}`);
console.log(`Suggestions: ${analysis.suggestions.length}`);
```

### Structured Data Generation
```typescript
import { StructuredDataGenerator } from '@/boilerplate/seo/structured-data-generator';

const generator = new StructuredDataGenerator();
const structuredData = await generator.generateFromPage(pageData);

structuredData.forEach(data => {
  if (data.isValid) {
    console.log(`Generated ${data.type}:`, data.jsonLd);
  }
});
```

### Validation Engine Usage
```typescript
import { ValidationEngine } from '@/boilerplate/seo/validation-engine';

const validator = new ValidationEngine();
const result = await validator.validate(seoRecord);

if (!result.isValid) {
  console.log('Validation errors:', result.errors);
  console.log('Warnings:', result.warnings);
}
```

## Integration with Existing System

This SEO management system extends the existing SEO functionality found in:
- `src/lib/seo.ts` - Core SEO utilities
- `src/lib/seo-store.ts` - SEO data storage
- `src/lib/seo/structured-data.ts` - Structured data generation
- `src/app/api/seo/[type]/[id]/route.ts` - Existing SEO API

### Backward Compatibility
- All existing SEO functionality remains unchanged
- New features are additive and optional
- Existing SEO data format is fully supported
- API responses use standardized envelope format

## Configuration

### Environment Variables
```bash
# Required for canonical URLs and structured data
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Optional: Enable performance analysis
SEO_PERFORMANCE_ANALYSIS=true

# Optional: Enable accessibility analysis
SEO_ACCESSIBILITY_ANALYSIS=true
```

### Multi-tenant Configuration
```typescript
// Tenant-specific SEO context
const context = {
  tenantId: 'tenant-1',
  domain: 'tenant1.example.com',
  locale: 'en'
};

const metadata = await seoManager.generateMetadata(pageData, context);
```

## Testing

Run the comprehensive test suite:

```bash
# Run all SEO tests
npm test src/boilerplate/seo

# Run specific test files
npm test src/boilerplate/seo/__tests__/seo-manager.test.ts
npm test src/boilerplate/seo/__tests__/optimization-engine.test.ts
npm test src/boilerplate/seo/__tests__/validation-engine.test.ts
npm test src/boilerplate/seo/__tests__/structured-data-generator.test.ts
npm test src/boilerplate/seo/__tests__/health-checker.test.ts
```

## Performance Considerations

### Caching
- SEO analysis results are cacheable
- Structured data generation can be cached per page version
- Health scores can be cached with TTL

### Optimization
- Lazy loading of analysis engines
- Incremental analysis for large content
- Batch processing for multiple pages

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **5.1**: Centralized SEO management with JSON configuration ✅
- **5.2**: SEO optimization engine with scoring and suggestions ✅
- **5.3**: Structured data generation from page content ✅
- **5.4**: Server-side meta tag injection for optimal SEO ✅
- **5.5**: SEO validation and health checking tools ✅

## Future Enhancements

- Real-time SEO monitoring
- A/B testing for SEO variations
- Integration with Google Search Console
- Automated SEO reporting
- Machine learning-based optimization suggestions