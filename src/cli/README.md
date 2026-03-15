# JSON CMS Boilerplate CLI

The JSON CMS Boilerplate CLI provides comprehensive tools for analyzing, initializing, and managing JSON-driven CMS projects in Next.js applications.

## Installation

The CLI is included with the boilerplate system. Run commands using:

```bash
npx tsx src/cli/dx.ts <command>
```

Or add to your package.json scripts:

```json
{
  "scripts": {
    "cms:scan": "tsx src/cli/dx.ts scan",
    "cms:init": "tsx src/cli/dx.ts init",
    "cms:migrate": "tsx src/cli/dx.ts migrate",
    "cms:validate": "tsx src/cli/dx.ts validate --all"
  }
}
```

## Commands

### Project Analysis

#### `scan [project-path]`

Analyzes a Next.js project for CMS boilerplate compatibility and integration planning.

```bash
# Scan current directory
npx tsx src/cli/dx.ts scan

# Scan specific project
npx tsx src/cli/dx.ts scan /path/to/project

# Generate detailed report
npx tsx src/cli/dx.ts scan --output report.md --verbose

# Output as JSON
npx tsx src/cli/dx.ts scan --format json --output report.json
```

**Options:**
- `-o, --output <path>` - Output report to file
- `-v, --verbose` - Show detailed analysis
- `-f, --format <format>` - Output format (json|markdown)

**Features:**
- Next.js version compatibility check
- CSS strategy analysis and conflict detection
- Route structure analysis
- Dependency compatibility assessment
- Third-party integration detection
- Compatibility scoring and recommendations

### Project Initialization

#### `init`

Initializes CMS boilerplate in an existing Next.js project.

```bash
# Initialize with default settings
npx tsx src/cli/dx.ts init

# Initialize with specific provider
npx tsx src/cli/dx.ts init --provider database

# Initialize with custom CSS strategy
npx tsx src/cli/dx.ts init --css-strategy tailwind

# Force initialization despite conflicts
npx tsx src/cli/dx.ts init --force
```

**Options:**
- `-t, --target <path>` - Target project path (default: current directory)
- `-p, --provider <provider>` - Content provider (file|database, default: file)
- `-c, --css-strategy <strategy>` - CSS strategy (modules|tailwind|styled-components, default: modules)
- `-f, --force` - Force initialization even with conflicts

**What it does:**
1. Scans project for compatibility
2. Creates boilerplate configuration files
3. Sets up API routes (if not already present)
4. Configures component registry
5. Creates example content
6. Updates package.json scripts

### Content Migration

#### `migrate`

Migrates content from JSON files to database storage.

```bash
# Dry run to see what would be migrated
npx tsx src/cli/dx.ts migrate --dry-run

# Migrate to PostgreSQL
npx tsx src/cli/dx.ts migrate --provider postgresql --connection "postgresql://..."

# Migrate from custom source path
npx tsx src/cli/dx.ts migrate --source ./custom-data

# Rollback a migration
npx tsx src/cli/dx.ts migrate --rollback migration-id-123
```

**Options:**
- `--dry-run` - Show what would be migrated without making changes
- `--provider <provider>` - Target database provider (default: postgresql)
- `--connection <string>` - Database connection string
- `--source <path>` - Source content path (default: ./data)
- `--rollback <id>` - Rollback migration by ID

**Migration Process:**
1. Analyzes source JSON structure
2. Creates migration plan with risk assessment
3. Generates database schema
4. Transfers data in batches with validation
5. Performs integrity checks
6. Provides rollback capability

### Content Generation

#### `gen:component <name>`

Generates a new React component scaffold with boilerplate integration.

```bash
# Basic component
npx tsx src/cli/dx.ts gen:component Hero

# Component with props
npx tsx src/cli/dx.ts gen:component ProductCard --props "title,price,imageUrl"

# Component with slots
npx tsx src/cli/dx.ts gen:component Layout --slots "header,content,footer"

# Custom output directory
npx tsx src/cli/dx.ts gen:component Button --dir src/components/ui
```

**Options:**
- `--props <props>` - Component props (comma-separated)
- `--slots <slots>` - Component slots (comma-separated)
- `--dir <dir>` - Output directory (default: src/components)

**Generated Files:**
- Component TypeScript file with props interface
- Component metadata for registry
- Basic styling structure

#### `gen:page <id>`

Generates a new page JSON file with SEO configuration.

```bash
# Basic page
npx tsx src/cli/dx.ts gen:page about

# Page with title and blocks
npx tsx src/cli/dx.ts gen:page products --title "Our Products" --blocks "hero,product-grid,cta"

# Page with template
npx tsx src/cli/dx.ts gen:page landing --template landing
```

**Options:**
- `--title <title>` - Page title
- `--blocks <blocks>` - Initial blocks (comma-separated)
- `--template <template>` - Page template (landing|blog|product, default: landing)

**Templates:**
- `landing` - Hero, features, testimonials, CTA
- `blog` - Header, content, sidebar, footer
- `product` - Product hero, details, reviews, related products

**Generated Files:**
- Page JSON file in `data/pages/`
- SEO configuration in `data/seoData/page/`

#### `gen:block <id>`

Generates a new block JSON file with component configuration.

```bash
# Basic block
npx tsx src/cli/dx.ts gen:block hero

# Block with components
npx tsx src/cli/dx.ts gen:block features --components "FeatureCard,FeatureGrid"

# Block with category
npx tsx src/cli/dx.ts gen:block navigation --category layout
```

**Options:**
- `--components <components>` - Initial components (comma-separated)
- `--category <category>` - Block category (default: content)

#### `gen:plugin <name>`

Generates a new plugin scaffold with components, routes, and API endpoints.

