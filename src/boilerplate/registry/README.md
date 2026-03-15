# Enhanced Component Registry

The Enhanced Component Registry extends the existing component registry with advanced features including metadata management, validation, plugin support, and dynamic loading capabilities.

## Features

- **Metadata Management**: Rich component metadata with categories, tags, versions, and examples
- **Schema Validation**: Zod-based prop validation for type safety
- **Plugin Support**: Register and manage components from plugins
- **Dynamic Loading**: Lazy loading of components for better performance
- **Search & Discovery**: Search components by name, description, or tags
- **Slot Validation**: Validate component slots and their contents
- **Migration Support**: Seamless migration from existing registry

## Quick Start

```typescript
import { enhancedRegistry, registerComponent } from '@/boilerplate/registry';
import { z } from 'zod';

// Define a component with schema and metadata
const MyComponent: React.FC<{ title: string }> = ({ title }) => (
  <div>{title}</div>
);

const schema = z.object({
  title: z.string(),
});

const metadata = {
  name: 'My Component',
  description: 'A simple component',
  category: 'content',
  version: '1.0.0',
  author: 'developer',
};

// Register the component
registerComponent('MyComponent', {
  component: MyComponent,
  schema,
  metadata,
});

// Use the component
const definition = enhancedRegistry.get('MyComponent');
const validation = enhancedRegistry.validate('MyComponent', { title: 'Hello' });
```

## Core Classes

### EnhancedComponentRegistry

The main registry class that manages component registration and retrieval.

```typescript
class EnhancedComponentRegistry implements ComponentRegistry {
  register(key: string, definition: ComponentDefinition): void
  get(key: string): ComponentDefinition | null
  validate(key: string, props: unknown): ValidationResult
  search(query: string): ComponentDefinition[]
  // ... more methods
}
```

### ComponentDefinition

Defines a component with its metadata and validation schema.

```typescript
interface ComponentDefinition {
  component: React.ComponentType<any>;
  schema?: z.ZodSchema;
  metadata: ComponentMetadata;
  lazy?: boolean;
  loader?: () => Promise<React.ComponentType<any>>;
}
```

### ComponentMetadata

Rich metadata for components including categorization and examples.

```typescript
interface ComponentMetadata {
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  tags?: string[];
  deprecated?: boolean;
  slots?: SlotDefinition[];
  variants?: VariantDefinition[];
  examples?: ComponentExample[];
}
```

## Plugin System

The registry supports plugin-based component registration:

```typescript
import { pluginRegistry, createPluginManifest } from '@/boilerplate/registry';

// Create plugin manifest
const manifest = createPluginManifest('my-plugin', '1.0.0', [
  {
    key: 'PluginComponent',
    path: './components/PluginComponent',
    metadata: {
      name: 'Plugin Component',
      description: 'A component from a plugin',
      category: 'plugin',
      version: '1.0.0',
      author: 'plugin-author',
    },
  },
]);

// Register plugin
await pluginRegistry.registerPlugin('my-plugin', manifest);
```

## Validation

Components can have Zod schemas for prop validation:

```typescript
const schema = z.object({
  title: z.string(),
  variant: z.enum(['primary', 'secondary']).default('primary'),
  size: z.number().min(1).max(10).optional(),
});

// Validate props
const result = enhancedRegistry.validate('MyComponent', {
  title: 'Hello',
  variant: 'primary',
});

if (result.valid) {
  console.log('Props are valid');
} else {
  console.error('Validation errors:', result.errors);
}
```

## Search and Discovery

Find components using various criteria:

```typescript
// Search by name, description, or tags
const results = enhancedRegistry.search('button');

// Get components by category
const actionComponents = enhancedRegistry.listByCategory('action');

// Get all components
const allComponents = enhancedRegistry.list();

// Get registry statistics
const stats = enhancedRegistry.getStats();
```

## Dynamic Loading

Support for lazy-loaded components:

```typescript
// Register lazy component
enhancedRegistry.register('LazyComponent', {
  component: React.lazy(() => import('./LazyComponent')),
  metadata: { /* ... */ },
  lazy: true,
  loader: () => import('./LazyComponent').then(m => m.default),
});

// Load component dynamically
const definition = await enhancedRegistry.loadDynamic('LazyComponent');
```

## Slot Validation

Validate component slots and their contents:

