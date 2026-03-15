# Database Migration System

A comprehensive database migration system that provides seamless transition from JSON files to database storage with planning, execution, rollback, and verification capabilities.

## Overview

The migration system is designed to handle large-scale migrations from file-based JSON content to database storage while maintaining data integrity, providing rollback capabilities, and offering detailed progress tracking.

## Key Features

- **Migration Planning**: Analyze source data and create detailed migration plans
- **Schema Generation**: Automatically generate database schemas from JSON structure analysis
- **Batch Processing**: Handle large datasets with configurable batch sizes and concurrent processing
- **Data Validation**: Comprehensive validation with integrity checks and constraint verification
- **Rollback Support**: Safe rollback mechanisms for failed migrations
- **Progress Tracking**: Real-time progress monitoring and detailed reporting
- **Multi-Provider Support**: PostgreSQL, MongoDB, and SQLite database providers
- **Performance Optimization**: Intelligent batching and performance monitoring

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Migration       │    │ Schema           │    │ Data Transfer   │
│ Manager         │───▶│ Analyzer         │    │ Manager         │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Migration       │    │ Database Schema  │    │ Batch           │
│ Storage         │    │ Generation       │    │ Processing      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Usage

### Basic Usage

```typescript
import { createFileMigrationSystem } from '@/boilerplate/migration';

// Create migration system
const migrationManager = createFileMigrationSystem('./migrations');

// Define source and target
const source = {
  type: 'file',
  config: {
    basePath: './data',
    patterns: {
      pages: 'pages/**/*.json',
      blocks: 'blocks/**/*.json',
      seo: 'seo/**/*.json',
      settings: 'settings/**/*.json'
    }
  }
};

const target = {
  type: 'database',
  config: {
    provider: 'postgresql',
    connectionString: 'postgresql://localhost:5432/cms',
    schema: 'cms'
  }
};

// Plan migration
const plan = await migrationManager.planMigration(source, target);
console.log(`Migration plan created with ${plan.steps.length} steps`);
console.log(`Estimated duration: ${plan.estimatedDuration}ms`);

// Execute migration
const result = await migrationManager.executeMigration(plan);
console.log(`Migration ${result.status}: ${result.itemsProcessed}/${result.itemsTotal} items`);

// Validate migration
const validation = await migrationManager.validateMigration(result.migrationId);
console.log(`Migration valid: ${validation.valid}`);
```

### Advanced Configuration

```typescript
import { 
  MigrationManager,
  SchemaAnalyzer,
  DataTransferManager,
  FileMigrationStorage
} from '@/boilerplate/migration';

// Create with custom configuration
const schemaAnalyzer = new SchemaAnalyzer();
const dataTransferManager = new DataTransferManager({
  batchSize: 500,
  maxConcurrentBatches: 10,
  retryAttempts: 5
});
const storage = new FileMigrationStorage('./custom-migrations');

const migrationManager = new MigrationManager(
  schemaAnalyzer,
  dataTransferManager,
  storage
);
```

### Rollback Migration

```typescript
// Get migration history
const history = await migrationManager.getMigrationHistory();
const lastMigration = history[0];

if (lastMigration.result?.rollbackAvailable) {
  await migrationManager.rollbackMigration(lastMigration.id);
  console.log('Migration rolled back successfully');
}
```

## Migration Process

### 1. Planning Phase

The migration manager analyzes the source data structure and creates a detailed plan:

- **Source Analysis**: Scans JSON files and analyzes structure
- **Schema Generation**: Creates database schema based on content analysis
- **Step Planning**: Breaks migration into discrete, manageable steps
- **Risk Assessment**: Identifies potential risks and mitigation strategies
- **Duration Estimation**: Calculates estimated time for completion

### 2. Execution Phase

The migration is executed in planned steps:

- **Schema Creation**: Creates database tables, indexes, and constraints
- **Data Transfer**: Transfers content in batches with validation
- **Integrity Checks**: Verifies data integrity throughout the process
- **Progress Tracking**: Provides real-time progress updates
- **Error Handling**: Handles failures with retry logic and recovery

### 3. Validation Phase

Post-migration validation ensures data integrity:

- **Completeness Check**: Verifies all data was transferred
- **Integrity Verification**: Validates referential integrity
- **Schema Compliance**: Ensures data matches schema requirements
- **Checksum Validation**: Verifies data hasn't been corrupted

## Schema Analysis

The schema analyzer automatically detects and maps JSON structures to database schemas:

### Field Type Mapping

