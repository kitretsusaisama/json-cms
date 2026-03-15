/**
 * Schema Registry
 * 
 * Central registry for managing schemas with versioning and validation
 */

import { z } from 'zod';
import { JSONSchema7 } from 'json-schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { 
  SchemaRegistry as ISchemaRegistry,
  SchemaDefinition,
  SchemaValidationResult,
  SchemaVersionInfo,
  SchemaChange,
  TypeGenerationOptions
} from './interfaces';
import { SchemaValidator } from './schema-validator';
import { TypeGenerator } from './type-generator';

export class SchemaRegistry implements ISchemaRegistry {
  private schemas = new Map<string, Map<string, SchemaDefinition>>();
  private validator = new SchemaValidator();
  private typeGenerator = new TypeGenerator();

  /**
   * Register a schema definition
   */
  async register(definition: SchemaDefinition): Promise<void> {
    if (!this.schemas.has(definition.id)) {
      this.schemas.set(definition.id, new Map());
    }
    
    const versionMap = this.schemas.get(definition.id)!;
    versionMap.set(definition.version, definition);
  }

  /**
   * Get a schema by ID and version
   */
  async get(id: string, version?: string): Promise<SchemaDefinition | null> {
    const versionMap = this.schemas.get(id);
    if (!versionMap) {
      return null;
    }
    
    if (version) {
      return versionMap.get(version) || null;
    }
    
    // Return latest version
    const versions = Array.from(versionMap.keys()).sort(this.compareVersions);
    const latestVersion = versions[versions.length - 1];
    return versionMap.get(latestVersion) || null;
  }

