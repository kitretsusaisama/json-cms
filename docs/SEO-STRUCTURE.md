# SEO JSON Structure Documentation

This document outlines the structure and usage of SEO JSON files in the Albata platform.

## File Structure

```
data/
  seo/
    page/               # Page-specific SEO
      _defaults.json    # Default values for all pages
      home.json         # Home page SEO
    product/            # Product SEO templates
      _defaults.json    # Default template for products
      {slug}.json       # Specific product overrides
    category/           # Category SEO templates
      _defaults.json
      {slug}.json
    collection/         # Collection SEO templates
      _defaults.json
      {slug}.json
    blog/               # Blog post SEO
      _defaults.json
      {slug}.json
    author/             # Author SEO
      _defaults.json
      {slug}.json
    landing-page/       # Marketing landing pages
      _defaults.json
      {slug}.json
    event/              # Events and webinars
      _defaults.json
      {slug}.json
```

## Core SEO Fields

All SEO JSON files support these common fields:

```typescript
{
  "id": string,           // Unique identifier for this SEO entry
  "type": string,         // Entity type (page, product, article, etc.)
  "title": string,        // Page title
  "description": string,  // Meta description
  "canonical": string,    // Canonical URL
  "robots": string,       // Robots meta tag value
  "alternates": {         // Language variants
    "en": string,        // English URL
    "es": string,        // Spanish URL
    // ... other languages
  },
  "meta": [              // Additional meta tags
    {
      "name": string,    // Meta name or property
      "content": string  // Meta content
    }
  ],
  "openGraph": {         // Open Graph metadata
    "type": string,      // og:type (article, website, etc.)
    "title": string,     // og:title
    "description": string, // og:description
    "url": string,       // og:url
    "images": [          // og:image
      {
        "url": string,
        "width": number,
        "height": number,
        "alt": string
      }
    ]
  },
  "twitter": {           // Twitter Card metadata
    "card": string,      // twitter:card
    "site": string,      // twitter:site
    "creator": string,   // twitter:creator
    "title": string,     // twitter:title
    "description": string, // twitter:description
    "image": string      // twitter:image
  },
  "structuredData": [    // Schema.org JSON-LD
    {
      "@context": string,
      "@type": string,
      // ... schema properties
    }
  ],
  "updatedAt": string    // ISO 8601 timestamp
}
```

## Entity-Specific Templates

### Landing Page SEO

Location: `data/seo/landing-page/_defaults.json`

Template variables:
- `{{title}}` - Page title
- `{{campaign}}` - Campaign name
- `{{description}}` - Page description
- `{{slug}}` - URL slug
- `{{imageUrl}}` - Hero/featured image
- `{{keywords}}` - Comma-separated keywords
- `{{facebookAppId}}` - Facebook App ID for tracking
- `{{pinterestVerify}}` - Pinterest verification code

### Event SEO

Location: `data/seo/event/_defaults.json`

Template variables:
- `{{name}}` - Event name
- `{{description}}` - Event description
- `{{startDate}}` - Event start date (ISO 8601)
- `{{endDate}}` - Event end date (ISO 8601)
- `{{location}}` - Event location object
  - `name` - Venue name
  - `street` - Street address
  - `city` - City
  - `region` - State/region
  - `postalCode` - ZIP/postal code
  - `country` - Country code
- `{{isOnline}}` - Boolean for online events
- `{{onlineUrl}}` - URL for online events
- `{{price}}` - Ticket price
- `{{currency}}` - Currency code (default: USD)
- `{{isSoldOut}}` - Boolean for ticket availability
- `{{organizer}}` - Event organizer name
- `{{imageUrl}}` - Event image
- `{{slug}}` - URL slug

### Product SEO

Location: `data/seo/product/_defaults.json`

Template variables:
- `{{name}}` - Product name
- `{{brand}}` - Brand name
- `{{description}}` - Full description
- `{{shortDescription}}` - Short description
- `{{price}}` - Product price
- `{{imageUrl}}` - Main product image
- `{{inStock}}` - Boolean for availability
- `{{slug}}` - URL slug

