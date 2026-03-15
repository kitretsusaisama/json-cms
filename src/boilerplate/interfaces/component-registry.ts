/**
 * Enhanced Component Registry Interface
 */

import { z } from 'zod';
import React from 'react';

export interface ComponentMetadata {
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

export interface SlotDefinition {
  name: string;
  description: string;
  required: boolean;
  allowedComponents?: string[];
  maxItems?: number;
}

export interface VariantDefinition {
  name: string;
  description: string;
  props: Record<string, unknown>;
  conditions?: VariantCondition[];
}

export interface VariantCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: unknown;
}

export interface ComponentExample {
  name: string;
  description: string;
  props: Record<string, unknown>;
  slots?: Record<string, unknown[]>;
}

export interface ComponentDefinition {
  component: React.ComponentType<any>;
  schema?: z.ZodSchema;
  metadata: ComponentMetadata;
  lazy?: boolean;
  loader?: () => Promise<React.ComponentType<any>>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  details?: unknown;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * Enhanced Component Registry Interface
 */
export interface ComponentRegistry {
  /**
   * Register a component with metadata and validation
   */
  register(key: string, definition: ComponentDefinition): void;

  /**
   * Unregister a component
   */
  unregister(key: string): void;

  /**
   * Get a component definition
   */
  get(key: string): ComponentDefinition | null;

  /**
   * Check if a component is registered
   */
  has(key: string): boolean;

  /**
   * List all registered components
   */
  list(): Record<string, ComponentDefinition>;

  /**
   * List components by category
   */
  listByCategory(category: string): Record<string, ComponentDefinition>;

  /**
   * Validate component props against schema
   */
  validate(key: string, props: unknown): ValidationResult;

  /**
   * Load a component dynamically
   */
  loadDynamic(key: string): Promise<ComponentDefinition | null>;

  /**
   * Get component metadata
   */
  getMetadata(key: string): ComponentMetadata | null;

  /**
   * Search components by name, description, or tags
   */
  search(query: string): ComponentDefinition[];

  /**
   * Get component variants
   */
  getVariants(key: string): VariantDefinition[];

  /**
   * Validate component slots
   */
  validateSlots(key: string, slots: Record<string, unknown[]>): ValidationResult;

  /**
   * Get component examples
   */
  getExamples(key: string): ComponentExample[];

  /**
   * Register multiple components from a plugin
   */
  registerPlugin(pluginId: string, components: Record<string, ComponentDefinition>): void;

  /**
   * Unregister all components from a plugin
   */
  unregisterPlugin(pluginId: string): void;

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats;
}

export interface RegistryStats {
  totalComponents: number;
  categoryCounts: Record<string, number>;
  lazyComponents: number;
  deprecatedComponents: number;
  pluginComponents: Record<string, number>;
}

/**
 * Component Loader Interface
 */
export interface ComponentLoader {
  /**
   * Load component from file path
   */
  loadFromPath(path: string): Promise<ComponentDefinition>;

  /**
   * Load component from module
   */
  loadFromModule(moduleName: string): Promise<ComponentDefinition>;

  /**
   * Load components from directory
   */
  loadFromDirectory(directory: string): Promise<Record<string, ComponentDefinition>>;

  /**
   * Validate component before loading
   */
  validateComponent(component: React.ComponentType<any>): ValidationResult;
}