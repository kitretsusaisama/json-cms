# Package Transformation Implementation

## Step 1: Create Enterprise Package Foundation

### 1.1 New Package Structure
```bash
# Create enterprise package directory structure
mkdir -p enterprise-package/{src,templates,examples,docs,bin}
mkdir -p enterprise-package/src/{core,cli,templates,integrations,security,testing}
mkdir -p enterprise-package/templates/{environments,docker,ci-cd,monitoring}
mkdir -p enterprise-package/examples/{basic-integration,enterprise-saas,e-commerce}
```

### 1.2 Package Configuration
Create `enterprise-package/package.json`:
```json
{
  "name": "@json-cms/enterprise-boilerplate",
  "version": "1.0.0",
  "description": "Enterprise-ready JSON CMS boilerplate package for Next.js applications",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "json-cms": "./bin/json-cms",
    "json-cms-enterprise": "./bin/json-cms-enterprise"
  },
  "files": [
    "dist/",
    "templates/",
    "examples/",
    "docs/",
    "bin/"
  ],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "vitest",
    "test:e2e": "playwright test",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "cms", "nextjs", "json", "enterprise", "boilerplate", 
    "content-management", "typescript", "react"
  ],
  "peerDependencies": {
    "next": ">=13.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

## Step 2: Extract Core Library

### 2.1 Core Library Exports (`enterprise-package/src/index.ts`)
```typescript
// Core CMS functionality
export * from './core/cms-client';
export * from './core/page-renderer';
export * from './core/component-registry';

// Security framework
export * from './security/input-sanitizer';
export * from './security/rate-limiter';
export * from './security/audit-manager';

// Integration utilities
export * from './integrations/database-adapter';
export * from './integrations/storage-adapter';

// Testing utilities
export * from './testing/test-client';
export * from './testing/mock-data-generator';

// Types and interfaces
export * from './types';
```

### 2.2 Client SDK (`enterprise-package/src/client.ts`)
```typescript
export class CMSClient {
  constructor(config: CMSClientConfig) {
    // Initialize client with configuration
  }
  
  async getPage(slug: string): Promise<Page> {
    // Fetch page implementation
  }
  
  async getBlocks(filters?: BlockFilters): Promise<Block[]> {
    // Fetch blocks implementation
  }
  
  // Additional client methods...
}
```

## Step 3: CLI Transformation

### 3.1 Standalone CLI (`enterprise-package/bin/json-cms`)
```bash
#!/usr/bin/env node
require('../dist/cli/index.js');
```

### 3.2 CLI Implementation (`enterprise-package/src/cli/index.ts`)
```typescript
import { Command } from 'commander';
import { scanProject } from './commands/scan';
import { initProject } from './commands/init';
import { generateContent } from './commands/generate';

const program = new Command();

program
  .name('json-cms')
  .description('JSON CMS Enterprise Boilerplate CLI')
  .version('1.0.0');

// Add commands from current dx.ts
program
  .command('scan')
  .description('Scan Next.js project for compatibility')
  .action(scanProject);

program
  .command('init')
  .description('Initialize CMS in existing Next.js project')
  .action(initProject);

// Additional commands...
program.parse();
```

## Step 4: Template Generation

### 4.1 Next.js Integration Template
Create complete integration template from current application:
```
enterprise-package/templates/next-js-integration/
├── src/
│   ├── app/api/cms/          # API routes from current app
│   ├── components/           # Component registry and blocks
│   ├── lib/                  # Core utilities
│   └── boilerplate/          # Boilerplate modules
├── data/                     # Example content
├── .env.template             # Environment template
├── next.config.js            # Next.js configuration
└── package.json              # Dependencies template
```

### 4.2 Environment Templates
```
enterprise-package/templates/environments/
├── .env.development.template
├── .env.staging.template
├── .env.production.template
└── docker-compose.yml.template
```

## Step 5: Build Configuration

### 5.1 Rollup Configuration (`enterprise-package/rollup.config.js`)
```javascript
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json'
    })
  ],
  external: ['next', 'react', 'react-dom']
};
```

## Implementation Commands

### Create Package Structure
```bash
# 1. Create enterprise package directory
mkdir enterprise-package
cd enterprise-package

# 2. Initialize npm package
npm init -y

# 3. Create directory structure
mkdir -p src/{core,cli,templates,integrations,security,testing}
mkdir -p templates/{environments,docker,ci-cd,monitoring}
mkdir -p examples/{basic-integration,enterprise-saas,e-commerce}
mkdir -p docs/{api-reference,integration,deployment,security}
mkdir -p bin

# 4. Copy and transform existing code
cp -r ../src/boilerplate src/core/
cp -r ../src/cli src/cli/
cp -r ../src/components src/templates/
cp -r ../data templates/content/
```

### Build and Test
```bash
# 1. Install dependencies
npm install rollup @rollup/plugin-typescript @rollup/plugin-node-resolve @rollup/plugin-commonjs

# 2. Build package
npm run build

# 3. Test locally
npm link
cd ../test-project
npm link @json-cms/enterprise-boilerplate
```

## Migration Checklist

- [ ] Create package structure
- [ ] Extract core library code
- [ ] Transform CLI to standalone
- [ ] Create integration templates
- [ ] Set up build system
- [ ] Generate documentation
- [ ] Create example projects
- [ ] Set up testing
- [ ] Configure publishing
- [ ] Create migration guide