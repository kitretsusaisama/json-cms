/**
 * Schema Analyzer Implementation
 * 
 * Analyzes JSON file structures and generates database schemas
 * with compatibility checking and optimization recommendations.
 */

import { 
  SchemaAnalyzer as ISchemaAnalyzer,
  SchemaDefinition,
  TableDefinition,
  ColumnDefinition,
  RelationshipDefinition,
  IndexDefinition,
  ConstraintDefinition,
  ForeignKeyDefinition,
  CompatibilityReport,
  CompatibilityIssue
} from './interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export class SchemaAnalyzer implements ISchemaAnalyzer {
  
  async analyzeJsonStructure(sourcePath: string): Promise<SchemaDefinition> {
    try {
      const jsonFiles = await this.findJsonFiles(sourcePath);
      const structures = await this.analyzeFiles(jsonFiles);
      
      return this.generateSchemaDefinition(structures);
    } catch (error) {
      throw new Error(`Failed to analyze JSON structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateDatabaseSchema(schema: SchemaDefinition, provider: string): Promise<string> {
    switch (provider.toLowerCase()) {
      case 'postgresql':
        return this.generatePostgreSQLSchema(schema);
      case 'mongodb':
        return this.generateMongoDBSchema(schema);
      case 'sqlite':
        return this.generateSQLiteSchema(schema);
      default:
        throw new Error(`Unsupported database provider: ${provider}`);
    }
  }

  async validateSchemaCompatibility(
    source: SchemaDefinition, 
    target: SchemaDefinition
  ): Promise<CompatibilityReport> {
    const issues: CompatibilityIssue[] = [];
    const recommendations: string[] = [];

    // Check table compatibility
    for (const sourceTable of source.tables) {
      const targetTable = target.tables.find(t => t.name === sourceTable.name);
      
      if (!targetTable) {
        issues.push({
          type: 'breaking',
          category: 'schema',
          description: `Table '${sourceTable.name}' missing in target schema`,
          impact: 'Data loss - table will not be migrated',
          solution: 'Add missing table to target schema'
        });
        continue;
      }

      // Check column compatibility
      for (const sourceColumn of sourceTable.columns) {
        const targetColumn = targetTable.columns.find(c => c.name === sourceColumn.name);
        
        if (!targetColumn) {
          issues.push({
            type: 'breaking',
            category: 'schema',
            description: `Column '${sourceColumn.name}' missing in table '${sourceTable.name}'`,
            impact: 'Data loss - column data will not be migrated',
            solution: 'Add missing column to target table'
          });
        } else if (sourceColumn.type !== targetColumn.type) {
          issues.push({
            type: 'warning',
            category: 'data',
            description: `Type mismatch for column '${sourceColumn.name}': ${sourceColumn.type} -> ${targetColumn.type}`,
            impact: 'Potential data conversion issues',
            solution: 'Verify data compatibility and add conversion logic if needed'
          });
        }
      }
    }

    // Check index compatibility
    for (const sourceIndex of source.indexes) {
      const targetIndex = target.indexes.find(i => i.name === sourceIndex.name);
      
      if (!targetIndex) {
        issues.push({
          type: 'warning',
          category: 'performance',
          description: `Index '${sourceIndex.name}' missing in target schema`,
          impact: 'Performance degradation for queries using this index',
          solution: 'Add missing index to target schema'
        });
      }
    }

    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('Schema is fully compatible');
    } else {
      recommendations.push('Review and resolve compatibility issues before migration');
      recommendations.push('Consider creating a backup before proceeding');
      
      if (issues.some(i => i.type === 'breaking')) {
        recommendations.push('Breaking changes detected - manual intervention required');
      }
    }

    return {
      compatible: issues.filter(i => i.type === 'breaking').length === 0,
      issues,
      recommendations
    };
  }

  private async findJsonFiles(basePath: string): Promise<string[]> {
    const patterns = [
      path.join(basePath, '**/*.json'),
      path.join(basePath, 'data/**/*.json'),
      path.join(basePath, 'content/**/*.json')
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern);
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async analyzeFiles(files: string[]): Promise<Map<string, any[]>> {
    const structures = new Map<string, any[]>();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const data = JSON.parse(content);
        
        const category = this.categorizeFile(file, data);
        
        if (!structures.has(category)) {
          structures.set(category, []);
        }
        
        structures.get(category)!.push(data);
      } catch (error) {
        console.warn(`Failed to analyze file ${file}:`, error);
      }
    }

    return structures;
  }

  private categorizeFile(filePath: string, data: any): string {
    const fileName = path.basename(filePath, '.json').toLowerCase();
    
    // Categorize based on file name patterns
    if (fileName.includes('page') || data.type === 'page' || data.blocks) {
      return 'pages';
    }
    
    if (fileName.includes('block') || data.componentType || data.constraints) {
      return 'blocks';
    }
    
    if (fileName.includes('seo') || data.title || data.description || data.canonical) {
      return 'seo';
    }
    
    if (fileName.includes('setting') || fileName.includes('config')) {
      return 'settings';
    }
    
    return 'misc';
  }

  private generateSchemaDefinition(structures: Map<string, any[]>): SchemaDefinition {
    const tables: TableDefinition[] = [];
    const relationships: RelationshipDefinition[] = [];
    const indexes: IndexDefinition[] = [];
    const constraints: ConstraintDefinition[] = [];

    // Generate tables for each content type
    for (const [category, items] of structures) {
      if (items.length === 0) continue;
      
      const table = this.generateTableDefinition(category, items);
      tables.push(table);
      
      // Generate indexes for common query patterns
      indexes.push(...this.generateIndexes(table));
      
      // Generate constraints
      constraints.push(...this.generateConstraints(table));
    }

    // Analyze relationships between tables
    relationships.push(...this.analyzeRelationships(tables, structures));

    return {
      version: '1.0.0',
      tables,
      relationships,
      indexes,
      constraints
    };
  }

  private generateTableDefinition(category: string, items: any[]): TableDefinition {
    const tableName = `cms_${category}`;
    const columns: ColumnDefinition[] = [];
    const foreignKeys: ForeignKeyDefinition[] = [];

    // Standard columns for all tables
    columns.push(
      { name: 'id', type: 'UUID', nullable: false, defaultValue: 'gen_random_uuid()' },
      { name: 'tenant_id', type: 'UUID', nullable: true },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' }
    );

    // Analyze items to determine additional columns
    const fieldAnalysis = this.analyzeFields(items);
    
    for (const [fieldName, fieldInfo] of fieldAnalysis) {
      if (this.isStandardField(fieldName)) continue;
      
      columns.push({
        name: fieldName,
        type: this.mapJsonTypeToSql(fieldInfo.type),
        nullable: fieldInfo.nullable,
        defaultValue: fieldInfo.defaultValue
      });
    }

    // Add content column for complex data
    columns.push({
      name: 'content',
      type: 'JSONB',
      nullable: false,
      defaultValue: '{}'
    });

    // Add foreign key for tenant relationship
    if (columns.some(c => c.name === 'tenant_id')) {
      foreignKeys.push({
        name: `fk_${tableName}_tenant`,
        column: 'tenant_id',
        referencedTable: 'tenants',
        referencedColumn: 'id',
        onDelete: 'cascade'
      });
    }

    return {
      name: tableName,
      columns,
      primaryKey: ['id'],
      foreignKeys
    };
  }

  private analyzeFields(items: any[]): Map<string, FieldInfo> {
    const fieldAnalysis = new Map<string, FieldInfo>();

    for (const item of items) {
      this.analyzeObject(item, fieldAnalysis, '');
    }

    return fieldAnalysis;
  }

  private analyzeObject(obj: any, analysis: Map<string, FieldInfo>, prefix: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}_${key}` : key;
      
      if (this.isComplexType(value)) {
        // Skip complex objects - they'll go in the content JSONB column
        continue;
      }

      const fieldInfo = analysis.get(fieldName) || {
        type: 'unknown',
        nullable: false,
        defaultValue: undefined,
        occurrences: 0
      };

      fieldInfo.occurrences++;
      
      if (value === null || value === undefined) {
        fieldInfo.nullable = true;
      } else {
        const valueType = this.getJsonType(value);
        if (fieldInfo.type === 'unknown') {
          fieldInfo.type = valueType;
        } else if (fieldInfo.type !== valueType) {
          fieldInfo.type = 'string'; // Default to string for mixed types
        }
      }

      analysis.set(fieldName, fieldInfo);
    }
  }

  private isComplexType(value: any): boolean {
    return Array.isArray(value) || (typeof value === 'object' && value !== null);
  }

  private getJsonType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'timestamp';
    return 'string';
  }

  private mapJsonTypeToSql(jsonType: string): string {
    switch (jsonType) {
      case 'string': return 'VARCHAR(500)';
      case 'integer': return 'INTEGER';
      case 'number': return 'DECIMAL(10,2)';
      case 'boolean': return 'BOOLEAN';
      case 'timestamp': return 'TIMESTAMP';
      default: return 'TEXT';
    }
  }

  private isStandardField(fieldName: string): boolean {
    const standardFields = ['id', 'tenant_id', 'created_at', 'updated_at', 'content'];
    return standardFields.includes(fieldName);
  }

  private generateIndexes(table: TableDefinition): IndexDefinition[] {
    const indexes: IndexDefinition[] = [];

    // Primary key index (automatically created)
    
    // Tenant index for multi-tenant queries
    if (table.columns.some(c => c.name === 'tenant_id')) {
      indexes.push({
        name: `idx_${table.name}_tenant`,
        table: table.name,
        columns: ['tenant_id'],
        unique: false
      });
    }

    // Timestamp indexes for sorting
    indexes.push({
      name: `idx_${table.name}_created`,
      table: table.name,
      columns: ['created_at'],
      unique: false
    });

    // Slug index for pages
    if (table.name === 'cms_pages') {
      indexes.push({
        name: `idx_${table.name}_slug`,
        table: table.name,
        columns: ['tenant_id', 'slug'],
        unique: true
      });
    }

    return indexes;
  }

  private generateConstraints(table: TableDefinition): ConstraintDefinition[] {
    const constraints: ConstraintDefinition[] = [];

    // Status constraints for pages
    if (table.name === 'cms_pages') {
      constraints.push({
        name: `chk_${table.name}_status`,
        table: table.name,
        type: 'check',
        definition: "status IN ('draft', 'published', 'archived')"
      });
    }

    return constraints;
  }

  private analyzeRelationships(tables: TableDefinition[], structures: Map<string, any[]>): RelationshipDefinition[] {
    const relationships: RelationshipDefinition[] = [];

    // Analyze content for references between entities
    for (const [category, items] of structures) {
      for (const item of items) {
        const refs = this.findReferences(item);
        
        for (const ref of refs) {
          const sourceTable = `cms_${category}`;
          const targetTable = `cms_${ref.type}`;
          
          if (tables.some(t => t.name === targetTable)) {
            relationships.push({
              type: 'one-to-many',
              source: sourceTable,
              target: targetTable,
              sourceKey: 'id',
              targetKey: ref.field
            });
          }
        }
      }
    }

    return relationships;
  }

  private findReferences(obj: any, refs: Reference[] = []): Reference[] {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.findReferences(item, refs);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.endsWith('Id') || key.endsWith('_id')) {
          const type = key.replace(/Id$|_id$/, '');
          refs.push({ type, field: key });
        }
        
        this.findReferences(value, refs);
      }
    }
    
    return refs;
  }

  private generatePostgreSQLSchema(schema: SchemaDefinition): string {
    let sql = '-- PostgreSQL Schema Generated from JSON Analysis\n\n';

    // Create tables
    for (const table of schema.tables) {
      sql += this.generatePostgreSQLTable(table);
      sql += '\n\n';
    }

    // Create indexes
    for (const index of schema.indexes) {
      sql += this.generatePostgreSQLIndex(index);
      sql += '\n';
    }

    // Create constraints
    for (const constraint of schema.constraints) {
      sql += this.generatePostgreSQLConstraint(constraint);
      sql += '\n';
    }

    return sql;
  }

  private generatePostgreSQLTable(table: TableDefinition): string {
    let sql = `CREATE TABLE ${table.name} (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      return def;
    });

    sql += columnDefs.join(',\n');
    
    if (table.primaryKey.length > 0) {
      sql += `,\n  PRIMARY KEY (${table.primaryKey.join(', ')})`;
    }

    for (const fk of table.foreignKeys) {
      sql += `,\n  CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${fk.referencedTable}(${fk.referencedColumn})`;
      if (fk.onDelete) sql += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
      if (fk.onUpdate) sql += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
    }

    sql += '\n);';
    return sql;
  }

  private generatePostgreSQLIndex(index: IndexDefinition): string {
    const unique = index.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX ${index.name} ON ${index.table} (${index.columns.join(', ')});`;
  }

  private generatePostgreSQLConstraint(constraint: ConstraintDefinition): string {
    return `ALTER TABLE ${constraint.table} ADD CONSTRAINT ${constraint.name} ${constraint.type.toUpperCase()} (${constraint.definition});`;
  }

  private generateMongoDBSchema(schema: SchemaDefinition): string {
    // MongoDB schema would be JSON-based collection definitions
    const collections = schema.tables.map(table => ({
      name: table.name,
      validator: this.generateMongoValidator(table),
      indexes: schema.indexes.filter(idx => idx.table === table.name)
    }));

    return JSON.stringify({ collections }, null, 2);
  }

  private generateMongoValidator(table: TableDefinition): any {
    const properties: any = {};
    
    for (const column of table.columns) {
      properties[column.name] = {
        bsonType: this.mapSqlTypeToMongo(column.type),
        description: `${column.name} field`
      };
      
      if (!column.nullable) {
        // Add to required fields
      }
    }

    return {
      $jsonSchema: {
        bsonType: 'object',
        required: table.columns.filter(c => !c.nullable).map(c => c.name),
        properties
      }
    };
  }

  private mapSqlTypeToMongo(sqlType: string): string {
    if (sqlType.includes('VARCHAR') || sqlType.includes('TEXT')) return 'string';
    if (sqlType.includes('INTEGER')) return 'int';
    if (sqlType.includes('DECIMAL')) return 'double';
    if (sqlType.includes('BOOLEAN')) return 'bool';
    if (sqlType.includes('TIMESTAMP')) return 'date';
    if (sqlType.includes('UUID')) return 'string';
    if (sqlType.includes('JSONB')) return 'object';
    return 'string';
  }

  private generateSQLiteSchema(schema: SchemaDefinition): string {
    let sql = '-- SQLite Schema Generated from JSON Analysis\n\n';

    // SQLite has simpler syntax
    for (const table of schema.tables) {
      sql += this.generateSQLiteTable(table);
      sql += '\n\n';
    }

    for (const index of schema.indexes) {
      sql += this.generateSQLiteIndex(index);
      sql += '\n';
    }

    return sql;
  }

  private generateSQLiteTable(table: TableDefinition): string {
    let sql = `CREATE TABLE ${table.name} (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${this.mapPostgresToSQLite(col.type)}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue && col.defaultValue !== 'gen_random_uuid()' && col.defaultValue !== 'NOW()') {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      return def;
    });

    sql += columnDefs.join(',\n');
    
    if (table.primaryKey.length > 0) {
      sql += `,\n  PRIMARY KEY (${table.primaryKey.join(', ')})`;
    }

    sql += '\n);';
    return sql;
  }

  private generateSQLiteIndex(index: IndexDefinition): string {
    const unique = index.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX ${index.name} ON ${index.table} (${index.columns.join(', ')});`;
  }

  private mapPostgresToSQLite(pgType: string): string {
    if (pgType.includes('UUID')) return 'TEXT';
    if (pgType.includes('TIMESTAMP')) return 'DATETIME';
    if (pgType.includes('JSONB')) return 'TEXT';
    if (pgType.includes('BOOLEAN')) return 'INTEGER';
    return pgType;
  }
}

interface FieldInfo {
  type: string;
  nullable: boolean;
  defaultValue?: any;
  occurrences: number;
}

interface Reference {
  type: string;
  field: string;
}