  /**
   * List all schemas
   */
  async list(): Promise<SchemaDefinition[]> {
    const allSchemas: SchemaDefinition[] = [];
    
    for (const versionMap of this.schemas.values()) {
      for (const schema of versionMap.values()) {
        allSchemas.push(schema);
      }
    }
    
    return allSchemas.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Validate data against a schema
   */
  async validate(schemaId: string, data: unknown, version?: string): Promise<SchemaValidationResult> {
    const schema = await this.get(schemaId, version);
    if (!schema) {
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: `Schema not found: ${schemaId}${version ? `@${version}` : ''}`,
          code: 'SCHEMA_NOT_FOUND'
        }],
        warnings: [],
        performance: {
          validationTime: 0,
          schemaSize: 0
        }
      };
    }
    
    return this.validator.validate(schema.zodSchema, data);
  }

  /**
   * Generate TypeScript types from schema
   */
  async generateTypes(schemaId: string, options?: TypeGenerationOptions): Promise<string> {
    const schema = await this.get(schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaId}`);
    }
    
    const opts = options || {
      outputFormat: 'typescript',
      includeComments: true,
      includeExamples: false,
      exportType: 'named',
      strictMode: true,
      generateValidators: true
    };
    
    if (opts.exportType === 'interface') {
      return this.typeGenerator.generateInterface(schema.zodSchema, schema.id, opts);
    } else {
      return this.typeGenerator.generateTypeAlias(schema.zodSchema, schema.id, opts);
    }
  }

  /**
   * Generate JSON Schema from Zod schema
   */
  generateJsonSchema(zodSchema: z.ZodSchema): JSONSchema7 {
    return zodToJsonSchema(zodSchema) as JSONSchema7;
  }

  /**
   * Create schema version
   */
  async createVersion(
    schemaId: string, 
    newSchema: z.ZodSchema, 
    changes?: SchemaChange[]
  ): Promise<SchemaVersionInfo> {
    const existingSchema = await this.get(schemaId);
    
    if (!existingSchema) {
      // First version
      const version = '1.0.0';
      const definition: SchemaDefinition = {
        id: schemaId,
        version,
        title: schemaId,
        zodSchema: newSchema,
        jsonSchema: this.generateJsonSchema(newSchema),
        typeDefinition: this.typeGenerator.generateTypeAlias(newSchema, schemaId),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.register(definition);
      
      return {
        version,
        changes: changes || [],
        compatibility: 'compatible',
        migrationRequired: false
      };
    }
    
    // Analyze changes
    const analyzedChanges = changes || await this.analyzeSchemaChanges(existingSchema.zodSchema, newSchema);
    const compatibility = this.determineCompatibility(analyzedChanges);
    const newVersion = this.incrementVersion(existingSchema.version, compatibility);
    
    const definition: SchemaDefinition = {
      id: schemaId,
      version: newVersion,
      title: schemaId,
      zodSchema: newSchema,
      jsonSchema: this.generateJsonSchema(newSchema),
      typeDefinition: this.typeGenerator.generateTypeAlias(newSchema, schemaId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.register(definition);
    
    return {
      version: newVersion,
      previousVersion: existingSchema.version,
      changes: analyzedChanges,
      compatibility,
      migrationRequired: compatibility === 'breaking'
    };
  }

  /**
   * Get schema version history
   */
  async getVersionHistory(schemaId: string): Promise<SchemaVersionInfo[]> {
    const versionMap = this.schemas.get(schemaId);
    if (!versionMap) {
      return [];
    }
    
    const versions = Array.from(versionMap.keys()).sort(this.compareVersions);
    const history: SchemaVersionInfo[] = [];
    
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      const previousVersion = i > 0 ? versions[i - 1] : undefined;
      
      // This would normally be stored with the schema
      // For now, return basic version info
      history.push({
        version,
        previousVersion,
        changes: [],
        compatibility: 'unknown',
        migrationRequired: false
      });
    }
    
    return history;
  }

  /**
   * Migrate data between schema versions
   */
  async migrateData(
    schemaId: string, 
    data: unknown, 
    fromVersion: string, 
    toVersion: string
  ): Promise<unknown> {
    const fromSchema = await this.get(schemaId, fromVersion);
    const toSchema = await this.get(schemaId, toVersion);
    
    if (!fromSchema || !toSchema) {
      throw new Error(`Schema versions not found: ${schemaId}@${fromVersion} or ${schemaId}@${toVersion}`);
    }
    
    // Validate data against source schema
    const sourceValidation = this.validator.validate(fromSchema.zodSchema, data);
    if (!sourceValidation.valid) {
      throw new Error(`Data is not valid for source schema: ${sourceValidation.errors[0]?.message}`);
    }
    
    // Apply migration transformations
    let migratedData = data;
    
    // Get version path
    const versionPath = this.getVersionPath(fromVersion, toVersion);
    
    for (let i = 0; i < versionPath.length - 1; i++) {
      const currentVersion = versionPath[i];
      const nextVersion = versionPath[i + 1];
      
      migratedData = await this.applyVersionMigration(
        schemaId,
        migratedData,
        currentVersion,
        nextVersion
      );
    }
    
    // Validate migrated data against target schema
    const targetValidation = this.validator.validate(toSchema.zodSchema, migratedData);
    if (!targetValidation.valid) {
      throw new Error(`Migrated data is not valid for target schema: ${targetValidation.errors[0]?.message}`);
    }
    
    return migratedData;
  }

  /**
   * Analyze changes between two schemas
   */
  private async analyzeSchemaChanges(oldSchema: z.ZodSchema, newSchema: z.ZodSchema): Promise<SchemaChange[]> {
    const changes: SchemaChange[] = [];
    
    // This is a simplified implementation
    // In a real implementation, you'd need deep schema comparison
    
    // For now, just detect if schemas are different
    const oldJson = JSON.stringify(this.generateJsonSchema(oldSchema));
    const newJson = JSON.stringify(this.generateJsonSchema(newSchema));
    
    if (oldJson !== newJson) {
      changes.push({
        type: 'modified',
        path: 'root',
        description: 'Schema structure changed',
        impact: 'breaking' // Conservative assumption
      });
    }
    
    return changes;
  }

  /**
   * Determine compatibility from changes
   */
  private determineCompatibility(changes: SchemaChange[]): 'breaking' | 'compatible' | 'unknown' {
    if (changes.length === 0) {
      return 'compatible';
    }
    
    const hasBreakingChanges = changes.some(change => change.impact === 'breaking');
    return hasBreakingChanges ? 'breaking' : 'compatible';
  }

  /**
   * Increment version based on compatibility
   */
  private incrementVersion(currentVersion: string, compatibility: 'breaking' | 'compatible' | 'unknown'): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch (compatibility) {
      case 'breaking':
        return `${major + 1}.0.0`;
      case 'compatible':
        return `${major}.${minor + 1}.0`;
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  /**
   * Get version path between two versions
   */
  private getVersionPath(fromVersion: string, toVersion: string): string[] {
    // Simplified implementation - just return direct path
    return [fromVersion, toVersion];
  }

  /**
   * Apply migration between two adjacent versions
   */
  private async applyVersionMigration(
    schemaId: string,
    data: unknown,
    fromVersion: string,
    toVersion: string
  ): Promise<unknown> {
    // This would normally look up stored migration functions
    // For now, just return the data unchanged
    return data;
  }
}