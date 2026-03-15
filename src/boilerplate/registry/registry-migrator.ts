/**
 * Registry Migration Utility
 * Helps migrate from the existing registry to the enhanced registry
 */

import React from 'react';
import { z } from 'zod';
// Import will be done dynamically to avoid Node.js/React context issues
import { enhancedRegistry } from './enhanced-registry';
import { ComponentDefinition, ComponentMetadata } from '../interfaces/component-registry';

/**
 * Migrate existing registry components to enhanced registry
 */
export function migrateExistingRegistry(existingRegistry?: Record<string, React.ComponentType<any>>): void {
  console.log('Migrating existing registry components...');

  // If no registry provided, try to import it dynamically
  if (!existingRegistry) {
    try {
      // This will only work in browser/React context
      const registryModule = require('../../components/registry');
      existingRegistry = registryModule.registry;
    } catch (error) {
      console.warn('Could not import existing registry, skipping migration');
      return;
    }
  }

  if (!existingRegistry) {
    console.warn('No existing registry found, skipping migration');
    return;
  }

  for (const [key, component] of Object.entries(existingRegistry)) {
    try {
      const definition = createDefinitionFromComponent(key, component);
      enhancedRegistry.register(key, definition);
      console.log(`✓ Migrated component: ${key}`);
    } catch (error) {
      console.error(`✗ Failed to migrate component "${key}":`, error);
    }
  }

  console.log('Registry migration completed');
}

/**
 * Create a component definition from an existing component
 */
function createDefinitionFromComponent(
  key: string,
  component: React.ComponentType<any>
): ComponentDefinition {
  const metadata = createMetadataForComponent(key, component);
  const schema = createSchemaForComponent(key, component);

  return {
    component,
    schema,
    metadata,
    lazy: false,
  };
}

/**
 * Create metadata for a component based on its key and type
 */
function createMetadataForComponent(
  key: string,
  component: React.ComponentType<any>
): ComponentMetadata {
  // Define component categories based on existing components
  const categoryMap: Record<string, string> = {
    Hero: 'layout',
    SEO: 'meta',
    Grid: 'layout',
    FeatureCard: 'content',
    CTA: 'action',
    TextBlock: 'content',
    AnnouncementBar: 'notification',
    FAQ: 'content',
    Newsletter: 'form',
    ProductGrid: 'commerce',
    RichText: 'content',
    TagList: 'content',
    Card: 'content',
    Button: 'action',
  };

  const category = categoryMap[key] || 'general';
  
  // Create examples based on component type
  const examples = createExamplesForComponent(key);

  return {
    name: component.displayName || component.name || key,
    description: getDescriptionForComponent(key),
    category,
    version: '1.0.0',
    author: 'system',
    tags: getTagsForComponent(key, category),
    deprecated: false,
    slots: getSlotsForComponent(key),
    variants: getVariantsForComponent(key),
    examples,
  };
}

/**
 * Create Zod schema for component props
 */
function createSchemaForComponent(
  key: string,
  _component: React.ComponentType<any>
): z.ZodSchema | undefined {
  // Define schemas for known components
  const schemas: Record<string, z.ZodSchema> = {
    Hero: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      backgroundImage: z.string().optional(),
      ctaText: z.string().optional(),
      ctaLink: z.string().optional(),
    }),

    SEO: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      ogImage: z.string().optional(),
    }),

    Grid: z.object({
      columns: z.number().min(1).max(12).default(3),
      gap: z.string().optional(),
      children: z.array(z.any()).optional(),
    }),

    FeatureCard: z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
      link: z.string().optional(),
    }),

    CTA: z.object({
      title: z.string(),
      description: z.string().optional(),
      buttonText: z.string(),
      buttonLink: z.string(),
      variant: z.enum(['primary', 'secondary']).default('primary'),
    }),

    TextBlock: z.object({
      content: z.string(),
      className: z.string().optional(),
    }),

    AnnouncementBar: z.object({
      message: z.string(),
      link: z.string().optional(),
      dismissible: z.boolean().default(true),
    }),

    FAQ: z.object({
      questions: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })),
    }),

    Newsletter: z.object({
      title: z.string(),
      description: z.string().optional(),
      placeholder: z.string().default('Enter your email'),
      buttonText: z.string().default('Subscribe'),
    }),

    ProductGrid: z.object({
      products: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        image: z.string().optional(),
        description: z.string().optional(),
      })),
      columns: z.number().min(1).max(6).default(3),
    }),

    RichText: z.object({
      markdown: z.string(),
      className: z.string().optional(),
    }),

    TagList: z.object({
      tags: z.array(z.string()),
      variant: z.enum(['default', 'colored']).default('default'),
    }),

    Button: z.object({
      href: z.string().default('#'),
      variant: z.enum(['primary', 'secondary', 'outline']).default('primary'),
      children: z.any().optional(),
      className: z.string().optional(),
    }),
  };

  return schemas[key];
}

