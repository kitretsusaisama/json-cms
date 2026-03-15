# Boilerplate Templates

This directory contains complete boilerplate templates for different project types. Each template provides a fully configured starting point with pages, blocks, components, and integrations tailored to specific use cases.

## Available Templates

### E-commerce Template
**Path:** `ecommerce/`
**Description:** Complete e-commerce solution with product catalog, shopping cart, checkout, and order management.

**Features:**
- Product listing and detail pages
- Shopping cart and checkout flow
- User authentication and profiles
- Order management and tracking
- Payment processing with Stripe
- Inventory management
- SEO optimization for products

**Ideal For:** Online stores, marketplaces, retail websites

### Blog Template
**Path:** `blog/`
**Description:** Modern blog platform with content management, author profiles, and reader engagement features.

**Features:**
- Article listing and detail pages
- Author profiles and bio pages
- Category and tag organization
- Search and filtering
- Comments and social sharing
- Newsletter subscription
- SEO optimization for content

**Ideal For:** Personal blogs, company blogs, news sites, content marketing

### Corporate Template
**Path:** `corporate/`
**Description:** Professional corporate website with company information, services, and contact forms.

**Features:**
- Homepage with company overview
- About us and team pages
- Services and portfolio showcase
- Contact forms and location info
- News and press releases
- Career opportunities
- Multi-language support

**Ideal For:** Business websites, consulting firms, agencies, professional services

### SaaS Template
**Path:** `saas/`
**Description:** Software-as-a-Service platform with user onboarding, pricing, and dashboard integration.

**Features:**
- Landing page with feature highlights
- Pricing and subscription management
- User authentication and onboarding
- Dashboard integration hooks
- Documentation and help center
- Customer testimonials
- Free trial and conversion flows

**Ideal For:** SaaS products, web applications, subscription services

### Portfolio Template
**Path:** `portfolio/`
**Description:** Creative portfolio showcase for designers, developers, and creative professionals.

**Features:**
- Project showcase with galleries
- About and skills sections
- Contact and inquiry forms
- Blog integration
- Resume/CV download
- Social media integration
- Dark/light theme support

**Ideal For:** Freelancers, designers, developers, artists, photographers

### Documentation Template
**Path:** `documentation/`
**Description:** Comprehensive documentation site with search, navigation, and version control.

**Features:**
- Hierarchical content organization
- Search functionality
- Code syntax highlighting
- API reference integration
- Version management
- Contributor guidelines
- Feedback and rating system

**Ideal For:** API documentation, product guides, technical documentation

## Using Templates

### Quick Start

1. **Choose a template** that matches your project needs
2. **Copy the template** to your project directory:
   ```bash
   cp -r src/boilerplate/examples/content/templates/ecommerce/* ./
   ```
3. **Install dependencies** listed in the template's README
4. **Configure environment variables** from the provided `.env.example`
5. **Customize content** in the `data/` directory
6. **Run the development server** to see your site

### Customization

Each template includes:

- **Configuration files** - Environment variables and settings
- **Page definitions** - JSON files defining page structure
- **Block library** - Reusable content blocks
- **Component examples** - Custom React components
- **Styling** - CSS/Tailwind configurations
- **Integration examples** - Third-party service setups

### Template Structure

```
template-name/
├── README.md                 # Template-specific setup guide
├── .env.example             # Environment variables template
├── package.json             # Additional dependencies
├── data/                    # Content and configuration
│   ├── pages/              # Page definitions
│   ├── blocks/             # Reusable blocks
│   ├── settings/           # Site settings
│   └── i18n/               # Internationalization
├── components/             # Custom components
├── styles/                 # CSS and styling
├── integrations/          # Third-party integrations
└── docs/                  # Template documentation
```

## Contributing Templates

When creating new templates:

1. **Follow the established structure** shown above
2. **Include comprehensive documentation** with setup instructions
3. **Provide working examples** for all major features
4. **Test thoroughly** across different environments
5. **Add appropriate metadata** and configuration files
6. **Update this README** with the new template information

## Support

For template-specific questions:
- Check the template's README file
- Review the example implementations
- Consult the integration documentation
- Open an issue with template-specific details