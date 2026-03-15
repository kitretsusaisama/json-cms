/**
 * Content Generators for CLI
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import * as log from './logger';

export interface ComponentOptions {
  props: string[];
  slots: string[];
  outputDir?: string;
}

export interface PageOptions {
  title?: string;
  blocks: string[];
  template?: string;
}

export interface ExtractOptions {
  start: number;
  end: number;
}

export interface PluginOptions {
  components: string[];
  routes: string[];
  apiEndpoints: string[];
}

/**
 * Generate a new React component with boilerplate code
 */
export async function generateComponent(
  name: string, 
  options: ComponentOptions
): Promise<void> {
  try {
    log.info(`🏗️  Generating component: ${name}`);
    
    const outputDir = options.outputDir || 'src/components/blocks';
    const componentPath = join(outputDir, `${name}.tsx`);
    
    // Ensure directory exists
    await mkdir(dirname(componentPath), { recursive: true });
    
    // Generate props interface
    const propsInterface = options.props.length > 0 
      ? `interface ${name}Props {\n${options.props.map(prop => `  ${prop}: string;`).join('\n')}\n}`
      : `interface ${name}Props {}`;
    
    // Generate component code
    const componentCode = `import React from 'react';

${propsInterface}

export default function ${name}(props: ${name}Props) {
  return (
    <div className="${name.toLowerCase()}" data-testid="${name.toLowerCase()}">
      <h2>{props.title || '${name}'}</h2>
      {/* Add your component content here */}
    </div>
  );
}

// Component metadata for registry
export const metadata = {
  name: '${name}',
  description: 'Generated ${name} component',
  category: 'content',
  version: '1.0.0',
  author: 'CLI Generator',
};
`;
    
    await writeFile(componentPath, componentCode);
    
    log.success(`✅ Component generated: ${componentPath}`);
    log.info('📝 Next steps:');
    log.info(`   1. Register component in src/components/registry.tsx`);
    log.info(`   2. Add Zod schema for props validation`);
    log.info(`   3. Add component to your page JSON`);
    
  } catch (error) {
    log.error('❌ Failed to generate component:', error);
    throw error;
  }
}

/**
 * Generate a new page JSON file
 */
export async function generatePage(
  id: string, 
  options: PageOptions
): Promise<void> {
  try {
    log.info(`📄 Generating page: ${id}`);
    
    const pageDir = 'data/pages';
    const pagePath = join(pageDir, `${id}.json`);
    
    // Ensure directory exists
    await mkdir(pageDir, { recursive: true });
    
    // Generate page JSON based on template
    let pageData: any = {
      id,
      title: options.title || `Page ${id}`,
      blocks: options.blocks.length > 0 ? options.blocks : getDefaultBlocksForTemplate(options.template),
      prepend: [
        {
          id: 'seo',
          key: 'SEO',
          props: {
            title: options.title || `Page ${id}`,
            description: `Description for ${id} page`,
          }
        }
      ],
      context: {
        device: 'desktop',
        locale: 'en'
      }
    };

    // Apply template-specific configurations
    if (options.template) {
      pageData = applyPageTemplate(pageData, options.template);
    }
    
    await writeFile(pagePath, JSON.stringify(pageData, null, 2));
    
    // Generate corresponding SEO file
    const seoDir = 'data/seoData/page';
    const seoPath = join(seoDir, `${id}.json`);
    await mkdir(seoDir, { recursive: true });
    
    const seoData = {
      title: options.title || `Page ${id}`,
      description: `Description for ${id} page`,
      canonical: `/${id}`,
      robots: 'index,follow',
      openGraph: {
        title: options.title || `Page ${id}`,
        description: `Description for ${id} page`,
        type: 'website'
      }
    };
    
    await writeFile(seoPath, JSON.stringify(seoData, null, 2));
    
    log.success(`✅ Page generated: ${pagePath}`);
    log.success(`✅ SEO data generated: ${seoPath}`);
    log.info('📝 Next steps:');
    log.info(`   1. Create Next.js route: src/app/${id}/page.tsx`);
    log.info(`   2. Create referenced blocks if they don't exist`);
    log.info(`   3. Customize page content and SEO settings`);
    
  } catch (error) {
    log.error('❌ Failed to generate page:', error);
    throw error;
  }
}

