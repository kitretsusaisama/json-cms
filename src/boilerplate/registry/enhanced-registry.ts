/**
 * Enhanced Component Registry Implementation
 * Extends the existing registry with metadata, validation, and plugin support
 */

import { z } from 'zod';
import React from 'react';
import {
  ComponentRegistry,
  ComponentDefinition,
  ComponentMetadata,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  VariantDefinition,
  ComponentExample,
  RegistryStats,
} from '../interfaces/component-registry';

export class EnhancedComponentRegistry implements ComponentRegistry {
  private components = new Map<string, ComponentDefinition>();
  private pluginComponents = new Map<string, Set<string>>();
  private lazyLoaders = new Map<string, () => Promise<React.ComponentType<any>>>();

  /**
   * Register a component with metadata and validation
   */
  register(key: string, definition: ComponentDefinition): void {
    if (this.components.has(key)) {
      console.warn(`Component "${key}" is already registered. Overwriting.`);
    }

    // Validate the component definition
    const validation = this.validateComponentDefinition(definition);
    if (!validation.valid) {
      throw new Error(`Invalid component definition for "${key}": ${validation.errors[0]?.message}`);
    }

    this.components.set(key, definition);

    // If it's a lazy component, store the loader
    if (definition.lazy && definition.loader) {
      this.lazyLoaders.set(key, definition.loader);
    }
  }

  /**
   * Unregister a component
   */
  unregister(key: string): void {
    this.components.delete(key);
    this.lazyLoaders.delete(key);
  }

  /**
   * Get a component definition
   */
  get(key: string): ComponentDefinition | null {
    return this.components.get(key) || null;
  }

  /**
   * Check if a component is registered
   */
  has(key: string): boolean {
    return this.components.has(key);
  }

  /**
   * List all registered components
   */
  list(): Record<string, ComponentDefinition> {
    const result: Record<string, ComponentDefinition> = {};
    for (const [key, definition] of this.components.entries()) {
      result[key] = definition;
    }
    return result;
  }

  /**
   * List components by category
   */
  listByCategory(category: string): Record<string, ComponentDefinition> {
    const result: Record<string, ComponentDefinition> = {};
    for (const [key, definition] of this.components.entries()) {
      if (definition.metadata.category === category) {
        result[key] = definition;
      }
    }
    return result;
  }