### Category SEO

Location: `data/seo/category/_defaults.json`

Template variables:
- `{{name}}` - Category name
- `{{description}}` - Category description
- `{{slug}}` - URL slug
- `{{imageUrl}}` - Category image (optional)

### Blog Post SEO

Location: `data/seo/blog/_defaults.json`

Template variables:
- `{{title}}` - Post title
- `{{excerpt}}` - Post excerpt
- `{{slug}}` - URL slug
- `{{publishedAt}}` - Publication date (ISO 8601)
- `{{updatedAt}}` - Last update date (ISO 8601)
- `{{authorName}}` - Author's name
- `{{tags}}` - Comma-separated tags
- `{{category}}` - Post category
- `{{imageUrl}}` - Featured image

## Usage Examples

### 1. Creating a New Product SEO Entry

1. Create a new file at `data/seo/product/my-awesome-product.json`
2. Extend the defaults and override specific fields:

```json
{
  "id": "my-awesome-product",
  "title": "{{name}} - Limited Edition | {{brand}}",
  "description": "{{shortDescription}} Limited time offer. Free shipping available.",
  "openGraph": {
    "images": [
      {
        "url": "{{imageUrl}}",
        "width": 1200,
        "height": 630,
        "alt": "{{name}} - Limited Edition"
      }
    ]
  },
  "meta": [
    {
      "name": "product:price:amount",
      "content": "{{price}}"
    },
    {
      "name": "product:availability",
      "content": "{{inStock ? 'in stock' : 'out of stock'}}"
    }
  ]
}
```

### 2. Adding Structured Data

Add to the `structuredData` array to include rich snippets:

```json
{
  "structuredData": [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "{{name}}",
      "description": "{{shortDescription}}",
      "brand": {
        "@type": "Brand",
        "name": "{{brand}}"
      },
      "offers": {
        "@type": "Offer",
        "price": "{{price}}",
        "priceCurrency": "USD",
        "availability": "{{inStock ? 'InStock' : 'OutOfStock'}}",
        "url": "https://albata.com/products/{{slug}}"
      }
    }
  ]
}
```

## SEO Health Checks

The platform includes an automated SEO health checker that validates your SEO configurations. The health checker can be run manually or as part of your CI/CD pipeline.

### Running Health Checks

```bash
# Run SEO health check
npm run check:seo
```

### What's Checked

#### Common Validations
- Required fields (title, description, canonical URL)
- Title length (recommended ≤ 65 characters)
- Description length (recommended 120-160 characters)
- OpenGraph image presence and dimensions
- Twitter card configuration
- Canonical URL format

#### Entity-Specific Validations

**Products**
- Price information in meta tags
- Availability status
- Product schema validation

**Events**
- Start/end dates
- Location or online URL
- Event schema validation
- Ticket availability

**Landing Pages**
- Campaign tracking parameters
- Noindex configuration (if applicable)
- Conversion tracking

### Integration with CI/CD

SEO health checks are automatically run on pull requests and main branch pushes. The results are posted as a comment on the pull request.

## Best Practices

1. **Always extend from `_defaults.json`** - Only specify fields that need to change
2. **Use template variables** - Keep content dynamic and maintainable
3. **Keep descriptions concise** - Aim for 150-160 characters for meta descriptions
4. **Optimize images** - Use properly sized images for social sharing (1200x630px recommended)
5. **Test with validators**:
   - [Google Rich Results Test](https://search.google.com/test/rich-results)
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [Schema Markup Validator](https://validator.schema.org/)

6. **Run health checks regularly**
   - Before deployments
   - When adding new content types
   - After major SEO updates

## Versioning

- **v1.0.0** - Initial SEO structure implementation
- **v1.1.0** - Added structured data support
- **v1.2.0** - Added multilingual alternates support
