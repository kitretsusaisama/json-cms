/**
 * JSON CMS Boilerplate Examples Index
 * 
 * This file provides easy access to all example content, templates, and integrations
 * included in the boilerplate system. Use these examples as starting points for
 * your own implementations.
 */

import manifest from './manifest.json';

// Type definitions for examples
export interface ExampleManifest {
  version: string;
  name: string;
  description: string;
  examples: {
    pages: Record<string, ExampleItem>;
    blocks: Record<string, ExampleItem>;
    plugins: Record<string, PluginExample>;
    integrations: Record<string, IntegrationExample>;
    templates: Record<string, TemplateExample>;
  };
  categories: Record<string, CategoryInfo>;
  complexity: Record<string, ComplexityLevel>;
  tags: Record<string, TagInfo>;
}

export interface ExampleItem {
  path: string;
  description: string;
  features: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface PluginExample extends ExampleItem {
  dependencies: string[];
  apiEndpoints: string[];
  components: string[];
}

export interface IntegrationExample extends ExampleItem {
  providers?: string[];
  dependencies: string[];
}

export interface TemplateExample extends ExampleItem {
  pages: string[];
  integrations: string[];
  estimatedSetupTime: string;
}

export interface CategoryInfo {
  name: string;
  description: string;
  count: number;
}

export interface ComplexityLevel {
  description: string;
  examples: string[];
}

export interface TagInfo {
  description: string;
  count: number;
}

// Export the manifest
export const exampleManifest: ExampleManifest = manifest as ExampleManifest;

/**
 * Get all examples by category
 */
export function getExamplesByCategory(category: keyof ExampleManifest['examples']) {
  return exampleManifest.examples[category];
}

/**
 * Get examples by complexity level
 */
export function getExamplesByComplexity(complexity: 'beginner' | 'intermediate' | 'advanced') {
  const complexityInfo = exampleManifest.complexity[complexity];
  if (!complexityInfo) return [];
  
  return complexityInfo.examples;
}

/**
 * Get examples by tag
 */
export function getExamplesByTag(tag: string) {
  const examples: string[] = [];
  
  Object.entries(exampleManifest.examples).forEach(([category, items]) => {
    Object.entries(items).forEach(([key, item]) => {
      if (item.tags.includes(tag)) {
        examples.push(`${category}/${key}`);
      }
    });
  });
  
  return examples;
}

/**
 * Get example by full path (category/key)
 */
export function getExample(path: string) {
  const [category, key] = path.split('/');
  const categoryExamples = exampleManifest.examples[category as keyof ExampleManifest['examples']];
  
  if (!categoryExamples || !categoryExamples[key]) {
    return null;
  }
  
  return {
    ...categoryExamples[key],
    category,
    key,
    fullPath: path
  };
}

/**
 * Search examples by keyword
 */
export function searchExamples(keyword: string) {
  const results: Array<{ path: string; item: ExampleItem; relevance: number }> = [];
  const searchTerm = keyword.toLowerCase();
  
  Object.entries(exampleManifest.examples).forEach(([category, items]) => {
    Object.entries(items).forEach(([key, item]) => {
      let relevance = 0;
      
      // Check description
      if (item.description.toLowerCase().includes(searchTerm)) {
        relevance += 3;
      }
      
      // Check features
      item.features.forEach(feature => {
        if (feature.toLowerCase().includes(searchTerm)) {
          relevance += 2;
        }
      });
      
      // Check tags
      item.tags.forEach(tag => {
        if (tag.toLowerCase().includes(searchTerm)) {
          relevance += 1;
        }
      });
      
      // Check key/name
      if (key.toLowerCase().includes(searchTerm)) {
        relevance += 2;
      }
      
      if (relevance > 0) {
        results.push({
          path: `${category}/${key}`,
          item,
          relevance
        });
      }
    });
  });
  
  // Sort by relevance (highest first)
  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Get recommended examples for a specific use case
 */
export function getRecommendedExamples(useCase: keyof typeof exampleManifest.usage) {
  const usageInfo = exampleManifest.usage[useCase];
  if (!usageInfo) return [];
  
  return usageInfo.recommended.map(path => getExample(path)).filter(Boolean);
}

/**
 * Get all available tags
 */
export function getAllTags() {
  return Object.keys(exampleManifest.tags);
}

/**
 * Get all available categories
 */
export function getAllCategories() {
  return Object.keys(exampleManifest.categories);
}

/**
 * Get examples that depend on a specific package
 */
export function getExamplesByDependency(dependency: string) {
  const examples: string[] = [];
  
  Object.entries(exampleManifest.examples).forEach(([category, items]) => {
    Object.entries(items).forEach(([key, item]) => {
      if ('dependencies' in item && item.dependencies.includes(dependency)) {
        examples.push(`${category}/${key}`);
      }
    });
  });
  
  return examples;
}

/**
 * Validate example structure
 */
export function validateExample(example: ExampleItem): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!example.path) {
    errors.push('Example must have a path');
  }
  
  if (!example.description) {
    errors.push('Example must have a description');
  }
  
  if (!example.features || example.features.length === 0) {
    errors.push('Example must have at least one feature');
  }
  
  if (!['beginner', 'intermediate', 'advanced'].includes(example.complexity)) {
    errors.push('Example must have a valid complexity level');
  }
  
  if (!example.tags || example.tags.length === 0) {
    errors.push('Example must have at least one tag');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get example statistics
 */
export function getExampleStats() {
  const stats = {
    totalExamples: 0,
    byCategory: {} as Record<string, number>,
    byComplexity: {} as Record<string, number>,
    byTag: {} as Record<string, number>
  };
  
  Object.entries(exampleManifest.examples).forEach(([category, items]) => {
    const count = Object.keys(items).length;
    stats.totalExamples += count;
    stats.byCategory[category] = count;
    
    Object.values(items).forEach(item => {
      // Count by complexity
      stats.byComplexity[item.complexity] = (stats.byComplexity[item.complexity] || 0) + 1;
      
      // Count by tags
      item.tags.forEach(tag => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });
    });
  });
  
  return stats;
}

// Export utility functions
export {
  getExamplesByCategory,
  getExamplesByComplexity,
  getExamplesByTag,
  getExample,
  searchExamples,
  getRecommendedExamples,
  getAllTags,
  getAllCategories,
  getExamplesByDependency,
  validateExample,
  getExampleStats
};

// Export default manifest
export default exampleManifest;