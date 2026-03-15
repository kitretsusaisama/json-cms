/**
 * Schema Analyzer
 *
 * Analyzes schemas for complexity, compatibility, and optimization opportunities
 */
import { z } from 'zod';
import { SchemaAnalyzer as ISchemaAnalyzer, SchemaComplexityReport, SchemaCompatibilityReport, SchemaOptimization, SchemaDependencyGraph } from './interfaces';
export declare class SchemaAnalyzer implements ISchemaAnalyzer {
    /**
     * Analyze schema complexity
     */
    analyzeComplexity(schema: z.ZodSchema): SchemaComplexityReport;
    /**
     * Compare two schemas for compatibility
     */
    compareSchemas(oldSchema: z.ZodSchema, newSchema: z.ZodSchema): SchemaCompatibilityReport;
    /**
     * Suggest optimizations for schema
     */
    suggestOptimizations(schema: z.ZodSchema): SchemaOptimization[];
    /**
     * Extract dependencies between schemas
     */
    extractDependencies(schemas: Record<string, z.ZodSchema>): SchemaDependencyGraph;
    /**
     * Walk schema and collect analysis data
     */
    private walkSchema;
    /**
     * Merge two analysis results
     */
    private mergeAnalysis;
    /**
     * Calculate complexity score
     */
    private calculateComplexityScore;
    /**
     * Generate complexity recommendations
     */
    private generateComplexityRecommendations;
    /**
     * Detect changes between schema analyses
     */
    private detectChanges;
    /**
     * Assess migration complexity
     */
    private assessMigrationComplexity;
    /**
     * Extract schema references (simplified)
     */
    private extractSchemaReferences;
    /**
     * Detect cycles in dependency graph
     */
    private detectCycle;
}
//# sourceMappingURL=schema-analyzer.d.ts.map