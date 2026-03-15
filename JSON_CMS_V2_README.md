# JSON CMS V2: Constraint-Aware Runtime System

A **严 (strict), composable, constraint-aware runtime** that scales from single developers to enterprise teams while maintaining the simplicity of JSON-first content management.

## 🎯 Core Principles

- **Single source of truth**: JSON is the product; UI is a projection
- **Strict schemas**: Everything validated (Zod + JSON Schema)
- **Constraint satisfaction**: Input → rules → feasible component plan
- **Minimal management**: Overlays, snippets, references keep content DRY
- **Predictable rendering**: Deterministic pipeline with cache keys

## 🏗️ Architecture Overview

### Pipeline: Load → Overlay → Resolve → Plan → Render

1. **Load** raw JSON (page + blocks + settings)
2. **Overlay** (base → site → env → locale → preview) via JSON Merge Patch
3. **Schema Validate** (Ajv + Zod)
4. **Resolve** references (pointers, tokens, dataRef, i18n)
5. **Plan** (constraint evaluation & variant selection)
6. **Render** (map to component registry with prop validation)
7. **Report** (warnings/errors, analytics)

### Key Features

- **Content Graph**: Pages reference reusable `blocks` by ID; blocks can nest
- **Slots + Variants**: Components have typed slots and conditional style variants  
- **Conditions & Expressions**: Safe DSL (no `eval`) to gate blocks/props
- **Constraints**: Declarative rules for layout, SEO, inventory, targeting
- **Overlays**: Environment-specific customization without duplication
- **Deterministic IDs**: Stable identifiers for caching and audit trails

## 📁 File Structure

```
src/
├── types/
│   ├── composer.ts          # Core Zod schemas
│   └── refs.ts              # Reference system types
├── lib/compose/
│   ├── logic.ts             # Expression evaluator  
│   ├── planner.ts           # Constraint satisfaction planner
│   ├── resolve.ts           # JSON overlay & reference resolution
│   └── validator.ts         # Dual schema validation
├── components/renderer/
│   └── JsonRendererV2.tsx   # RSC-first renderer
├── cli/
│   └── dx.ts               # Developer experience CLI
└── data/
    ├── pages/              # Page definitions (.v2.json)
    ├── blocks/             # Reusable component trees
    ├── overlays/           # Environment-specific patches
    ├── settings/
    │   ├── tokens.json     # Design tokens
    │   └── i18n/          # Localization files
    └── _registry.json      # Component metadata
```

## 🔧 Quick Start

### 1. Use the Renderer

```tsx
import JsonRendererV2 from '@/components/renderer/JsonRendererV2';

// In your page component
export default async function HomePage() {
  const ctx = {
    device: 'desktop',
    locale: 'en',
    user: { id: '123' },
    abBucket: 42
  };

  return (
    <JsonRendererV2 
      slug="home" 
      ctx={ctx}
      resolveContext={{ site: 'main', env: 'production' }}
      debug={false}
    />
  );
}
```

### 2. Create Content

**Page** (`src/data/pages/home.v2.json`):
```json
{
  "id": "home",
  "title": "Welcome Home",
  "blocks": ["hero.default", "features.grid"],
  "constraints": [
    {
      "id": "fold-budget",
      "rule": { "op": "<=", "args": [{"$ctx": "metrics.foldWeight"}, 10] }
    }
  ]
}
```

**Block** (`src/data/blocks/hero.default.json`):
```json
{
  "id": "hero.default", 
  "tree": [
    {
      "id": "hero-main",
      "key": "Hero",
      "props": {
        "heading": {"$i18n": "home.hero.heading"},
        "cta": {"text": "Get Started", "href": "/signup"}
      },
      "variants": [
        {
          "name": "desktop",
          "props": {"layout": "side-by-side"},
          "weight": 3,
          "conditions": [
            {"when": {"op": "==", "args": [{"$ctx": "device"}, "desktop"]}}
          ]
        }
      ]
    }
  ]
}
```

### 3. Use the CLI

```bash
# Validate content
npx dx validate --file home --type page --verbose

# Test planning with context
npx dx plan home --device mobile --locale es --ab 1

# Generate scaffolds
npx dx gen:component FeatureCard --props title,description --slots content
npx dx gen:page about --title "About Us" --blocks hero.minimal,content.text

# Verify integrity
npx dx integrity --generate
npx dx integrity --verify
```

## 🎨 Advanced Features

### Constraint Examples

```json
{
  "constraints": [
    {
      "id": "hero-first",
      "rule": {"op": "==", "args": [{"$ctx": "components.0.key"}, "Hero"]}
    },
    {
      "id": "seo-title-length", 
      "rule": {"op": "<=", "args": [{"$ctx": "metrics.seo.titleLength"}, 60]},
      "level": "warn"
    },
    {
      "id": "mobile-max-weight",
      "rule": {"op": "<=", "args": [{"$ctx": "metrics.foldWeight"}, 6]},
      "conditions": [
        {"when": {"op": "==", "args": [{"$ctx": "device"}, "mobile"]}}
      ]
    }
  ]
}
```

### Reference System

```json
{
  "props": {
    "heading": {"$i18n": "home.hero.title"},
    "spacing": "token:spacing.lg", 
    "product": {"dataRef": {"source": "product", "key": "featured-item"}},
    "theme": {"$ref": "settings:theme.colors.primary"}
  }
}
```

### Overlays for Multi-tenancy

Base: `src/data/pages/home.v2.json`
Site overlay: `src/data/overlays/site-acme/pages/home.v2.json`
```json
{
  "title": "ACME Corp - Welcome",
  "append": [
    {"id": "acme-banner", "key": "AnnouncementBar", "props": {"text": "ACME customers get 20% off!"}}
  ]
}
```

## 🧪 Testing & Validation

- **Unit tests**: Expression evaluator, planner logic, reference resolution
- **Integration tests**: Full pipeline validation, constraint scenarios  
- **Accessibility**: Built-in image alt-text, heading hierarchy validation
- **SEO**: Title length, meta description, Open Graph validation
- **Performance**: Component weight budgets, fold optimization

## 🚀 Production Ready

- **Edge-safe**: Filesystem reads limited to allowlist
- **Integrity**: SHA-256 verification of content files
- **Audit trail**: All changes logged with deterministic IDs
- **Multi-tenant**: Site/env/locale overlays with role-based access
- **Caching**: Smart cache keys based on content + context hash
- **Security**: No `eval()`, sanitized HTML, CSP headers

## 📊 Monitoring & Analytics

The system automatically tracks:
- Planning metrics (constraints passed/failed, variants selected)
- Performance metrics (component weight, fold budget)
- Content health (missing refs, validation warnings) 
- Usage patterns (component popularity, variant effectiveness)

## 🛠️ Migration Path

1. **Start small**: Convert existing pages to V2 format
2. **Add constraints**: Gradually introduce validation rules
3. **Extract blocks**: Refactor repeated patterns into reusable blocks
4. **Multi-site**: Add overlays for environment-specific content
5. **Database**: Migrate from filesystem to DB while keeping same API

---

## What You Get

✅ **Hard guarantees** (schemas + constraints) → fewer regressions  
✅ **Predictable UX** (planner) → no surprises in production  
✅ **Low overhead** (overlays/tokens) → minimal content management  
✅ **Future-proof** (DB adapter ready) → same runtime, new storage  
✅ **Auditability** (IDs + integrity) → safe to scale to teams

This system gives you the **strictness of a traditional CMS** with the **flexibility of JSON** and the **power of constraint satisfaction**. It's production-ready yet developer-friendly.
