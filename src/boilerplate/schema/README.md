# Schema Validation and Type Generation System

A comprehensive system for managing JSON schemas, runtime validation, and TypeScript type generation in the JSON CMS Boilerplate.

## Features

- **Schema Generation**: Generate Zod schemas from TypeScript interfaces, JSON examples, or existing data
- **Runtime Validation**: Comprehensive validation with detailed error reporting and performance metrics
- **Type Generation**: Generate TypeScript interfaces, type aliases, and validation functions from schemas
- **Schema Registry**: Centralized schema management with versioning and migration support
- **Schema Analysis**: Analyze schema complexity, compatibility, and optimization opportunities
- **Security Validation**: Built-in checks for XSS, sensitive data, and security best practices

## Quick Start

```typescript
import { 
  SchemaGenerator, 
  SchemaValidator, 
  TypeGenerator, 
  SchemaRegistry,
  SchemaUtils 
} from '@/boilerplate/schema';

// Generate schema from examples
const generator = new SchemaGenerator();
const examples = [
  { id: '1', name: 'John', email: 'john@example.com' },
  { id: '2', name: 'Jane', email: 'jane@example.com' }
];

const schema = await generator.fromExamples(examples);

// Validate data
const validator = new SchemaValidator();
const result = validator.validate(schema.zodSchema, { 
  id: '3', 
  name: 'Bob', 
  email: 'bob@example.com' 
});

if (result.valid) {
  console.log('Data is valid:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}

// Generate TypeScript types
const typeGenerator = new TypeGenerator();
const types = typeGenerator.generateInterface(schema.zodSchema, 'User');
console.log(types);
```

## Core Components

### SchemaGenerator

Generates schemas from various sources:

```typescript
// From TypeScript interface
const schema = await generator.fromTypeScript(`
  interface User {
    id: string;
    name: string;
    age?: number;
  }
`);

// From JSON examples
const schema = await generator.fromExamples([
  { id: '1', name: 'John', active: true },
  { id: '2', name: 'Jane', active: false }
]);

// Merge multiple schemas
const merged = await generator.merge([schema1, schema2]);
```

### SchemaValidator

Provides comprehensive validation:

```typescript
const validator = new SchemaValidator();

// Basic validation
const result = validator.validate(schema, data);

// Validation with transformation
const result = validator.validateAndTransform(schema, data);

// Batch validation
const results = validator.validateBatch(schema, [data1, data2, data3]);

// Custom error formatting
const result = validator.validateWithFormatter(schema, data, customFormatter);
```

### TypeGenerator

Generates TypeScript code:

```typescript
const generator = new TypeGenerator();

// Generate interface
const interface = generator.generateInterface(schema, 'User');

// Generate type alias
const type = generator.generateTypeAlias(schema, 'UserType');

// Generate validation functions
const validators = generator.generateValidator(schema, 'User');

// Generate complete module
const module = generator.generateModule({
  User: userSchema,
  Post: postSchema
});
```

### SchemaRegistry

Manages schemas with versioning:

```typescript
const registry = new SchemaRegistry();

// Register schema
await registry.register(schemaDefinition);

// Get schema
const schema = await registry.get('User', '1.0.0');

// Validate against registered schema
const result = await registry.validate('User', data);

// Create new version
const versionInfo = await registry.createVersion('User', newSchema);

// Migrate data between versions
const migrated = await registry.migrateData('User', data, '1.0.0', '2.0.0');
```

### SchemaAnalyzer

Analyzes schemas for optimization:

```typescript
const analyzer = new SchemaAnalyzer();

// Analyze complexity
const complexity = analyzer.analyzeComplexity(schema);
console.log(`Complexity score: ${complexity.score}`);
console.log(`Recommendations:`, complexity.recommendations);

// Compare schemas
const compatibility = analyzer.compareSchemas(oldSchema, newSchema);
console.log(`Compatible: ${compatibility.compatible}`);
console.log(`Breaking changes:`, compatibility.breakingChanges);

// Get optimization suggestions
const optimizations = analyzer.suggestOptimizations(schema);
optimizations.forEach(opt => {
  console.log(`${opt.type}: ${opt.description}`);
});

// Extract dependencies
const graph = analyzer.extractDependencies(schemas);
console.log(`Dependency cycles:`, graph.cycles);
```

## Utility Functions

For quick operations, use the utility functions:

```typescript
import { SchemaUtils } from '@/boilerplate/schema';

// Quick validation
const result = SchemaUtils.validate(schema, data);

// Generate interface
const interface = SchemaUtils.generateInterface(schema, 'User');

// Generate JSON Schema
const jsonSchema = SchemaUtils.generateJsonSchema(schema);

// Analyze complexity
const complexity = SchemaUtils.analyzeComplexity(schema);

// Compare schemas
const compatibility = SchemaUtils.compareSchemas(oldSchema, newSchema);
```

