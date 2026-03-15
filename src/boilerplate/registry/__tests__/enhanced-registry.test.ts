/**
 * Tests for Enhanced Component Registry
 */

import React from 'react';
import { z } from 'zod';
import { EnhancedComponentRegistry } from '../enhanced-registry';
import { ComponentDefinition, ComponentMetadata } from '../../interfaces/component-registry';

// Mock React component for testing
const MockComponent: React.FC<{ title: string; description?: string }> = ({ title, description }) => {
  return React.createElement('div', {}, title, description);
};

MockComponent.displayName = 'MockComponent';

// Test schema
const mockSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

// Test metadata
const mockMetadata: ComponentMetadata = {
  name: 'Mock Component',
  description: 'A mock component for testing',
  category: 'test',
  version: '1.0.0',
  author: 'test-author',
  tags: ['test', 'mock'],
  slots: [
    {
      name: 'content',
      description: 'Main content slot',
      required: false,
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
      name: 'Basic Example',
      description: 'A basic example',
      props: { title: 'Test Title' },
    },
  ],
};

describe('EnhancedComponentRegistry', () => {
  let registry: EnhancedComponentRegistry;

  beforeEach(() => {
    registry = new EnhancedComponentRegistry();
  });

  describe('Component Registration', () => {
    it('should register a component successfully', () => {
      const definition: ComponentDefinition = {
        component: MockComponent,
        schema: mockSchema,
        metadata: mockMetadata,
      };

      expect(() => registry.register('MockComponent', definition)).not.toThrow();
      expect(registry.has('MockComponent')).toBe(true);
    });

    it('should throw error for invalid component definition', () => {
      const invalidDefinition = {
        component: null,
        metadata: mockMetadata,
      } as any;

      expect(() => registry.register('Invalid', invalidDefinition)).toThrow();
    });

    it('should warn when overwriting existing component', () => {
      const definition: ComponentDefinition = {
        component: MockComponent,
        metadata: mockMetadata,
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      registry.register('MockComponent', definition);
      registry.register('MockComponent', definition);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Component "MockComponent" is already registered. Overwriting.'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Component Retrieval', () => {
    beforeEach(() => {
      const definition: ComponentDefinition = {
        component: MockComponent,
        schema: mockSchema,
        metadata: mockMetadata,
      };
      registry.register('MockComponent', definition);
    });

    it('should retrieve registered component', () => {
      const definition = registry.get('MockComponent');
      expect(definition).toBeTruthy();
      expect(definition?.component).toBe(MockComponent);
    });

    it('should return null for non-existent component', () => {
      const definition = registry.get('NonExistent');
      expect(definition).toBeNull();
    });

    it('should check component existence', () => {
      expect(registry.has('MockComponent')).toBe(true);
      expect(registry.has('NonExistent')).toBe(false);
    });
  });

  describe('Component Validation', () => {
    beforeEach(() => {
      const definition: ComponentDefinition = {
        component: MockComponent,
        schema: mockSchema,
        metadata: mockMetadata,
      };
      registry.register('MockComponent', definition);
    });

    it('should validate valid props', () => {
      const result = registry.validate('MockComponent', {
        title: 'Test Title',
        description: 'Test Description',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid props', () => {
      const result = registry.validate('MockComponent', {
        description: 'Missing title',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('title');
    });

    it('should handle component without schema', () => {
      const definitionWithoutSchema: ComponentDefinition = {
        component: MockComponent,
        metadata: mockMetadata,
      };
      registry.register('NoSchema', definitionWithoutSchema);

      const result = registry.validate('NoSchema', {});
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });

    it('should handle non-existent component', () => {
      const result = registry.validate('NonExistent', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('COMPONENT_NOT_FOUND');
    });
  });

  describe('Component Listing', () => {
    beforeEach(() => {
      const testDefinition: ComponentDefinition = {
        component: MockComponent,
        metadata: { ...mockMetadata, category: 'test' },
      };
      
      const layoutDefinition: ComponentDefinition = {
        component: MockComponent,
        metadata: { ...mockMetadata, name: 'Layout Component', category: 'layout' },
      };

      registry.register('TestComponent', testDefinition);
      registry.register('LayoutComponent', layoutDefinition);
    });

    it('should list all components', () => {
      const components = registry.list();
      expect(Object.keys(components)).toHaveLength(2);
      expect(components.TestComponent).toBeTruthy();
      expect(components.LayoutComponent).toBeTruthy();
    });

    it('should list components by category', () => {
      const testComponents = registry.listByCategory('test');
      const layoutComponents = registry.listByCategory('layout');

      expect(Object.keys(testComponents)).toHaveLength(1);
      expect(Object.keys(layoutComponents)).toHaveLength(1);
      expect(testComponents.TestComponent).toBeTruthy();
      expect(layoutComponents.LayoutComponent).toBeTruthy();
    });
  });

  describe('Component Search', () => {
    beforeEach(() => {
      const definition1: ComponentDefinition = {
        component: MockComponent,
        metadata: {
          ...mockMetadata,
          name: 'Hero Component',
          description: 'A hero section component',
          tags: ['hero', 'banner'],
        },
      };

      const definition2: ComponentDefinition = {
        component: MockComponent,
        metadata: {
          ...mockMetadata,
          name: 'Card Component',
          description: 'A card display component',
          tags: ['card', 'content'],
        },
      };

      registry.register('Hero', definition1);
      registry.register('Card', definition2);
    });

    it('should search by name', () => {
      const results = registry.search('hero');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('Hero Component');
    });

    it('should search by description', () => {
      const results = registry.search('card display');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('Card Component');
    });

    it('should search by tags', () => {
      const results = registry.search('banner');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.name).toBe('Hero Component');
    });

    it('should return empty array for no matches', () => {
      const results = registry.search('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Plugin Support', () => {
    it('should register plugin components', () => {
      const pluginComponents = {
        PluginComponent1: {
          component: MockComponent,
          metadata: { ...mockMetadata, name: 'Plugin Component 1' },
        },
        PluginComponent2: {
          component: MockComponent,
          metadata: { ...mockMetadata, name: 'Plugin Component 2' },
        },
      };

      registry.registerPlugin('test-plugin', pluginComponents);

      expect(registry.has('PluginComponent1')).toBe(true);
      expect(registry.has('PluginComponent2')).toBe(true);
    });

    it('should unregister plugin components', () => {
      const pluginComponents = {
        PluginComponent1: {
          component: MockComponent,
          metadata: { ...mockMetadata, name: 'Plugin Component 1' },
        },
      };

      registry.registerPlugin('test-plugin', pluginComponents);
      expect(registry.has('PluginComponent1')).toBe(true);

      registry.unregisterPlugin('test-plugin');
      expect(registry.has('PluginComponent1')).toBe(false);
    });
  });

  describe('Registry Statistics', () => {
    beforeEach(() => {
      const testDefinition: ComponentDefinition = {
        component: MockComponent,
        metadata: { ...mockMetadata, category: 'test' },
      };
      
      const layoutDefinition: ComponentDefinition = {
        component: MockComponent,
        metadata: { ...mockMetadata, category: 'layout', deprecated: true },
        lazy: true,
      };

      registry.register('TestComponent', testDefinition);
      registry.register('LayoutComponent', layoutDefinition);
      
      registry.registerPlugin('test-plugin', {
        PluginComponent: {
          component: MockComponent,
          metadata: { ...mockMetadata, category: 'plugin' },
        },
      });
    });

    it('should return correct statistics', () => {
      const stats = registry.getStats();

      expect(stats.totalComponents).toBe(3);
      expect(stats.categoryCounts.test).toBe(1);
      expect(stats.categoryCounts.layout).toBe(1);
      expect(stats.categoryCounts.plugin).toBe(1);
      expect(stats.lazyComponents).toBe(1);
      expect(stats.deprecatedComponents).toBe(1);
      expect(stats.pluginComponents['test-plugin']).toBe(1);
    });
  });

  describe('Slot Validation', () => {
    beforeEach(() => {
      const definition: ComponentDefinition = {
        component: MockComponent,
        metadata: {
          ...mockMetadata,
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
          ],
        },
      };
      registry.register('SlotComponent', definition);
    });

    it('should validate required slots', () => {
      const result = registry.validateSlots('SlotComponent', {
        content: [{ componentType: 'TextBlock' }],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('REQUIRED_SLOT_MISSING');
    });

    it('should validate max items', () => {
      const result = registry.validateSlots('SlotComponent', {
        header: [
          { componentType: 'HeaderComponent' },
          { componentType: 'HeaderComponent' },
        ],
        content: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('SLOT_MAX_ITEMS_EXCEEDED');
    });

    it('should validate allowed components', () => {
      const result = registry.validateSlots('SlotComponent', {
        header: [{ componentType: 'InvalidComponent' }],
        content: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('COMPONENT_NOT_ALLOWED_IN_SLOT');
    });

    it('should warn about undefined slots', () => {
      const result = registry.validateSlots('SlotComponent', {
        header: [{ componentType: 'HeaderComponent' }],
        undefinedSlot: [{ componentType: 'SomeComponent' }],
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });
  });
});