  /**
   * Validate component props against schema
   */
  validate(key: string, props: unknown): ValidationResult {
    const definition = this.components.get(key);
    if (!definition) {
      return {
        valid: false,
        errors: [{
          path: 'component',
          message: `Component "${key}" is not registered`,
          code: 'COMPONENT_NOT_FOUND',
        }],
        warnings: [],
      };
    }

    if (!definition.schema) {
      return {
        valid: true,
        errors: [],
        warnings: [{
          path: 'schema',
          message: `Component "${key}" has no validation schema`,
          suggestion: 'Consider adding a Zod schema for better type safety',
        }],
      };
    }

    try {
      definition.schema.parse(props);
      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
            details: err,
          })),
          warnings: [],
        };
      }

      return {
        valid: false,
        errors: [{
          path: 'validation',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_ERROR',
        }],
        warnings: [],
      };
    }
  }

  /**
   * Load a component dynamically
   */
  async loadDynamic(key: string): Promise<ComponentDefinition | null> {
    const definition = this.components.get(key);
    
    if (!definition) {
      // Try to load from lazy loader
      const loader = this.lazyLoaders.get(key);
      if (loader) {
        try {
          const component = await loader();
          // Create a basic definition for dynamically loaded components
          const dynamicDefinition: ComponentDefinition = {
            component,
            metadata: {
              name: key,
              description: `Dynamically loaded component: ${key}`,
              category: 'dynamic',
              version: '1.0.0',
              author: 'system',
            },
            lazy: true,
          };
          this.register(key, dynamicDefinition);
          return dynamicDefinition;
        } catch (error) {
          console.error(`Failed to load dynamic component "${key}":`, error);
          return null;
        }
      }
      return null;
    }

    if (definition.lazy && definition.loader && !definition.component) {
      try {
        const component = await definition.loader();
        // Update the definition with the loaded component
        const updatedDefinition = { ...definition, component };
        this.components.set(key, updatedDefinition);
        return updatedDefinition;
      } catch (error) {
        console.error(`Failed to load lazy component "${key}":`, error);
        return null;
      }
    }

    return definition;
  }

  /**
   * Get component metadata
   */
  getMetadata(key: string): ComponentMetadata | null {
    const definition = this.components.get(key);
    return definition?.metadata || null;
  }

  /**
   * Search components by name, description, or tags
   */
  search(query: string): ComponentDefinition[] {
    const results: ComponentDefinition[] = [];
    const lowerQuery = query.toLowerCase();

    for (const definition of this.components.values()) {
      const { metadata } = definition;
      
      // Search in name, description, and tags
      if (
        metadata.name.toLowerCase().includes(lowerQuery) ||
        metadata.description.toLowerCase().includes(lowerQuery) ||
        metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(definition);
      }
    }

    return results;
  }

  /**
   * Get component variants
   */
  getVariants(key: string): VariantDefinition[] {
    const definition = this.components.get(key);
    return definition?.metadata.variants || [];
  }

  /**
   * Validate component slots
   */
  validateSlots(key: string, slots: Record<string, unknown[]>): ValidationResult {
    const definition = this.components.get(key);
    if (!definition) {
      return {
        valid: false,
        errors: [{
          path: 'component',
          message: `Component "${key}" is not registered`,
          code: 'COMPONENT_NOT_FOUND',
        }],
        warnings: [],
      };
    }

    const slotDefinitions = definition.metadata.slots || [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required slots
    for (const slotDef of slotDefinitions) {
      if (slotDef.required && !slots[slotDef.name]) {
        errors.push({
          path: `slots.${slotDef.name}`,
          message: `Required slot "${slotDef.name}" is missing`,
          code: 'REQUIRED_SLOT_MISSING',
        });
      }

      const slotContent = slots[slotDef.name];
      if (slotContent) {
        // Check max items
        if (slotDef.maxItems && slotContent.length > slotDef.maxItems) {
          errors.push({
            path: `slots.${slotDef.name}`,
            message: `Slot "${slotDef.name}" exceeds maximum items (${slotDef.maxItems})`,
            code: 'SLOT_MAX_ITEMS_EXCEEDED',
          });
        }

        // Check allowed components
        if (slotDef.allowedComponents) {
          for (let i = 0; i < slotContent.length; i++) {
            const item = slotContent[i] as any;
            if (item?.componentType && !slotDef.allowedComponents.includes(item.componentType)) {
              errors.push({
                path: `slots.${slotDef.name}[${i}]`,
                message: `Component "${item.componentType}" is not allowed in slot "${slotDef.name}"`,
                code: 'COMPONENT_NOT_ALLOWED_IN_SLOT',
              });
            }
          }
        }
      }
    }

    // Check for undefined slots
    for (const slotName of Object.keys(slots)) {
      if (!slotDefinitions.find(def => def.name === slotName)) {
        warnings.push({
          path: `slots.${slotName}`,
          message: `Slot "${slotName}" is not defined in component metadata`,
          suggestion: 'Remove unused slot or add it to component metadata',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get component examples
   */
  getExamples(key: string): ComponentExample[] {
    const definition = this.components.get(key);
    return definition?.metadata.examples || [];
  }

  /**
   * Register multiple components from a plugin
   */
  registerPlugin(pluginId: string, components: Record<string, ComponentDefinition>): void {
    const componentKeys = new Set<string>();

    for (const [key, definition] of Object.entries(components)) {
      this.register(key, definition);
      componentKeys.add(key);
    }

    this.pluginComponents.set(pluginId, componentKeys);
  }

  /**
   * Unregister all components from a plugin
   */
  unregisterPlugin(pluginId: string): void {
    const componentKeys = this.pluginComponents.get(pluginId);
    if (componentKeys) {
      for (const key of componentKeys) {
        this.unregister(key);
      }
      this.pluginComponents.delete(pluginId);
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const categoryCounts: Record<string, number> = {};
    let lazyComponents = 0;
    let deprecatedComponents = 0;
    const pluginComponents: Record<string, number> = {};

    for (const definition of this.components.values()) {
      // Count by category
      const category = definition.metadata.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      // Count lazy components
      if (definition.lazy) {
        lazyComponents++;
      }

      // Count deprecated components
      if (definition.metadata.deprecated) {
        deprecatedComponents++;
      }
    }

    // Count plugin components
    for (const [pluginId, keys] of this.pluginComponents.entries()) {
      pluginComponents[pluginId] = keys.size;
    }

    return {
      totalComponents: this.components.size,
      categoryCounts,
      lazyComponents,
      deprecatedComponents,
      pluginComponents,
    };
  }

  /**
   * Validate component definition
   */
  private validateComponentDefinition(definition: ComponentDefinition): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if component is a valid React component
    if (!definition.component || typeof definition.component !== 'function') {
      errors.push({
        path: 'component',
        message: 'Component must be a valid React component function',
        code: 'INVALID_COMPONENT',
      });
    }

    // Check metadata
    if (!definition.metadata) {
      errors.push({
        path: 'metadata',
        message: 'Component metadata is required',
        code: 'MISSING_METADATA',
      });
    } else {
      if (!definition.metadata.name) {
        errors.push({
          path: 'metadata.name',
          message: 'Component name is required',
          code: 'MISSING_NAME',
        });
      }

      if (!definition.metadata.category) {
        errors.push({
          path: 'metadata.category',
          message: 'Component category is required',
          code: 'MISSING_CATEGORY',
        });
      }

      if (!definition.metadata.version) {
        errors.push({
          path: 'metadata.version',
          message: 'Component version is required',
          code: 'MISSING_VERSION',
        });
      }
    }

    // Check lazy loading configuration
    if (definition.lazy && !definition.loader) {
      errors.push({
        path: 'loader',
        message: 'Lazy components must have a loader function',
        code: 'MISSING_LOADER',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

// Create a singleton instance
export const enhancedRegistry = new EnhancedComponentRegistry();