## Validation Features

### Error Reporting

Detailed error information with paths and suggestions:

```typescript
{
  valid: false,
  errors: [
    {
      path: 'user.email',
      message: 'Invalid email format',
      code: 'invalid_string',
      expected: 'email',
      received: 'invalid-email'
    }
  ],
  warnings: [
    {
      path: 'user.password',
      message: 'Sensitive field name detected',
      suggestion: 'Consider encrypting or hashing sensitive data',
      severity: 'medium'
    }
  ]
}
```

### Performance Metrics

Track validation performance:

```typescript
{
  performance: {
    validationTime: 2.5, // milliseconds
    schemaSize: 1024     // bytes
  }
}
```

### Security Warnings

Automatic detection of security issues:

- XSS content in strings
- Sensitive field names (password, token, etc.)
- Large objects that may impact performance
- Deep nesting that may cause stack overflow

## Schema Versioning

### Version Management

```typescript
// Create initial version
const v1 = await registry.createVersion('User', initialSchema);
// Returns: { version: '1.0.0', compatibility: 'compatible' }

// Add compatible changes (optional fields)
const v2 = await registry.createVersion('User', extendedSchema);
// Returns: { version: '1.1.0', compatibility: 'compatible' }

// Breaking changes (remove fields)
const v3 = await registry.createVersion('User', reducedSchema);
// Returns: { version: '2.0.0', compatibility: 'breaking' }
```

### Data Migration

```typescript
// Migrate data between versions
const oldData = { id: '1', name: 'John' };
const newData = await registry.migrateData('User', oldData, '1.0.0', '2.0.0');
```

## Type Generation Options

Customize type generation:

```typescript
const options: TypeGenerationOptions = {
  outputFormat: 'typescript',     // 'typescript' | 'json-schema' | 'both'
  includeComments: true,          // Include JSDoc comments
  includeExamples: false,         // Include example values
  exportType: 'named',            // 'named' | 'default' | 'namespace'
  strictMode: true,               // Enable strict type checking
  generateValidators: true        // Generate validation functions
};

const types = generator.generateInterface(schema, 'User', options);
```

## Integration with CMS

### Content Type Schemas

```typescript
// Define content type schemas
const pageSchema = z.object({
  id: z.string(),
  title: z.string(),
  blocks: z.array(z.string()),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonical: z.string().url().optional()
  }),
  metadata: z.record(z.unknown()).optional()
});

// Register with CMS
await registry.register({
  id: 'CMSPage',
  version: '1.0.0',
  title: 'CMS Page Schema',
  zodSchema: pageSchema,
  jsonSchema: registry.generateJsonSchema(pageSchema),
  typeDefinition: typeGenerator.generateInterface(pageSchema, 'CMSPage')
});

// Validate page data
const result = await registry.validate('CMSPage', pageData);
```

### Component Prop Validation

```typescript
// Generate schema for component props
const heroPropsSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().optional(),
  backgroundImage: z.string().url().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().url().optional()
});

// Use in component registry
componentRegistry.register('Hero', {
  component: HeroComponent,
  schema: heroPropsSchema,
  metadata: {
    name: 'Hero Section',
    category: 'layout'
  }
});
```

## Best Practices

### Schema Design

1. **Keep schemas simple**: Avoid deep nesting (max 5 levels)
2. **Use validation constraints**: Add min/max, format validations
3. **Make fields optional when appropriate**: Use `.optional()` for non-required fields
4. **Use discriminated unions**: Add type fields for better type safety
5. **Document schemas**: Include descriptions and examples

### Performance

1. **Cache compiled schemas**: Reuse schema instances
2. **Use batch validation**: Validate multiple items together
3. **Monitor complexity**: Keep complexity scores reasonable
4. **Optimize large schemas**: Break down into smaller, composable schemas

### Security

1. **Sanitize input**: Always validate and sanitize user input
2. **Avoid sensitive data**: Don't include passwords or tokens in schemas
3. **Use proper types**: Be specific about string formats (email, url, uuid)
4. **Monitor warnings**: Pay attention to security warnings

### Versioning

1. **Semantic versioning**: Use semver for schema versions
2. **Document changes**: Include change descriptions
3. **Test migrations**: Validate migration logic thoroughly
4. **Backward compatibility**: Prefer additive changes when possible

## Testing

The schema system includes comprehensive tests:

```bash
# Run all schema tests
npm test src/boilerplate/schema

# Run specific test suites
npm test src/boilerplate/schema/__tests__/schema-generator.test.ts
npm test src/boilerplate/schema/__tests__/schema-validator.test.ts
npm test src/boilerplate/schema/__tests__/integration.test.ts
```

## API Reference

See the TypeScript interfaces in `src/boilerplate/schema/interfaces.ts` for complete API documentation.