| JSON Type | PostgreSQL | MongoDB | SQLite |
|-----------|------------|---------|--------|
| string    | VARCHAR(500) | string | TEXT |
| number (int) | INTEGER | int | INTEGER |
| number (float) | DECIMAL(10,2) | double | REAL |
| boolean   | BOOLEAN | bool | INTEGER |
| object/array | JSONB | object | TEXT |
| null      | NULL | null | NULL |

### Automatic Schema Features

- **Primary Keys**: UUID primary keys for all tables
- **Timestamps**: Created/updated timestamp tracking
- **Indexes**: Automatic index generation for common query patterns
- **Constraints**: Data validation constraints
- **Foreign Keys**: Relationship detection and foreign key creation
- **Multi-Tenant**: Tenant isolation support

## Data Transfer

### Batch Processing

The data transfer manager processes content in configurable batches:

```typescript
const batches = await dataTransferManager.createBatches(source, 100);

for (const batch of batches) {
  const validation = await dataTransferManager.validateBatch(batch);
  if (validation.valid) {
    const result = await dataTransferManager.transferBatch(batch);
    console.log(`Batch ${batch.id}: ${result.status}`);
  }
}
```

### Validation

Each batch undergoes comprehensive validation:

- **Schema Validation**: Ensures data matches expected structure
- **Checksum Verification**: Detects data corruption
- **Duplicate Detection**: Identifies duplicate content
- **Reference Integrity**: Validates relationships between entities
- **Constraint Checking**: Ensures data meets business rules

### Error Handling

Robust error handling with recovery mechanisms:

- **Retry Logic**: Automatic retry with exponential backoff
- **Partial Success**: Continues processing despite individual item failures
- **Error Reporting**: Detailed error information for debugging
- **Recovery Strategies**: Multiple recovery options for different error types

## Storage Backends

### File Storage

Default storage using the file system:

```typescript
const storage = new FileMigrationStorage('./migrations');
```

Directory structure:
```
./migrations/
├── plans/
│   ├── plan-123.json
│   └── plan-456.json
└── records/
    ├── migration-123.json
    └── migration-456.json
```

### Database Storage

Store migration metadata in database:

```typescript
const storage = new DatabaseMigrationStorage('postgresql://localhost:5432/migrations');
```

## Performance Optimization

### Batch Size Optimization

Optimal batch sizes depend on content size and system resources:

```typescript
// Small items: larger batches
const smallItemBatchSize = 1000;

// Large items: smaller batches
const largeItemBatchSize = 50;

// Auto-sizing based on content
const adaptiveBatchSize = Math.max(50, Math.min(1000, 10000 / averageItemSize));
```

### Concurrent Processing

Configure concurrent batch processing:

```typescript
const dataTransferManager = new DataTransferManager({
  batchSize: 100,
  maxConcurrentBatches: 5, // Process 5 batches simultaneously
  retryAttempts: 3
});
```

### Memory Management

Monitor and optimize memory usage:

```typescript
// Monitor performance metrics
const result = await migrationManager.executeMigration(plan);
console.log(`Memory usage: ${result.metadata.performance.memoryUsage}MB`);
console.log(`Throughput: ${result.metadata.performance.throughput} items/sec`);
```

## Error Handling

### Error Types

The system handles various error categories:

- **Validation Errors**: Schema validation failures
- **Constraint Errors**: Database constraint violations
- **Reference Errors**: Missing referenced entities
- **Duplicate Errors**: Duplicate key violations
- **System Errors**: Infrastructure failures

### Recovery Strategies

Different recovery strategies for different error types:

```typescript
const result = await migrationManager.executeMigration(plan);

if (result.status === 'partial') {
  // Some items failed - review errors
  for (const error of result.errors) {
    if (error.recoverable) {
      // Retry individual items
      console.log(`Recoverable error: ${error.message}`);
    } else {
      // Manual intervention required
      console.log(`Manual fix needed: ${error.message}`);
    }
  }
}
```

## Monitoring and Logging

### Progress Tracking

Real-time progress monitoring:

```typescript
// Monitor migration progress
const status = await migrationManager.getMigrationStatus(migrationId);
console.log(`Current status: ${status}`);

// Get detailed progress
const record = await migrationStorage.getRecord(migrationId);
if (record.result) {
  const progress = (record.result.itemsProcessed / record.result.itemsTotal) * 100;
  console.log(`Progress: ${progress.toFixed(1)}%`);
}
```

### Performance Metrics

Comprehensive performance tracking:

