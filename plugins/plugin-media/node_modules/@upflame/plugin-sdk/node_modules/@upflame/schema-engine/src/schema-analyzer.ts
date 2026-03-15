/**
 * Schema Analyzer
 * 
 * Analyzes schemas for complexity, compatibility, and optimization opportunities
 */

import { z } from 'zod';
import { 
  SchemaAnalyzer as ISchemaAnalyzer,
  SchemaComplexityReport,
  SchemaCompatibilityReport,
  SchemaOptimization,
  SchemaDependencyGraph,
  SchemaDependencyNode,
  SchemaDependencyEdge,
  SchemaChange
} from './interfaces';

export class SchemaAnalyzer implements ISchemaAnalyzer {
  /**
   * Analyze schema complexity
   */
  analyzeComplexity(schema: z.ZodSchema): SchemaComplexityReport {
    const analysis = this.walkSchema(schema);
    
    const score = this.calculateComplexityScore(analysis);
    const recommendations = this.generateComplexityRecommendations(analysis);
    
    return {
      score,
      depth: analysis.maxDepth,
      fieldCount: analysis.totalFields,
      optionalFields: analysis.optionalFields,
      requiredFields: analysis.requiredFields,
      nestedObjects: analysis.nestedObjects,
      arrays: analysis.arrays,
      unions: analysis.unions,
      recommendations
    };
  }

  /**
   * Compare two schemas for compatibility
   */
  compareSchemas(oldSchema: z.ZodSchema, newSchema: z.ZodSchema): SchemaCompatibilityReport {
    const oldAnalysis = this.walkSchema(oldSchema);
    const newAnalysis = this.walkSchema(newSchema);
    
    const changes = this.detectChanges(oldAnalysis, newAnalysis);
    const breakingChanges = changes.filter(change => change.impact === 'breaking');
    const compatibleChanges = changes.filter(change => change.impact === 'compatible');
    
    const compatible = breakingChanges.length === 0;
    const migrationRequired = breakingChanges.length > 0;
    const migrationComplexity = this.assessMigrationComplexity(breakingChanges);
    
    return {
      compatible,
      breakingChanges,
      compatibleChanges,
      migrationRequired,
      migrationComplexity
    };
  }

  /**
   * Suggest optimizations for schema
   */
  suggestOptimizations(schema: z.ZodSchema): SchemaOptimization[] {
    const analysis = this.walkSchema(schema);
    const optimizations: SchemaOptimization[] = [];
    
    // Performance optimizations
    if (analysis.maxDepth > 8) {
      optimizations.push({
        type: 'performance',
        description: 'Deep nesting detected - consider flattening object structure',
        impact: 'medium',
        implementation: 'Break down nested objects into separate schemas with references'
      });
    }
    
    if (analysis.totalFields > 50) {
      optimizations.push({
        type: 'performance',
        description: 'Large number of fields - consider splitting into multiple schemas',
        impact: 'medium',
        implementation: 'Group related fields into separate schemas and compose them'
      });
    }
    
    if (analysis.unions > 10) {
      optimizations.push({
        type: 'performance',
        description: 'Many union types - consider using discriminated unions',
        impact: 'high',
        implementation: 'Add discriminator fields to improve type checking performance'
      });
    }
    
    // Maintainability optimizations
    if (analysis.optionalFields / analysis.totalFields > 0.7) {
      optimizations.push({
        type: 'maintainability',
        description: 'High ratio of optional fields - consider required field validation',
        impact: 'low',
        implementation: 'Review which fields should actually be required'
      });
    }
    
    // Validation optimizations
    if (analysis.stringValidations === 0 && analysis.strings > 0) {
      optimizations.push({
        type: 'validation',
        description: 'String fields without validation - consider adding constraints',
        impact: 'medium',
        implementation: 'Add min/max length, format, or pattern validations to string fields'
      });
    }
    
    return optimizations;
  }

