/**
 * Database Migration System Interfaces
 * 
 * Provides comprehensive migration capabilities from JSON files to database storage
 * with planning, execution, rollback, and verification features.
 */

export interface MigrationManager {
  planMigration(source: ContentSource, target: ContentSource): Promise<MigrationPlan>;
  executeMigration(plan: MigrationPlan): Promise<MigrationResult>;
  rollbackMigration(migrationId: string): Promise<void>;
  validateMigration(migrationId: string): Promise<ValidationResult>;
  getMigrationHistory(): Promise<MigrationRecord[]>;
  getMigrationStatus(migrationId: string): Promise<MigrationStatus>;
}

export interface ContentSource {
  type: 'file' | 'database';
  config: FileSourceConfig | DatabaseSourceConfig;
}

export interface FileSourceConfig {
  basePath: string;
  patterns: {
    pages: string;
    blocks: string;
    seo: string;
    settings: string;
  };
}

export interface DatabaseSourceConfig {
  provider: 'postgresql' | 'mongodb' | 'sqlite';
  connectionString: string;
  schema?: string;
  tables?: {
    pages: string;
    blocks: string;
    seo: string;
    settings: string;
  };
}

export interface MigrationPlan {
  id: string;
  source: ContentSource;
  target: ContentSource;
  steps: MigrationStep[];
  estimatedDuration: number;
  risks: MigrationRisk[];
  createdAt: string;
  metadata: {
    totalItems: number;
    totalSize: number;
    dependencies: string[];
  };
}

export interface MigrationStep {
  id: string;
  type: 'schema' | 'data' | 'validation' | 'cleanup';
  operation: string;
  description: string;
  dependencies: string[];
  estimatedDuration: number;
  rollbackOperation?: string;
  metadata?: Record<string, unknown>;
}

export interface MigrationRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'data_loss' | 'downtime' | 'performance' | 'compatibility';
  description: string;
  mitigation: string;
  impact: string;
}

export interface MigrationResult {
  migrationId: string;
  status: 'success' | 'partial' | 'failed';
  startTime: string;
  endTime: string;
  duration: number;
  stepsExecuted: number;
  stepsTotal: number;
  itemsProcessed: number;
  itemsTotal: number;
  errors: MigrationError[];
  warnings: string[];
  rollbackAvailable: boolean;
  metadata: {
    performance: PerformanceMetrics;
    dataIntegrity: IntegrityReport;
  };
}

export interface MigrationError {
  step: string;
  type: 'validation' | 'execution' | 'rollback';
  message: string;
  details?: unknown;
  recoverable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  summary: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    missingItems: number;
  };
}

export interface ValidationError {
  type: 'schema' | 'data' | 'reference' | 'constraint';
  item: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface MigrationRecord {
  id: string;
  planId: string;
  status: MigrationStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  source: ContentSource;
  target: ContentSource;
  result?: MigrationResult;
}

export type MigrationStatus = 
  | 'planned' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'rolled_back' 
  | 'partially_completed';

export interface PerformanceMetrics {
  throughput: number; // items per second
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  networkIO: number; // bytes
  diskIO: number; // bytes
}

export interface IntegrityReport {
  checksumValidation: boolean;
  referenceIntegrity: boolean;
  dataConsistency: boolean;
  schemaCompliance: boolean;
  duplicateCheck: boolean;
}

export interface SchemaAnalyzer {
  analyzeJsonStructure(sourcePath: string): Promise<SchemaDefinition>;
  generateDatabaseSchema(schema: SchemaDefinition, provider: string): Promise<string>;
  validateSchemaCompatibility(source: SchemaDefinition, target: SchemaDefinition): Promise<CompatibilityReport>;
}

export interface SchemaDefinition {
  version: string;
  tables: TableDefinition[];
  relationships: RelationshipDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string[];
  foreignKeys: ForeignKeyDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: unknown;
  constraints?: string[];
}

export interface RelationshipDefinition {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  source: string;
  target: string;
  sourceKey: string;
  targetKey: string;
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type?: string;
}

export interface ConstraintDefinition {
  name: string;
  table: string;
  type: 'check' | 'unique' | 'foreign_key';
  definition: string;
}

export interface ForeignKeyDefinition {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'cascade' | 'restrict' | 'set_null';
  onUpdate?: 'cascade' | 'restrict' | 'set_null';
}

export interface CompatibilityReport {
  compatible: boolean;
  issues: CompatibilityIssue[];
  recommendations: string[];
}

export interface CompatibilityIssue {
  type: 'breaking' | 'warning' | 'info';
  category: 'schema' | 'data' | 'performance';
  description: string;
  impact: string;
  solution?: string;
}

export interface DataTransferManager {
  transferBatch(batch: DataBatch): Promise<TransferResult>;
  validateBatch(batch: DataBatch): Promise<ValidationResult>;
  createBatches(source: ContentSource, batchSize: number): Promise<DataBatch[]>;
}

export interface DataBatch {
  id: string;
  type: 'pages' | 'blocks' | 'seo' | 'settings';
  items: ContentItem[];
  size: number;
  checksum: string;
}

export interface ContentItem {
  id: string;
  type: string;
  data: Record<string, unknown>;
  metadata: {
    source: string;
    checksum: string;
    size: number;
    dependencies: string[];
  };
}

export interface TransferResult {
  batchId: string;
  status: 'success' | 'partial' | 'failed';
  itemsProcessed: number;
  itemsTotal: number;
  errors: TransferError[];
  duration: number;
}

export interface TransferError {
  itemId: string;
  type: 'validation' | 'constraint' | 'duplicate' | 'reference';
  message: string;
  recoverable: boolean;
}