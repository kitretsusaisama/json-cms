/**
 * Enhanced Component Registry - Main Export
 */

// Core registry functionality
export { EnhancedComponentRegistry, enhancedRegistry } from './enhanced-registry';
export { DefaultComponentLoader, componentLoader } from './component-loader';
export { 
  migrateExistingRegistry, 
  getMigratedComponents, 
  validateMigratedComponents 
} from './registry-migrator';

// Plugin support
export {
  PluginRegistry,
  pluginRegistry,
  createPluginManifest,
  createComponentDefinition,
  type PluginComponentManifest,
  type PluginComponentDefinition,
} from './plugin-registry';

// Re-export interfaces
export type {
  ComponentRegistry,
  ComponentDefinition,
  ComponentMetadata,
  ComponentLoader,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SlotDefinition,
  VariantDefinition,
  ComponentExample,
  RegistryStats,
} from '../interfaces/component-registry';

// Convenience functions for common operations
export const registerComponent = (key: string, definition: ComponentDefinition) => 
  enhancedRegistry.register(key, definition);

export const getComponent = (key: string) => 
  enhancedRegistry.get(key);

export const validateComponentProps = (key: string, props: unknown) => 
  enhancedRegistry.validate(key, props);

export const searchComponents = (query: string) => 
  enhancedRegistry.search(query);

export const getComponentsByCategory = (category: string) => 
  enhancedRegistry.listByCategory(category);

export const loadComponentDynamically = (key: string) => 
  enhancedRegistry.loadDynamic(key);

export const getRegistryStatistics = () => 
  enhancedRegistry.getStats();