/**
 * Generate a new block JSON file
 */
export async function generateBlock(
  id: string, 
  components: string[],
  category: string = 'content'
): Promise<void> {
  try {
    log.info(`🧱 Generating block: ${id}`);
    
    const blockDir = 'data/blocks';
    const blockPath = join(blockDir, `${id}.json`);
    
    // Ensure directory exists
    await mkdir(blockDir, { recursive: true });
    
    // Generate block JSON
    const blockData = {
      id,
      name: `Block ${id}`,
      category,
      components: components.length > 0 ? components.map((component, index) => ({
        id: `${component.toLowerCase()}-${index + 1}`,
        key: component,
        props: getDefaultPropsForComponent(component),
        weight: 1
      })) : [
        {
          id: `${id}-default`,
          key: 'DefaultComponent',
          props: {
            title: `Default ${id} Component`,
            content: 'This is a placeholder component. Replace with your content.'
          },
          weight: 1
        }
      ],
      constraints: [],
      variants: []
    };
    
    await writeFile(blockPath, JSON.stringify(blockData, null, 2));
    
    log.success(`✅ Block generated: ${blockPath}`);
    log.info('📝 Next steps:');
    log.info(`   1. Configure component props in the block`);
    log.info(`   2. Add constraints if needed`);
    log.info(`   3. Reference block in page JSON files`);
    
  } catch (error) {
    log.error('❌ Failed to generate block:', error);
    throw error;
  }
}

/**
 * Generate a new plugin scaffold
 */
export async function generatePlugin(
  name: string,
  options: PluginOptions
): Promise<void> {
  try {
    log.info(`🔌 Generating plugin: ${name}`);
    
    const pluginDir = `src/plugins/${name}`;
    const pluginPath = join(pluginDir, 'index.ts');
    const manifestPath = join(pluginDir, 'plugin.json');
    
    // Ensure directory exists
    await mkdir(pluginDir, { recursive: true });
    
    // Generate plugin manifest
    const manifest = {
      name,
      version: '1.0.0',
      description: `Generated ${name} plugin`,
      author: 'CLI Generator',
      dependencies: [],
      components: options.components.map(comp => ({
        key: comp,
        path: `./components/${comp}.tsx`
      })),
      routes: options.routes.map(route => ({
        path: route,
        component: `./pages/${route.replace('/', '')}.tsx`
      })),
      apiEndpoints: options.apiEndpoints.map(endpoint => ({
        path: endpoint,
        handler: `./api/${endpoint.replace('/', '')}.ts`
      })),
      migrations: []
    };
    
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Generate plugin entry point
    const pluginCode = `
import { Plugin, PluginContext } from '@/boilerplate/interfaces/plugin';
import manifest from './plugin.json';

export class ${name}Plugin implements Plugin {
  manifest = manifest;

  async install(context: PluginContext): Promise<void> {
    console.log(\`Installing \${this.manifest.name} plugin\`);
    // Add installation logic here
  }

  async uninstall(context: PluginContext): Promise<void> {
    console.log(\`Uninstalling \${this.manifest.name} plugin\`);
    // Add uninstallation logic here
  }

  async activate(): Promise<void> {
    console.log(\`Activating \${this.manifest.name} plugin\`);
    // Add activation logic here
  }

  async deactivate(): Promise<void> {
    console.log(\`Deactivating \${this.manifest.name} plugin\`);
    // Add deactivation logic here
  }
}

export default new ${name}Plugin();
`;
    
    await writeFile(pluginPath, pluginCode);
    
    // Generate component files
    if (options.components.length > 0) {
      const componentsDir = join(pluginDir, 'components');
      await mkdir(componentsDir, { recursive: true });
      
      for (const component of options.components) {
        const componentPath = join(componentsDir, `${component}.tsx`);
        const componentCode = `
import React from 'react';

interface ${component}Props {
  title?: string;
  content?: string;
}

export default function ${component}(props: ${component}Props) {
  return (
    <div className="${component.toLowerCase()}-plugin-component">
      <h3>{props.title || '${component} Plugin Component'}</h3>
      <p>{props.content || 'This is a plugin component.'}</p>
    </div>
  );
}

export const metadata = {
  name: '${component}',
  description: 'Plugin component for ${name}',
  category: 'plugin',
  version: '1.0.0',
  author: 'CLI Generator',
};
`;
        await writeFile(componentPath, componentCode);
      }
    }
    
    // Generate API endpoints
    if (options.apiEndpoints.length > 0) {
      const apiDir = join(pluginDir, 'api');
      await mkdir(apiDir, { recursive: true });
      
      for (const endpoint of options.apiEndpoints) {
        const endpointName = endpoint.replace('/', '');
        const endpointPath = join(apiDir, `${endpointName}.ts`);
        const endpointCode = `
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Hello from ${name} plugin ${endpoint} endpoint',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  return NextResponse.json({
    message: 'Data received by ${name} plugin ${endpoint} endpoint',
    data: body,
    timestamp: new Date().toISOString()
  });
}
`;
        await writeFile(endpointPath, endpointCode);
      }
    }
    
    log.success(`✅ Plugin generated: ${pluginDir}`);
    log.info('📝 Next steps:');
    log.info(`   1. Implement plugin functionality in ${pluginPath}`);
    log.info(`   2. Register plugin in plugin manager`);
    log.info(`   3. Test plugin installation and activation`);
    
  } catch (error) {
    log.error('❌ Failed to generate plugin:', error);
    throw error;
  }
}