  /**
   * Extract dependencies between schemas
   */
  extractDependencies(schemas: Record<string, z.ZodSchema>): SchemaDependencyGraph {
    const nodes: SchemaDependencyNode[] = [];
    const edges: SchemaDependencyEdge[] = [];
    const cycles: string[][] = [];
    
    // Create nodes for each schema
    for (const [id, schema] of Object.entries(schemas)) {
      nodes.push({
        id,
        type: 'schema',
        metadata: {
          complexity: this.analyzeComplexity(schema).score
        }
      });
    }
    
    // Analyze dependencies (simplified implementation)
    for (const [fromId, schema] of Object.entries(schemas)) {
      const references = this.extractSchemaReferences(schema, schemas);
      
      for (const toId of references) {
        edges.push({
          from: fromId,
          to: toId,
          type: 'references',
          metadata: {}
        });
      }
    }
    
    // Detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const cycle = this.detectCycle(node.id, edges, visited, recursionStack, []);
        if (cycle.length > 0) {
          cycles.push(cycle);
        }
      }
    }
    
    return { nodes, edges, cycles };
  }

  /**
   * Walk schema and collect analysis data
   */
  private walkSchema(schema: z.ZodSchema, depth = 0): SchemaAnalysis {
    const analysis: SchemaAnalysis = {
      maxDepth: depth,
      totalFields: 0,
      optionalFields: 0,
      requiredFields: 0,
      nestedObjects: 0,
      arrays: 0,
      unions: 0,
      strings: 0,
      stringValidations: 0,
      numbers: 0,
      booleans: 0
    };
    
    if (schema instanceof z.ZodObject) {
      analysis.nestedObjects++;
      const shape = schema.shape;
      
      for (const [, fieldSchema] of Object.entries(shape)) {
        analysis.totalFields++;
        
        if (fieldSchema instanceof z.ZodOptional || fieldSchema instanceof z.ZodDefault) {
          analysis.optionalFields++;
        } else {
          analysis.requiredFields++;
        }
        
        const fieldAnalysis = this.walkSchema(fieldSchema, depth + 1);
        this.mergeAnalysis(analysis, fieldAnalysis);
      }
    } else if (schema instanceof z.ZodArray) {
      analysis.arrays++;
      const elementAnalysis = this.walkSchema(schema.element, depth + 1);
      this.mergeAnalysis(analysis, elementAnalysis);
    } else if (schema instanceof z.ZodUnion) {
      analysis.unions++;
      for (const option of schema.options) {
        const optionAnalysis = this.walkSchema(option, depth);
        this.mergeAnalysis(analysis, optionAnalysis);
      }
    } else if (schema instanceof z.ZodString) {
      analysis.strings++;
      const checks = (schema._def as any).checks || [];
      if (checks.length > 0) {
        analysis.stringValidations++;
      }
    } else if (schema instanceof z.ZodNumber) {
      analysis.numbers++;
    } else if (schema instanceof z.ZodBoolean) {
      analysis.booleans++;
    } else if (schema instanceof z.ZodOptional) {
      const innerAnalysis = this.walkSchema(schema.unwrap(), depth);
      this.mergeAnalysis(analysis, innerAnalysis);
    } else if (schema instanceof z.ZodNullable) {
      const innerAnalysis = this.walkSchema(schema.unwrap(), depth);
      this.mergeAnalysis(analysis, innerAnalysis);
    } else if (schema instanceof z.ZodDefault) {
      const innerAnalysis = this.walkSchema(schema.removeDefault(), depth);
      this.mergeAnalysis(analysis, innerAnalysis);
    }
    
    return analysis;
  }

  /**
   * Merge two analysis results
   */
  private mergeAnalysis(target: SchemaAnalysis, source: SchemaAnalysis): void {
    target.maxDepth = Math.max(target.maxDepth, source.maxDepth);
    target.totalFields += source.totalFields;
    target.optionalFields += source.optionalFields;
    target.requiredFields += source.requiredFields;
    target.nestedObjects += source.nestedObjects;
    target.arrays += source.arrays;
    target.unions += source.unions;
    target.strings += source.strings;
    target.stringValidations += source.stringValidations;
    target.numbers += source.numbers;
    target.booleans += source.booleans;
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexityScore(analysis: SchemaAnalysis): number {
    let score = 0;
    
    // Base score from field count
    score += analysis.totalFields * 1;
    
    // Depth penalty
    score += Math.max(0, analysis.maxDepth - 3) * 5;
    
    // Nested objects penalty
    score += analysis.nestedObjects * 2;
    
    // Arrays penalty
    score += analysis.arrays * 1;
    
    // Unions penalty (higher complexity)
    score += analysis.unions * 3;
    
    // Optional fields slight penalty (validation complexity)
    score += analysis.optionalFields * 0.5;
    
    return Math.round(score);
  }

  /**
   * Generate complexity recommendations
   */
  private generateComplexityRecommendations(analysis: SchemaAnalysis): string[] {
    const recommendations: string[] = [];
    
    if (analysis.maxDepth > 6) {
      recommendations.push('Consider flattening deeply nested structures');
    }
    
    if (analysis.totalFields > 30) {
      recommendations.push('Consider breaking large schemas into smaller, composable schemas');
    }
    
    if (analysis.unions > 5) {
      recommendations.push('Consider using discriminated unions for better type safety');
    }
    
    if (analysis.optionalFields / analysis.totalFields > 0.8) {
      recommendations.push('Review optional field usage - consider required fields for better validation');
    }
    
    if (analysis.stringValidations / analysis.strings < 0.3) {
      recommendations.push('Add validation constraints to string fields for better data quality');
    }
    
    return recommendations;
  }

  /**
   * Detect changes between schema analyses
   */
  private detectChanges(oldAnalysis: SchemaAnalysis, newAnalysis: SchemaAnalysis): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    // Field count changes
    if (newAnalysis.totalFields < oldAnalysis.totalFields) {
      changes.push({
        type: 'removed',
        path: 'fields',
        description: `${oldAnalysis.totalFields - newAnalysis.totalFields} fields removed`,
        impact: 'breaking'
      });
    } else if (newAnalysis.totalFields > oldAnalysis.totalFields) {
      changes.push({
        type: 'added',
        path: 'fields',
        description: `${newAnalysis.totalFields - oldAnalysis.totalFields} fields added`,
        impact: 'compatible'
      });
    }
    
    // Required field changes
    if (newAnalysis.requiredFields > oldAnalysis.requiredFields) {
      changes.push({
        type: 'modified',
        path: 'required',
        description: 'New required fields added',
        impact: 'breaking'
      });
    }
    
    // Structure changes
    if (newAnalysis.maxDepth !== oldAnalysis.maxDepth) {
      changes.push({
        type: 'modified',
        path: 'structure',
        description: 'Schema depth changed',
        impact: 'compatible'
      });
    }
    
    return changes;
  }

  /**
   * Assess migration complexity
   */
  private assessMigrationComplexity(breakingChanges: SchemaChange[]): 'simple' | 'moderate' | 'complex' {
    if (breakingChanges.length === 0) {
      return 'simple';
    }
    
    const hasStructuralChanges = breakingChanges.some(change => 
      change.type === 'removed' || change.path === 'structure'
    );
    
    if (hasStructuralChanges || breakingChanges.length > 5) {
      return 'complex';
    }
    
    return 'moderate';
  }

  /**
   * Extract schema references (simplified)
   */
  private extractSchemaReferences(schema: z.ZodSchema, allSchemas: Record<string, z.ZodSchema>): string[] {
    // This is a simplified implementation
    // In a real implementation, you'd need to track schema references
    return [];
  }

  /**
   * Detect cycles in dependency graph
   */
  private detectCycle(
    nodeId: string,
    edges: SchemaDependencyEdge[],
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[] {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const outgoingEdges = edges.filter(edge => edge.from === nodeId);
    
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.to)) {
        const cycle = this.detectCycle(edge.to, edges, visited, recursionStack, [...path]);
        if (cycle.length > 0) {
          return cycle;
        }
      } else if (recursionStack.has(edge.to)) {
        // Cycle detected
        const cycleStart = path.indexOf(edge.to);
        return path.slice(cycleStart).concat([edge.to]);
      }
    }
    
    recursionStack.delete(nodeId);
    return [];
  }
}

interface SchemaAnalysis {
  maxDepth: number;
  totalFields: number;
  optionalFields: number;
  requiredFields: number;
  nestedObjects: number;
  arrays: number;
  unions: number;
  strings: number;
  stringValidations: number;
  numbers: number;
  booleans: number;
}