```typescript
const result = await migrationManager.executeMigration(plan);

console.log('Performance Metrics:');
console.log(`- Throughput: ${result.metadata.performance.throughput} items/sec`);
console.log(`- Memory Usage: ${result.metadata.performance.memoryUsage}MB`);
console.log(`- CPU Usage: ${result.metadata.performance.cpuUsage}%`);
console.log(`- Network I/O: ${result.metadata.performance.networkIO} bytes`);
console.log(`- Disk I/O: ${result.metadata.performance.diskIO} bytes`);
```

## Testing

### Unit Tests

Run unit tests for individual components:

```bash
npm test src/boilerplate/migration/__tests__/migration-manager.test.ts
npm test src/boilerplate/migration/__tests__/schema-analyzer.test.ts
npm test src/boilerplate/migration/__tests__/data-transfer-manager.test.ts
```

### Integration Tests

Run end-to-end integration tests:

```bash
npm test src/boilerplate/migration/__tests__/integration.test.ts
```

### Test Coverage

The migration system includes comprehensive test coverage:

- Migration planning and execution
- Schema analysis and generation
- Data transfer and validation
- Error handling and recovery
- Storage operations
- Performance optimization

## Best Practices

### Before Migration

1. **Backup Data**: Always create backups before migration
2. **Test Environment**: Test migration in staging environment first
3. **Resource Planning**: Ensure adequate system resources
4. **Downtime Planning**: Plan for potential service downtime

### During Migration

1. **Monitor Progress**: Watch migration progress and performance metrics
2. **Resource Monitoring**: Monitor system resources (CPU, memory, disk)
3. **Error Handling**: Be prepared to handle errors and failures
4. **Communication**: Keep stakeholders informed of progress

### After Migration

1. **Validation**: Thoroughly validate migrated data
2. **Performance Testing**: Test application performance with new database
3. **Cleanup**: Clean up temporary files and resources
4. **Documentation**: Document any issues and resolutions

## Troubleshooting

### Common Issues

#### Migration Fails with Schema Errors

```typescript
// Check schema compatibility
const sourceSchema = await schemaAnalyzer.analyzeJsonStructure('./data');
const targetSchema = await schemaAnalyzer.generateDatabaseSchema(sourceSchema, 'postgresql');
const compatibility = await schemaAnalyzer.validateSchemaCompatibility(sourceSchema, targetSchema);

if (!compatibility.compatible) {
  console.log('Schema issues:', compatibility.issues);
  console.log('Recommendations:', compatibility.recommendations);
}
```

#### Performance Issues

```typescript
// Optimize batch size
const dataTransferManager = new DataTransferManager({
  batchSize: 50, // Reduce batch size
  maxConcurrentBatches: 2, // Reduce concurrency
  retryAttempts: 2
});
```

#### Memory Issues

```typescript
// Monitor memory usage
const result = await migrationManager.executeMigration(plan);
if (result.metadata.performance.memoryUsage > 1000) {
  console.log('High memory usage detected - consider smaller batch sizes');
}
```

## API Reference

### MigrationManager

Main orchestrator for migration operations.

#### Methods

- `planMigration(source, target)`: Create migration plan
- `executeMigration(plan)`: Execute migration
- `rollbackMigration(migrationId)`: Rollback migration
- `validateMigration(migrationId)`: Validate migration
- `getMigrationHistory()`: Get migration history
- `getMigrationStatus(migrationId)`: Get migration status

### SchemaAnalyzer

Analyzes JSON structures and generates database schemas.

#### Methods

- `analyzeJsonStructure(sourcePath)`: Analyze JSON files
- `generateDatabaseSchema(schema, provider)`: Generate database schema
- `validateSchemaCompatibility(source, target)`: Validate compatibility

### DataTransferManager

Handles batch data transfer with validation.

#### Methods

- `createBatches(source, batchSize)`: Create data batches
- `transferBatch(batch)`: Transfer single batch
- `validateBatch(batch)`: Validate batch data

### MigrationStorage

Persists migration plans and records.

#### Methods

- `storePlan(plan)`: Store migration plan
- `getPlan(planId)`: Retrieve migration plan
- `storeRecord(record)`: Store migration record
- `getRecord(migrationId)`: Retrieve migration record
- `updateRecord(migrationId, updates)`: Update migration record

## Contributing

When contributing to the migration system:

1. **Add Tests**: Ensure new features have comprehensive tests
2. **Update Documentation**: Update this README for new features
3. **Performance**: Consider performance implications of changes
4. **Backward Compatibility**: Maintain compatibility with existing migrations
5. **Error Handling**: Add appropriate error handling for new features

## License

This migration system is part of the JSON CMS Boilerplate project.