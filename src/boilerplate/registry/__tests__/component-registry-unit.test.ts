/**
 * Comprehensive Unit Tests for Component Registry
 * Tests all core functionality including validation, lazy loading, and plugin support
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React from 'react';
import { z } from 'zod';
import { EnhancedComponentRegistry } from '../enhanced-registry';
import { ComponentDefinition, ComponentMetadata } from '../../interfaces/component-registry';

// Mock components for testing
const TestComponent: React.FC<{ title: string; description?: string }> = ({ title, description }) => {
  return React.createElement('div', { 'data-testid': 'test-component' }, title, description);
};

const LazyComponent: React.FC<{ content: string }> = ({ content }) => {
  return React.createElement('div', { 'data-testid': 'lazy-component' }, content);
};

const PluginComponent: React.FC<{ data: any }> = ({ data }) => {
  return React.createElement('div', { 'data-testid': 'plugin-component' }, JSON.stringify(data));
};

// Test schemas
const testSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

const lazySchema = z.object({
  content: z.string().min(1),
});

// Test metadata
const createTestMetadata = (overrides: Partial<ComponentMetadata> = {}): ComponentMetadata => ({
  name: 'Test Component',
  description: 'A test component',
  category: 'test',
  version: '1.0.0',
  author: 'test-author',
  tags: ['test'],
  slots: [],
  variants: [],
  examples: [],
  ...overrides,
});

describe('Component Registry - Unit Tests', () => {
  let registry: EnhancedComponentRegistry;

  beforeEach(() => {
    registry = new EnhancedComponentRegistry();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Core Registration', () => {
    it('should register component with all properties', () => {
      const metadata = createTestMetadata({
        slots: [
          {
            name: 'content',
            description: 'Content slot',
            required: true,
            type: 'any',
            allowedComponents: ['TextBlock'],
            maxItems: 5,
          },
        ],
        variants: [
          {
            name: 'primary',
            description: 'Primary variant',
            props: { variant: 'primary' },
          },
        ],
        examples: [
          {
            name: 'Basic',
            description: 'Basic example',
            props: { title: 'Example' },
          },
        ],
      });

      const definition: ComponentDefinition = {
        component: TestComponent,
        schema: testSchema,
        metadata,
        lazy: false,
      };

      registry.register('TestComponent', definition);

      expect(registry.has('TestComponent')).toBe(true);
      const retrieved = registry.get('TestComponent');
      expect(retrieved).toEqual(definition);
    });

    it('should handle registration without schema', () => {
      const definition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata(),
      };

      expect(() => registry.register('NoSchema', definition)).not.toThrow();
      expect(registry.has('NoSchema')).toBe(true);
    });

    it('should handle registration with lazy loading', () => {
      const definition: ComponentDefinition = {
        component: LazyComponent,
        schema: lazySchema,
        metadata: createTestMetadata({ name: 'Lazy Component' }),
        lazy: true,
      };

      registry.register('LazyComponent', definition);
      
      const retrieved = registry.get('LazyComponent');
      expect(retrieved?.lazy).toBe(true);
    });

    it('should validate component definition on registration', () => {
      const invalidDefinition = {
        component: null,
        metadata: createTestMetadata(),
      } as any;

      expect(() => registry.register('Invalid', invalidDefinition)).toThrow('Invalid component definition');
    });

    it('should warn on component overwrite', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const definition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata(),
      };

      registry.register('TestComponent', definition);
      registry.register('TestComponent', definition);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Component "TestComponent" is already registered. Overwriting.'
      );
    });
  });

  describe('Component Retrieval', () => {
    beforeEach(() => {
      const definition: ComponentDefinition = {
        component: TestComponent,
        schema: testSchema,
        metadata: createTestMetadata(),
      };
      registry.register('TestComponent', definition);
    });

    it('should retrieve existing component', () => {
      const definition = registry.get('TestComponent');
      expect(definition).toBeTruthy();
      expect(definition?.component).toBe(TestComponent);
    });

    it('should return null for non-existent component', () => {
      const definition = registry.get('NonExistent');
      expect(definition).toBeNull();
    });

    it('should check component existence correctly', () => {
      expect(registry.has('TestComponent')).toBe(true);
      expect(registry.has('NonExistent')).toBe(false);
    });

    it('should unregister component', () => {
      expect(registry.has('TestComponent')).toBe(true);
      registry.unregister('TestComponent');
      expect(registry.has('TestComponent')).toBe(false);
    });
  });

  describe('Validation System', () => {
    beforeEach(() => {
      const definition: ComponentDefinition = {
        component: TestComponent,
        schema: testSchema,
        metadata: createTestMetadata(),
      };
      registry.register('TestComponent', definition);
    });

    it('should validate correct props', () => {
      const result = registry.validate('TestComponent', {
        title: 'Valid Title',
        description: 'Valid Description',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject invalid props', () => {
      const result = registry.validate('TestComponent', {
        description: 'Missing title',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('title');
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });

    it('should handle component without schema', () => {
      const noSchemaDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({ name: 'No Schema Component' }),
      };
      registry.register('NoSchema', noSchemaDefinition);

      const result = registry.validate('NoSchema', { anything: 'goes' });
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('No schema defined');
    });

    it('should handle non-existent component validation', () => {
      const result = registry.validate('NonExistent', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('COMPONENT_NOT_FOUND');
    });

    it('should provide detailed validation errors', () => {
      const complexSchema = z.object({
        title: z.string().min(3).max(50),
        count: z.number().min(1).max(100),
        tags: z.array(z.string()).min(1),
      });

      const complexDefinition: ComponentDefinition = {
        component: TestComponent,
        schema: complexSchema,
        metadata: createTestMetadata({ name: 'Complex Component' }),
      };
      registry.register('Complex', complexDefinition);

      const result = registry.validate('Complex', {
        title: 'AB', // Too short
        count: 150, // Too high
        tags: [], // Empty array
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.some(e => e.path === 'title')).toBe(true);
      expect(result.errors.some(e => e.path === 'count')).toBe(true);
      expect(result.errors.some(e => e.path === 'tags')).toBe(true);
    });
  });

  describe('Component Listing and Search', () => {
    beforeEach(() => {
      const testDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({ category: 'test', tags: ['test', 'ui'] }),
      };
      
      const layoutDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({
          name: 'Layout Component',
          category: 'layout',
          tags: ['layout', 'structure'],
        }),
      };

      const contentDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({
          name: 'Content Block',
          category: 'content',
          tags: ['content', 'text'],
        }),
      };

      registry.register('TestComponent', testDefinition);
      registry.register('LayoutComponent', layoutDefinition);
      registry.register('ContentBlock', contentDefinition);
    });

    it('should list all components', () => {
      const components = registry.list();
      expect(Object.keys(components)).toHaveLength(3);
      expect(components.TestComponent).toBeTruthy();
      expect(components.LayoutComponent).toBeTruthy();
      expect(components.ContentBlock).toBeTruthy();
    });

    it('should list components by category', () => {
      const testComponents = registry.listByCategory('test');
      const layoutComponents = registry.listByCategory('layout');
      const contentComponents = registry.listByCategory('content');

      expect(Object.keys(testComponents)).toHaveLength(1);
      expect(Object.keys(layoutComponents)).toHaveLength(1);
      expect(Object.keys(contentComponents)).toHaveLength(1);
    });

    it('should search components by name', () => {
      const results = registry.search('Layout');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('Layout Component');
    });

    it('should search components by description', () => {
      const results = registry.search('test component');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search components by tags', () => {
      const uiResults = registry.search('ui');
      const structureResults = registry.search('structure');

      expect(uiResults).toHaveLength(1);
      expect(structureResults).toHaveLength(1);
    });

    it('should return empty results for no matches', () => {
      const results = registry.search('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should perform case-insensitive search', () => {
      const results = registry.search('LAYOUT');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('Layout Component');
    });
  });

  describe('Plugin Support', () => {
    it('should register plugin components', () => {
      const pluginComponents = {
        PluginComponent1: {
          component: PluginComponent,
          metadata: createTestMetadata({
            name: 'Plugin Component 1',
            category: 'plugin',
          }),
        },
        PluginComponent2: {
          component: PluginComponent,
          metadata: createTestMetadata({
            name: 'Plugin Component 2',
            category: 'plugin',
          }),
        },
      };

      registry.registerPlugin('test-plugin', pluginComponents);

      expect(registry.has('PluginComponent1')).toBe(true);
      expect(registry.has('PluginComponent2')).toBe(true);
      
      const stats = registry.getStats();
      expect(stats.pluginComponents['test-plugin']).toBe(2);
    });

    it('should unregister plugin components', () => {
      const pluginComponents = {
        PluginComponent1: {
          component: PluginComponent,
          metadata: createTestMetadata({ name: 'Plugin Component 1' }),
        },
        PluginComponent2: {
          component: PluginComponent,
          metadata: createTestMetadata({ name: 'Plugin Component 2' }),
        },
      };

      registry.registerPlugin('test-plugin', pluginComponents);
      expect(registry.has('PluginComponent1')).toBe(true);
      expect(registry.has('PluginComponent2')).toBe(true);

      registry.unregisterPlugin('test-plugin');
      expect(registry.has('PluginComponent1')).toBe(false);
      expect(registry.has('PluginComponent2')).toBe(false);
    });

    it('should handle plugin registration with existing components', () => {
      const existingDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({ name: 'Existing Component' }),
      };
      registry.register('ExistingComponent', existingDefinition);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const pluginComponents = {
        ExistingComponent: {
          component: PluginComponent,
          metadata: createTestMetadata({ name: 'Plugin Override' }),
        },
      };

      registry.registerPlugin('test-plugin', pluginComponents);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Component "ExistingComponent" is already registered. Overwriting.'
      );
    });
  });

  describe('Slot Validation', () => {
    beforeEach(() => {
      const definition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({
          slots: [
            {
              name: 'header',
              description: 'Header slot',
              required: true,
              allowedComponents: ['HeaderComponent'],
              maxItems: 1,
            },
            {
              name: 'content',
              description: 'Content slot',
              required: false,
              maxItems: 3,
            },
            {
              name: 'footer',
              description: 'Footer slot',
              required: false,
              allowedComponents: ['FooterComponent', 'TextBlock'],
            },
          ],
        }),
      };
      registry.register('SlotComponent', definition);
    });

    it('should validate required slots', () => {
      const result = registry.validateSlots('SlotComponent', {
        content: [{ componentType: 'TextBlock' }],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('REQUIRED_SLOT_MISSING');
      expect(result.errors[0].message).toContain('header');
    });

    it('should validate slot max items', () => {
      const result = registry.validateSlots('SlotComponent', {
        header: [
          { componentType: 'HeaderComponent' },
          { componentType: 'HeaderComponent' },
        ],
        content: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('SLOT_MAX_ITEMS_EXCEEDED');
      expect(result.errors[0].message).toContain('header');
    });

    it('should validate allowed components in slots', () => {
      const result = registry.validateSlots('SlotComponent', {
        header: [{ componentType: 'InvalidComponent' }],
        content: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('COMPONENT_NOT_ALLOWED_IN_SLOT');
      expect(result.errors[0].message).toContain('InvalidComponent');
    });

    it('should warn about undefined slots', () => {
      const result = registry.validateSlots('SlotComponent', {
        header: [{ componentType: 'HeaderComponent' }],
        undefinedSlot: [{ componentType: 'SomeComponent' }],
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('undefinedSlot');
    });

    it('should validate successful slot configuration', () => {
      const result = registry.validateSlots('SlotComponent', {
        header: [{ componentType: 'HeaderComponent' }],
        content: [
          { componentType: 'TextBlock' },
          { componentType: 'ImageBlock' },
        ],
        footer: [{ componentType: 'FooterComponent' }],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Registry Statistics', () => {
    beforeEach(() => {
      const testDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({ category: 'test' }),
      };
      
      const layoutDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({
          category: 'layout',
          deprecated: true,
        }),
        lazy: true,
      };

      const contentDefinition: ComponentDefinition = {
        component: TestComponent,
        metadata: createTestMetadata({ category: 'content' }),
      };

      registry.register('TestComponent', testDefinition);
      registry.register('LayoutComponent', layoutDefinition);
      registry.register('ContentComponent', contentDefinition);
      
      registry.registerPlugin('test-plugin', {
        PluginComponent: {
          component: PluginComponent,
          metadata: createTestMetadata({ category: 'plugin' }),
        },
      });
    });

    it('should return correct statistics', () => {
      const stats = registry.getStats();

      expect(stats.totalComponents).toBe(4);
      expect(stats.categoryCounts.test).toBe(1);
      expect(stats.categoryCounts.layout).toBe(1);
      expect(stats.categoryCounts.content).toBe(1);
      expect(stats.categoryCounts.plugin).toBe(1);
      expect(stats.lazyComponents).toBe(1);
      expect(stats.deprecatedComponents).toBe(1);
      expect(stats.pluginComponents['test-plugin']).toBe(1);
    });

    it('should handle empty registry statistics', () => {
      const emptyRegistry = new EnhancedComponentRegistry();
      const stats = emptyRegistry.getStats();

      expect(stats.totalComponents).toBe(0);
      expect(stats.categoryCounts).toEqual({});
      expect(stats.lazyComponents).toBe(0);
      expect(stats.deprecatedComponents).toBe(0);
      expect(stats.pluginComponents).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed component definitions gracefully', () => {
      const malformedDefinition = {
        component: TestComponent,
        metadata: null,
      } as any;

      expect(() => registry.register('Malformed', malformedDefinition)).toThrow();
    });

    it('should handle validation of non-existent component', () => {
      const result = registry.validate('NonExistent', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('COMPONENT_NOT_FOUND');
    });

    it('should handle slot validation for non-existent component', () => {
      const result = registry.validateSlots('NonExistent', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('COMPONENT_NOT_FOUND');
    });

    it('should handle plugin unregistration for non-existent plugin', () => {
      expect(() => registry.unregisterPlugin('non-existent')).not.toThrow();
    });
  });
});