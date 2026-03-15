# E-commerce Template

A complete e-commerce solution built with the JSON CMS Boilerplate system. This template provides everything needed to launch an online store with product catalog, shopping cart, checkout, and order management.

## Features

### Core E-commerce
- **Product Catalog** - Organized product listings with categories and filters
- **Product Details** - Rich product pages with images, descriptions, and variants
- **Shopping Cart** - Persistent cart with quantity management
- **Checkout Flow** - Streamlined checkout with guest and registered user options
- **Order Management** - Order tracking and history for customers
- **Inventory Tracking** - Real-time stock management

### User Experience
- **User Authentication** - Registration, login, and profile management
- **Wishlist** - Save products for later purchase
- **Product Reviews** - Customer reviews and ratings
- **Search & Filters** - Advanced product search and filtering
- **Responsive Design** - Mobile-optimized shopping experience

### Business Features
- **Payment Processing** - Stripe integration for secure payments
- **Tax Calculation** - Automatic tax calculation by location
- **Shipping Options** - Multiple shipping methods and rates
- **Discount Codes** - Coupon and promotional code system
- **Analytics** - Sales and customer behavior tracking

### SEO & Marketing
- **SEO Optimization** - Product and category page SEO
- **Social Sharing** - Product sharing on social media
- **Email Marketing** - Newsletter and abandoned cart emails
- **Product Recommendations** - Related and recommended products

## Quick Start

### 1. Copy Template Files

```bash
# Copy template to your project
cp -r src/boilerplate/examples/content/templates/ecommerce/* ./

# Install additional dependencies
npm install stripe @stripe/stripe-js
```

### 2. Environment Configuration

Copy and configure environment variables:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database Configuration
DATABASE_URL=postgresql://...

# Email Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourstore.com

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME="Your Store Name"
```

### 3. Database Setup

Run database migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Seed sample data
npm run seed:ecommerce
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your e-commerce site.

## Template Structure

### Pages

- **Homepage** (`/`) - Featured products and store overview
- **Product Listing** (`/products`) - Paginated product catalog
- **Product Detail** (`/products/[slug]`) - Individual product pages
- **Category Pages** (`/category/[slug]`) - Category-specific listings
- **Shopping Cart** (`/cart`) - Cart management and checkout
- **Checkout** (`/checkout`) - Payment and order completion
- **Account Pages** (`/account/*`) - User profile and order history
- **Search Results** (`/search`) - Product search results

### Components

#### Product Components
- `ProductCard` - Product display in listings
- `ProductGallery` - Product image carousel
- `ProductInfo` - Product details and options
- `ProductReviews` - Customer reviews section
- `RelatedProducts` - Product recommendations

#### Shopping Components
- `ShoppingCart` - Cart widget and management
- `CartItem` - Individual cart item display
- `CheckoutForm` - Checkout process forms
- `PaymentForm` - Stripe payment integration
- `OrderSummary` - Order details and totals

#### Navigation Components
- `ProductFilters` - Search and filter interface
- `CategoryNav` - Category navigation menu
- `Breadcrumbs` - Navigation breadcrumbs
- `SearchBar` - Product search input

### Blocks

#### Homepage Blocks
- `hero.ecommerce` - Store hero with featured products
- `featured-products` - Highlighted product showcase
- `categories.grid` - Category overview grid
- `testimonials.customers` - Customer testimonials
- `newsletter.signup` - Email subscription

#### Product Blocks
- `product.hero` - Product detail header
- `product.gallery` - Image gallery and zoom
- `product.details` - Specifications and description
- `product.reviews` - Review system
- `product.related` - Related product suggestions

#### Category Blocks
- `category.header` - Category page header
- `product.grid` - Product listing grid
- `filters.sidebar` - Filter and sort options
- `pagination` - Page navigation

## Customization

### Adding New Product Types

1. **Define Product Schema**
   ```typescript
   // types/product.ts
   export interface ProductVariant {
     id: string;
     name: string;
     price: number;
     sku: string;
     inventory: number;
     attributes: Record<string, string>;
   }
   ```

2. **Create Product Components**
   ```tsx
   // components/products/VariantSelector.tsx
   export function VariantSelector({ variants, onSelect }) {
     // Implementation
   }
   ```

3. **Update Product Pages**
   ```json
   // data/pages/products/[slug].json
   {
     "blocks": [
       "product.hero",
       "product.variants",
       "product.details"
     ]
   }
   ```

### Customizing Checkout Flow

1. **Modify Checkout Steps**
   ```json
   // data/blocks/checkout-flow.json
   {
     "steps": [
       "shipping-info",
       "payment-method",
       "order-review",
       "confirmation"
     ]
   }
   ```

2. **Add Custom Payment Methods**
   ```typescript
   // integrations/payments/paypal.ts
   export class PayPalProvider implements PaymentProvider {
     // Implementation
   }
   ```

### Styling and Theming

1. **Update Brand Colors**
   ```css
   /* styles/theme.css */
   :root {
     --primary-color: #your-brand-color;
     --secondary-color: #your-secondary-color;
   }
   ```

2. **Customize Component Styles**
   ```tsx
   // components/products/ProductCard.tsx
   const customStyles = {
     card: 'bg-white rounded-lg shadow-custom',
     title: 'text-lg font-brand',
   };
   ```

## Integrations

### Payment Processing

The template includes Stripe integration with:
- Credit card processing
- Apple Pay and Google Pay
- Subscription billing
- Webhook handling

### Email Marketing

Integrated email features:
- Welcome emails for new customers
- Order confirmation emails
- Abandoned cart recovery
- Newsletter subscriptions

### Analytics

Built-in analytics tracking:
- Product view events
- Add to cart events
- Purchase completions
- Customer behavior flows

## Testing

Run the test suite:

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Payment flow tests
npm run test:payments
```

## Deployment

### Production Checklist

1. **Environment Variables**
   - Set production Stripe keys
   - Configure production database
   - Set up email service

2. **Security**
   - Enable HTTPS
   - Configure CSP headers
   - Set up rate limiting

3. **Performance**
   - Enable image optimization
   - Configure CDN
   - Set up caching

4. **Monitoring**
   - Set up error tracking
   - Configure performance monitoring
   - Enable payment webhooks

### Deployment Commands

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to other platforms
npm run deploy
```

## Support

For e-commerce template support:
- Check the [troubleshooting guide](./docs/troubleshooting.md)
- Review [common issues](./docs/common-issues.md)
- Consult the [API documentation](./docs/api.md)

## License

This template is part of the JSON CMS Boilerplate system and follows the same license terms.