```typescript
const metadata = {
  // ... other metadata
  slots: [
    {
      name: 'header',
      description: 'Header content',
      required: true,
      allowedComponents: ['HeaderComponent'],
      maxItems: 1,
    },
    {
      name: 'content',
      description: 'Main content',
      required: false,
      maxItems: 5,
    },
  ],
};

// Validate slots
const slotValidation = enhancedRegistry.validateSlots('MyComponent', {
  header: [{ componentType: 'HeaderComponent' }],
  content: [
    { componentType: 'TextBlock' },
    { componentType: 'ImageBlock' },
  ],
});
```

## Migration from Existing Registry

The enhanced registry can migrate components from the existing registry:

```typescript
import { migrateExistingRegistry } from '@/boilerplate/registry';

// Migrate existing components
migrateExistingRegistry();

// Validate migration
const results = validateMigratedComponents();
console.log(`Migrated ${results.valid} components successfully`);
```

## Component Examples and Variants

Define examples and variants for better documentation:

```typescript
const metadata = {
  // ... other metadata
  variants: [
    {
      name: 'primary',
      description: 'Primary button style',
      props: { variant: 'primary' },
    },
    {
      name: 'secondary',
      description: 'Secondary button style',
      props: { variant: 'secondary' },
    },
  ],
  examples: [
    {
      name: 'Basic Button',
      description: 'A simple button',
      props: { text: 'Click me', variant: 'primary' },
    },
  ],
};

// Get variants and examples
const variants = enhancedRegistry.getVariants('MyComponent');
const examples = enhancedRegistry.getExamples('MyComponent');
```

## Error Handling

The registry provides comprehensive error handling:

```typescript
// Validation errors
interface ValidationError {
  path: string;
  message: string;
  code: string;
  details?: unknown;
}

// Validation warnings
interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Validation result
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

## Best Practices

1. **Always provide metadata**: Include comprehensive metadata for better discoverability
2. **Use schemas for validation**: Define Zod schemas for type safety
3. **Categorize components**: Use consistent categories for organization
4. **Add examples**: Provide usage examples for documentation
5. **Handle errors gracefully**: Check validation results before using components
6. **Use lazy loading**: For large components, consider lazy loading
7. **Version your components**: Use semantic versioning for component versions

## API Reference

### Registry Methods

- `register(key, definition)` - Register a component
- `unregister(key)` - Unregister a component
- `get(key)` - Get component definition
- `has(key)` - Check if component exists
- `list()` - List all components
- `listByCategory(category)` - List components by category
- `validate(key, props)` - Validate component props
- `search(query)` - Search components
- `loadDynamic(key)` - Load component dynamically
- `getMetadata(key)` - Get component metadata
- `getVariants(key)` - Get component variants
- `getExamples(key)` - Get component examples
- `validateSlots(key, slots)` - Validate component slots
- `registerPlugin(pluginId, components)` - Register plugin components
- `unregisterPlugin(pluginId)` - Unregister plugin components
- `getStats()` - Get registry statistics

### Plugin Methods

- `registerPlugin(pluginId, manifest)` - Register a plugin
- `unregisterPlugin(pluginId)` - Unregister a plugin
- `getPlugin(pluginId)` - Get plugin information
- `listPlugins()` - List all plugins
- `getPluginComponents(pluginId)` - Get plugin components
- `hasPlugin(pluginId)` - Check if plugin exists
- `validateDependencies(pluginId)` - Validate plugin dependencies

## Testing

Run the validation script to test the registry:

```bash
npx tsx src/boilerplate/registry/validate-registry.ts
```

This will run comprehensive tests covering:
- Component registration and retrieval
- Props validation
- Search functionality
- Plugin support
- Error handling
- Migration capabilities

## Integration with Existing Code

The enhanced registry is designed to be backward compatible with the existing registry. Components registered in the existing registry are automatically migrated to the enhanced registry with generated metadata and schemas.

```typescript
// Existing registry usage still works
import { registry } from '@/components/registry';
const Hero = registry.Hero;

// Enhanced registry features are available
import { enhancedRegistry } from '@/boilerplate/registry';
const heroMetadata = enhancedRegistry.getMetadata('Hero');
```

## Performance Considerations

- **Lazy Loading**: Use lazy loading for large components
- **Caching**: Component definitions are cached after first load
- **Validation**: Schemas are compiled once and reused
- **Search**: Search uses efficient string matching algorithms
- **Memory**: Registry uses Maps for O(1) lookups

## Future Enhancements

- **Hot Reloading**: Support for hot reloading of components in development
- **Dependency Tracking**: Track component dependencies and relationships
- **Performance Monitoring**: Monitor component usage and performance
- **Auto-generation**: Generate schemas from TypeScript interfaces
- **Visual Editor**: GUI for managing component registry
- **Import/Export**: Import/export registry configurations