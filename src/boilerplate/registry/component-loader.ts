/**
 * Component Loader Implementation
 * Handles dynamic loading of components from various sources
 */

import React from 'react';
import { z } from 'zod';
import {
  ComponentLoader,
  ComponentDefinition,
  ValidationResult,
  ComponentMetadata,
} from '../interfaces/component-registry';

export class DefaultComponentLoader implements ComponentLoader {
  /**
   * Load component from file path
   */
  async loadFromPath(path: string): Promise<ComponentDefinition> {
    try {
      const importedModule = await import(path);
      const component = importedModule.default || importedModule;
      
      if (!this.isValidReactComponent(component)) {
        throw new Error(`Invalid React component at path: ${path}`);
      }

      // Try to extract metadata from the module
      const metadata = this.extractMetadata(importedModule, path);
      const schema = importedModule.schema || importedModule.propTypes;

      return {
        component,
        schema: schema instanceof z.ZodSchema ? schema : undefined,
        metadata,
        lazy: true,
        loader: () => import(path).then(m => m.default || m),
      };
    } catch (error) {
      throw new Error(`Failed to load component from path "${path}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load component from module
   */
  async loadFromModule(moduleName: string): Promise<ComponentDefinition> {
    try {
      const importedModule = await import(moduleName);
      const component = importedModule.default || importedModule;
      
      if (!this.isValidReactComponent(component)) {
        throw new Error(`Invalid React component in module: ${moduleName}`);
      }

      const metadata = this.extractMetadata(importedModule, moduleName);
      const schema = importedModule.schema || importedModule.propTypes;

      return {
        component,
        schema: schema instanceof z.ZodSchema ? schema : undefined,
        metadata,
        lazy: true,
        loader: () => import(moduleName).then(m => m.default || m),
      };
    } catch (error) {
      throw new Error(`Failed to load component from module "${moduleName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load components from directory
   */
  async loadFromDirectory(directory: string): Promise<Record<string, ComponentDefinition>> {
    const components: Record<string, ComponentDefinition> = {};
    
    try {
      // In a real implementation, you would use fs to read the directory
      // For now, we'll provide a basic structure that can be extended
      console.warn(`Directory loading not fully implemented for: ${directory}`);
      
      // This would be implemented with actual file system operations
      // const files = await fs.readdir(directory);
      // for (const file of files) {
      //   if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      //     const componentPath = path.join(directory, file);
      //     const componentName = path.basename(file, path.extname(file));
      //     components[componentName] = await this.loadFromPath(componentPath);
      //   }
      // }
      
      return components;
    } catch (error) {
      throw new Error(`Failed to load components from directory "${directory}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate component before loading
   */
  validateComponent(component: React.ComponentType<any>): ValidationResult {
    const errors = [];
    const warnings = [];

    if (!this.isValidReactComponent(component)) {
      errors.push({
        path: 'component',
        message: 'Not a valid React component',
        code: 'INVALID_REACT_COMPONENT',
      });
    }

    // Check if component has displayName
    if (!component.displayName && !component.name) {
      warnings.push({
        path: 'component.name',
        message: 'Component should have a displayName or name for better debugging',
        suggestion: 'Add a displayName property to the component',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a value is a valid React component
   */
  private isValidReactComponent(component: any): component is React.ComponentType<any> {
    return (
      typeof component === 'function' ||
      (typeof component === 'object' && component !== null && typeof component.render === 'function')
    );
  }

  /**
   * Extract metadata from a module
   */
  private extractMetadata(module: any, source: string): ComponentMetadata {
    const component = module.default || module;
    
    // Try to get metadata from the module
    const metadata = module.metadata || module.componentMetadata || {};
    
    return {
      name: metadata.name || component.displayName || component.name || this.getNameFromSource(source),
      description: metadata.description || `Component loaded from ${source}`,
      category: metadata.category || 'imported',
      version: metadata.version || '1.0.0',
      author: metadata.author || 'unknown',
      tags: metadata.tags || [],
      deprecated: metadata.deprecated || false,
      slots: metadata.slots || [],
      variants: metadata.variants || [],
      examples: metadata.examples || [],
    };
  }

  /**
   * Extract component name from source path or module name
   */
  private getNameFromSource(source: string): string {
    // Extract name from file path or module name
    const parts = source.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Remove file extension
    const nameWithoutExt = lastPart.replace(/\.(tsx?|jsx?)$/, '');
    
    // Convert kebab-case or snake_case to PascalCase
    return nameWithoutExt
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}

// Create a singleton instance
export const componentLoader = new DefaultComponentLoader();