```bash
# Basic plugin
npx tsx src/cli/dx.ts gen:plugin analytics

# Plugin with components
npx tsx src/cli/dx.ts gen:plugin ecommerce --components "ProductCard,CartButton"

# Plugin with API endpoints
npx tsx src/cli/dx.ts gen:plugin auth --api "login,logout,profile"

# Full plugin with everything
npx tsx src/cli/dx.ts gen:plugin blog --components "BlogPost,BlogList" --routes "blog,post" --api "posts,comments"
```

**Options:**
- `--components <components>` - Plugin components (comma-separated)
- `--routes <routes>` - Plugin routes (comma-separated)
- `--api <endpoints>` - API endpoints (comma-separated)

**Generated Structure:**
```
src/plugins/{name}/
├── index.ts              # Plugin entry point
├── plugin.json           # Plugin manifest
├── components/           # Plugin components
│   └── {Component}.tsx
└── api/                  # API endpoints
    └── {endpoint}.ts
```

### Content Validation

#### `validate`

Validates JSON content files for schema compliance and integrity.

```bash
# Validate specific file
npx tsx src/cli/dx.ts validate --file data/pages/home.json

# Validate all content
npx tsx src/cli/dx.ts validate --all

# Verbose validation
npx tsx src/cli/dx.ts validate --all --verbose
```

**Options:**
- `-t, --type <type>` - Content type (page|block, default: page)
- `-f, --file <file>` - Specific file to validate
- `--all` - Validate all content
- `--verbose` - Show detailed output

### CSS Management

#### `css:analyze [project-path]`

Analyzes CSS conflicts and compatibility issues.

```bash
npx tsx src/cli/dx.ts css:analyze
npx tsx src/cli/dx.ts css:analyze --verbose --report
```

#### `css:generate [project-path]`

Generates CSS isolation and compatibility files.

```bash
npx tsx src/cli/dx.ts css:generate --strategy namespace
npx tsx src/cli/dx.ts css:generate --auto-fix
```

#### `css:validate [project-path]`

Validates existing CSS isolation setup.

```bash
npx tsx src/cli/dx.ts css:validate --verbose
```

#### `css:setup [project-path]`

Interactive CSS isolation setup wizard.

```bash
npx tsx src/cli/dx.ts css:setup
```

### Legacy Commands

The CLI also includes legacy commands for backward compatibility:

- `plan <page>` - Test constraint satisfaction planning
- `integrity` - Manage content integrity
- `gen:component` - Generate component (legacy)
- `gen:page` - Generate page (legacy)
- `gen:block` - Generate block (legacy)
- `refactor:extract-block` - Extract components into reusable blocks

## Configuration

The CLI uses configuration from:

1. **Environment Variables** (`.env.local`):
   ```env
   CMS_PROVIDER=file
   CMS_CSS_STRATEGY=modules
   CMS_BASE_PATH=./data
   CMS_API_PREFIX=/api/cms
   ```

2. **Boilerplate Config** (`boilerplate.config.js`):
   ```javascript
   module.exports = {
     provider: 'file',
     cssStrategy: 'modules',
     basePath: './data',
     apiPrefix: '/api/cms',
     cache: { enabled: true, ttl: 3600 },
     security: { enableCSP: true, enableCORS: true }
   };
   ```

## Examples

### Complete Project Setup

```bash
# 1. Scan existing project
npx tsx src/cli/dx.ts scan --verbose

# 2. Initialize boilerplate
npx tsx src/cli/dx.ts init --provider file --css-strategy tailwind

# 3. Generate content
npx tsx src/cli/dx.ts gen:page home --template landing
npx tsx src/cli/dx.ts gen:component Hero --props "title,subtitle,ctaText"
npx tsx src/cli/dx.ts gen:block hero --components Hero

# 4. Validate setup
npx tsx src/cli/dx.ts validate --all

# 5. Later: migrate to database
npx tsx src/cli/dx.ts migrate --dry-run
npx tsx src/cli/dx.ts migrate --provider postgresql
```

### Plugin Development

```bash
# Generate plugin scaffold
npx tsx src/cli/dx.ts gen:plugin ecommerce \
  --components "ProductCard,CartButton,CheckoutForm" \
  --api "products,cart,checkout" \
  --routes "shop,product,cart"

# The plugin will be created in src/plugins/ecommerce/
```

## Error Handling

The CLI provides comprehensive error handling:

- **Validation Errors**: Schema validation failures with detailed messages
- **Compatibility Issues**: Clear warnings about potential conflicts
- **Migration Errors**: Rollback capabilities and integrity checks
- **File System Errors**: Graceful handling of permission and path issues

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure all dependencies are installed
2. **Permission Errors**: Check file system permissions
3. **React Import Errors**: CLI runs in Node.js context, avoid React-specific imports
4. **Migration Failures**: Always run with `--dry-run` first

### Debug Mode

Enable debug output with:

```bash
DEBUG=1 npx tsx src/cli/dx.ts <command>
```

## Contributing

When adding new CLI commands:

1. Add command definition in `src/cli/dx.ts`
2. Implement generator functions in `src/cli/helpers/generators.ts`
3. Add appropriate interfaces and types
4. Update this documentation
5. Add tests in `src/cli/__tests__/`

## Requirements Fulfilled

This CLI implementation fulfills the following requirements:

- **13.1**: Scan command with project analysis and conflict detection
- **13.2**: Init command with integration scaffolding and file generation
- **13.3**: Generate commands for pages, components, and plugins
- **13.4**: Migrate command with database migration execution
- **13.5**: Comprehensive CLI tools for developer experience

The implementation provides a complete developer experience for managing JSON CMS boilerplate projects with Next.js.