/**
 * Extract components from a page into a reusable block
 */
export async function extractBlock(
  pageId: string, 
  blockName: string, 
  options: ExtractOptions
): Promise<void> {
  try {
    log.info(`🔄 Extracting block '${blockName}' from page '${pageId}'`);
    
    // This is a placeholder implementation
    // In a real implementation, you would:
    // 1. Read the source page JSON
    // 2. Extract components in the specified range
    // 3. Create a new block with those components
    // 4. Update the source page to reference the new block
    
    log.warn('⚠️  Extract block functionality is not yet implemented');
    log.info('📝 Manual steps:');
    log.info(`   1. Open data/pages/${pageId}.json`);
    log.info(`   2. Copy components ${options.start} to ${options.end}`);
    log.info(`   3. Create new block: data/blocks/${blockName}.json`);
    log.info(`   4. Replace components with block reference in page`);
    
  } catch (error) {
    log.error('❌ Failed to extract block:', error);
    throw error;
  }
}

// Helper functions

function getDefaultBlocksForTemplate(template?: string): string[] {
  switch (template) {
    case 'landing':
      return ['hero', 'features', 'testimonials', 'cta'];
    case 'blog':
      return ['header', 'content', 'sidebar', 'footer'];
    case 'product':
      return ['product-hero', 'product-details', 'reviews', 'related-products'];
    default:
      return ['hero', 'content'];
  }
}

function applyPageTemplate(pageData: any, template: string): any {
  switch (template) {
    case 'landing':
      return {
        ...pageData,
        metadata: {
          type: 'landing-page',
          template: 'landing'
        }
      };
    case 'blog':
      return {
        ...pageData,
        metadata: {
          type: 'blog-post',
          template: 'blog'
        }
      };
    case 'product':
      return {
        ...pageData,
        metadata: {
          type: 'product-page',
          template: 'product'
        }
      };
    default:
      return pageData;
  }
}

function getDefaultPropsForComponent(component: string): any {
  const commonProps: Record<string, Record<string, string>> = {
    Hero: {
      title: 'Hero Title',
      subtitle: 'Hero subtitle text',
      ctaText: 'Get Started',
      ctaLink: '#'
    },
    Card: {
      title: 'Card Title',
      content: 'Card content text',
      imageUrl: '/placeholder.jpg'
    },
    Button: {
      text: 'Click Me',
      variant: 'primary',
      size: 'medium'
    },
    Text: {
      content: 'Sample text content',
      variant: 'body'
    }
  };
  
  return commonProps[component] || {
    title: `${component} Title`,
    content: `${component} content`
  };
}