/**
 * Get description for a component
 */
function getDescriptionForComponent(key: string): string {
  const descriptions: Record<string, string> = {
    Hero: 'A hero section component with title, subtitle, and call-to-action',
    SEO: 'SEO metadata component for page optimization',
    Grid: 'A flexible grid layout component',
    FeatureCard: 'A card component for displaying features or services',
    CTA: 'A call-to-action component with button and description',
    TextBlock: 'A rich text content block with markdown support',
    AnnouncementBar: 'A dismissible announcement bar for important messages',
    FAQ: 'A frequently asked questions component with collapsible items',
    Newsletter: 'A newsletter signup form component',
    ProductGrid: 'A grid component for displaying products',
    RichText: 'A component for rendering markdown content',
    TagList: 'A component for displaying a list of tags',
    Card: 'Alias for FeatureCard component',
    Button: 'A customizable button component with multiple variants',
  };

  return descriptions[key] || `${key} component`;
}

/**
 * Get tags for a component
 */
function getTagsForComponent(key: string, category: string): string[] {
  const baseTags = [category];
  
  const specificTags: Record<string, string[]> = {
    Hero: ['banner', 'header', 'landing'],
    SEO: ['metadata', 'optimization'],
    Grid: ['layout', 'responsive'],
    FeatureCard: ['card', 'feature'],
    CTA: ['button', 'conversion'],
    TextBlock: ['content', 'text', 'markdown'],
    AnnouncementBar: ['notification', 'banner'],
    FAQ: ['accordion', 'help'],
    Newsletter: ['email', 'subscription'],
    ProductGrid: ['ecommerce', 'products'],
    RichText: ['markdown', 'content'],
    TagList: ['tags', 'labels'],
    Button: ['interactive', 'link'],
  };

  return [...baseTags, ...(specificTags[key] || [])];
}

/**
 * Get slots for a component
 */
function getSlotsForComponent(key: string) {
  const slots: Record<string, any[]> = {
    Grid: [
      {
        name: 'children',
        description: 'Grid items to display',
        required: false,
        allowedComponents: ['FeatureCard', 'Card', 'TextBlock'],
      },
    ],
    Hero: [
      {
        name: 'actions',
        description: 'Action buttons in the hero section',
        required: false,
        allowedComponents: ['Button', 'CTA'],
        maxItems: 3,
      },
    ],
  };

  return slots[key] || [];
}

/**
 * Get variants for a component
 */
function getVariantsForComponent(key: string) {
  const variants: Record<string, any[]> = {
    Button: [
      {
        name: 'primary',
        description: 'Primary button style',
        props: { variant: 'primary' },
      },
      {
        name: 'secondary',
        description: 'Secondary button style',
        props: { variant: 'secondary' },
      },
      {
        name: 'outline',
        description: 'Outline button style',
        props: { variant: 'outline' },
      },
    ],
    CTA: [
      {
        name: 'primary',
        description: 'Primary CTA style',
        props: { variant: 'primary' },
      },
      {
        name: 'secondary',
        description: 'Secondary CTA style',
        props: { variant: 'secondary' },
      },
    ],
  };

  return variants[key] || [];
}

/**
 * Create examples for a component
 */
function createExamplesForComponent(key: string) {
  const examples: Record<string, any[]> = {
    Hero: [
      {
        name: 'Basic Hero',
        description: 'A simple hero section',
        props: {
          title: 'Welcome to Our Site',
          subtitle: 'Discover amazing features and services',
          ctaText: 'Get Started',
          ctaLink: '/signup',
        },
      },
    ],
    FeatureCard: [
      {
        name: 'Basic Feature',
        description: 'A simple feature card',
        props: {
          title: 'Amazing Feature',
          description: 'This feature will change your life',
          icon: '🚀',
        },
      },
    ],
    Button: [
      {
        name: 'Primary Button',
        description: 'A primary action button',
        props: {
          href: '/action',
          variant: 'primary',
          children: 'Click Me',
        },
      },
    ],
  };

  return examples[key] || [];
}

/**
 * Get all migrated components as a record
 */
export function getMigratedComponents(): Record<string, ComponentDefinition> {
  return enhancedRegistry.list();
}

/**
 * Validate all migrated components
 */
export function validateMigratedComponents(): { valid: number; invalid: number; errors: string[] } {
  const components = enhancedRegistry.list();
  let valid = 0;
  let invalid = 0;
  const errors: string[] = [];

  for (const [key, definition] of Object.entries(components)) {
    try {
      // Test with empty props to see if schema validation works
      const result = enhancedRegistry.validate(key, {});
      if (result.valid || result.warnings.length > 0) {
        valid++;
      } else {
        invalid++;
        errors.push(`${key}: ${result.errors.map(e => e.message).join(', ')}`);
      }
    } catch (error) {
      invalid++;
      errors.push(`${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { valid, invalid, errors };
}