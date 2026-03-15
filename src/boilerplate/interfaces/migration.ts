/**
 * Migration System Interface
 */

export interface MigrationPlan {
  id: string;
  name: string;
  description: string;
  source: ContentSource;
  target: ContentSource;
  steps: MigrationStep[];
  estimatedDuration: number;
  risks: MigrationRisk[];
  dependencies: string[];
  createdAt: string;
  createdBy: string;
}

export interface ContentSource {
  type: 'file' | 'database' | 'api';
  config: Record<string, unknown>;
  schema?: SourceSchema;
}

export interface SourceSchema {
  pages: SchemaDefinition;
  blocks: SchemaDefinition;
  components: SchemaDefinition;
  seo: SchemaDefinition;
  settings: SchemaDefinition;
}

export interface SchemaDefinition {
  fields: SchemaField[];
  relationships: SchemaRelationship[];
  constraints: SchemaConstraint[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  required: boolean;
  defaultValue?: unknown;
  validation?: FieldValidation;
}

export interface SchemaRelationship {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  target: string;
  foreignKey?: string;
}

export interface SchemaConstraint {
  type: 'unique' | 'index' | 'check' | 'foreign_key';
  fields: string[];
  condition?: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: unknown[];
  custom?: string;
}

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  type: 'schema' | 'data' | 'validation' | 'cleanup';
  operation: MigrationOperation;
  dependencies: string[];
  rollback?: MigrationOperation;
  estimatedDuration: number;
}

export interface MigrationOperation {
  type: 'create' | 'update' | 'delete' | 'transform' | 'validate';
  target: string;
  query?: string;
  script?: string;
  parameters?: Record<string, unknown>;
  batchSize?: number;
}

export interface MigrationRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation: string;
  probability: number;
}

export interface MigrationResult {
  id: string;
  planId: string;
  status: 'success' | 'failed' | 'partial';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  steps: MigrationStepResult[];
  errors: MigrationError[];
  warnings: string[];
  statistics: MigrationStatistics;
}

export interface MigrationStepResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: MigrationError[];
}

export interface MigrationError {
  code: string;
  message: string;
  details?: unknown;
  stepId?: string;
  recordId?: string;
  timestamp: string;
}

export interface MigrationStatistics {
  totalRecords: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  recordsSkipped: number;
  dataTransferred: number; // bytes
  throughput: number; // records per second
}

/**
 * Migration Manager Interface
 */
export interface MigrationManager {
  /**
   * Create migration plan
   */
  planMigration(source: ContentSource, target: ContentSource, options?: MigrationOptions): Promise<MigrationPlan>;

  /**
   * Execute migration plan
   */
  executeMigration(planId: string, options?: ExecutionOptions): Promise<MigrationResult>;

  /**
   * Rollback migration
   */
  rollbackMigration(migrationId: string): Promise<void>;

  /**
   * Validate migration result
   */
  validateMigration(migrationId: string): Promise<ValidationResult>;

  /**
   * Get migration status
   */
  getMigrationStatus(migrationId: string): Promise<MigrationStatus>;

  /**
   * List migrations
   */
  listMigrations(filters?: MigrationFilters): Promise<MigrationResult[]>;

  /**
   * Get migration plan
   */
  getMigrationPlan(planId: string): Promise<MigrationPlan | null>;

  /**
   * Update migration plan
   */
  updateMigrationPlan(planId: string, updates: Partial<MigrationPlan>): Promise<MigrationPlan>;

  /**
   * Delete migration plan
   */
  deleteMigrationPlan(planId: string): Promise<void>;

  /**
   * Estimate migration time
   */
  estimateMigrationTime(planId: string): Promise<number>;

  /**
   * Get migration dependencies
   */
  getMigrationDependencies(planId: string): Promise<string[]>;
}

export interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  parallelism?: number;
  skipValidation?: boolean;
  continueOnError?: boolean;
  backupSource?: boolean;
  transformations?: DataTransformation[];
}

export interface ExecutionOptions {
  dryRun?: boolean;
  skipSteps?: string[];
  onlySteps?: string[];
  continueOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface DataTransformation {
  field: string;
  operation: 'rename' | 'convert' | 'split' | 'merge' | 'calculate' | 'lookup';
  parameters: Record<string, unknown>;
}

export interface MigrationStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep?: string;
  estimatedTimeRemaining?: number;
  startedAt?: string;
  lastUpdated: string;
}

export interface MigrationFilters {
  status?: 'success' | 'failed' | 'partial';
  source?: string;
  target?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: ValidationStatistics;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  recordId?: string;
  details?: unknown;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  recordId?: string;
  suggestion?: string;
}

export interface ValidationStatistics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  recordsWithWarnings: number;
  fieldsValidated: number;
  constraintsChecked: number;
}

/**
 * Schema Analyzer Interface
 */
export interface SchemaAnalyzer {
  /**
   * Analyze source schema
   */
  analyzeSchema(source: ContentSource): Promise<SourceSchema>;

  /**
   * Compare schemas
   */
  compareSchemas(source: SourceSchema, target: SourceSchema): Promise<SchemaComparison>;

  /**
   * Generate migration steps from schema differences
   */
  generateMigrationSteps(comparison: SchemaComparison): Promise<MigrationStep[]>;

  /**
   * Validate schema compatibility
   */
  validateCompatibility(source: SourceSchema, target: SourceSchema): Promise<CompatibilityResult>;
}

export interface SchemaComparison {
  added: SchemaField[];
  removed: SchemaField[];
  modified: SchemaFieldChange[];
  relationshipChanges: SchemaRelationshipChange[];
  constraintChanges: SchemaConstraintChange[];
}

export interface SchemaFieldChange {
  field: string;
  oldDefinition: SchemaField;
  newDefinition: SchemaField;
  changes: string[];
}

export interface SchemaRelationshipChange {
  relationship: string;
  changeType: 'added' | 'removed' | 'modified';
  oldDefinition?: SchemaRelationship;
  newDefinition?: SchemaRelationship;
}

export interface SchemaConstraintChange {
  constraint: string;
  changeType: 'added' | 'removed' | 'modified';
  oldDefinition?: SchemaConstraint;
  newDefinition?: SchemaConstraint;
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  recommendations: string[];
}

export interface CompatibilityIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  resolution?: string;
}