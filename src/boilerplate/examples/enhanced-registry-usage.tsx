/**
 * Enhanced Component Registry Usage Examples
 * Demonstrates how to use the enhanced registry features
 */

import React from 'react';
import { z } from 'zod';
import {
  enhancedRegistry,
  pluginRegistry,
  createPluginManifest,
  createComponentDefinition,
  type ComponentDefinition,
  type ComponentMetadata,
} from '../registry';

// Example 1: Creating a custom component with full metadata
const CustomButton: React.FC<{
  text: string;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}> = ({ text, variant = 'primary', size = 'medium', onClick }) => {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  };
  const sizeClasses = {
    small: 'text-sm px-2 py-1',
    medium: 'text-base px-4 py-2',
    large: 'text-lg px-6 py-3',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {text}
    </button>
  );
};

// Define schema for the custom button
const customButtonSchema = z.object({
  text: z.string(),
  variant: z.enum(['primary', 'secondary']).default('primary'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  onClick: z.function().optional(),
});

// Define metadata for the custom button
const customButtonMetadata: ComponentMetadata = {
  name: 'Custom Button',
  description: 'A customizable button component with variants and sizes',
  category: 'action',
  version: '1.0.0',
  author: 'example-author',
  tags: ['button', 'interactive', 'action'],
  variants: [
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
  ],
  examples: [
    {
      name: 'Primary Button',
      description: 'A primary action button',
      props: {
        text: 'Click Me',
        variant: 'primary',
        size: 'medium',
      },
    },
    {
      name: 'Small Secondary Button',
      description: 'A small secondary button',
      props: {
        text: 'Cancel',
        variant: 'secondary',
        size: 'small',
      },
    },
  ],
};

// Example 2: Registering the custom component
export function registerCustomButton() {
  const definition: ComponentDefinition = {
    component: CustomButton,
    schema: customButtonSchema,
    metadata: customButtonMetadata,
  };

  enhancedRegistry.register('CustomButton', definition);
  console.log('✓ Custom Button registered successfully');
}

// Example 3: Creating a lazy-loaded component
const LazyModal = React.lazy(() => import('./LazyModal'));

export function registerLazyModal() {
  const definition: ComponentDefinition = {
    component: LazyModal,
    metadata: {
      name: 'Lazy Modal',
      description: 'A modal component that loads on demand',
      category: 'overlay',
      version: '1.0.0',
      author: 'example-author',
      tags: ['modal', 'overlay', 'lazy'],
    },
    lazy: true,
    loader: () => import('./LazyModal').then(m => m.default),
  };

  enhancedRegistry.register('LazyModal', definition);
  console.log('✓ Lazy Modal registered successfully');
}

// Example 4: Creating and registering a plugin
export async function registerExamplePlugin() {
  // Define plugin components
  const pluginComponents = [
    createComponentDefinition('PluginCard', {
      name: 'Plugin Card',
      description: 'A card component from a plugin',
      category: 'content',
      version: '1.0.0',
      author: 'plugin-author',
      tags: ['card', 'plugin'],
    }, {
      path: './plugin-components/PluginCard',
      lazy: true,
    }),
    
    createComponentDefinition('PluginHeader', {
      name: 'Plugin Header',
      description: 'A header component from a plugin',
      category: 'layout',
      version: '1.0.0',
      author: 'plugin-author',
      tags: ['header', 'plugin'],
    }, {
      module: '@example/plugin-components/Header',
      lazy: true,
    }),
  ];

  // Create plugin manifest
  const manifest = createPluginManifest(
    'Example Plugin',
    '1.0.0',
    pluginComponents,
    {
      description: 'An example plugin with custom components',
      author: 'plugin-author',
    }
  );

  // Register the plugin
  const result = await pluginRegistry.registerPlugin('example-plugin', manifest);
  
  if (result.valid) {
    console.log('✓ Example Plugin registered successfully');
  } else {
    console.error('✗ Failed to register Example Plugin:', result.errors);
  }

  return result;
}

// Example 5: Using registry features
export function demonstrateRegistryFeatures() {
  console.log('=== Enhanced Registry Features Demo ===');

  // Register components
  registerCustomButton();

  // Validate component props
  const validationResult = enhancedRegistry.validate('CustomButton', {
    text: 'Test Button',
    variant: 'primary',
    size: 'large',
  });
  
  console.log('Validation result:', validationResult);

  // Search components
  const searchResults = enhancedRegistry.search('button');
  console.log('Search results for "button":', searchResults.map(r => r.metadata.name));

  // Get components by category
  const actionComponents = enhancedRegistry.listByCategory('action');
  console.log('Action components:', Object.keys(actionComponents));

  // Get registry statistics
  const stats = enhancedRegistry.getStats();
  console.log('Registry statistics:', stats);

  // Get component metadata
  const metadata = enhancedRegistry.getMetadata('CustomButton');
  console.log('CustomButton metadata:', metadata);

  // Get component variants
  const variants = enhancedRegistry.getVariants('CustomButton');
  console.log('CustomButton variants:', variants);

  // Get component examples
  const examples = enhancedRegistry.getExamples('CustomButton');
  console.log('CustomButton examples:', examples);
}

// Example 6: Error handling and validation
export function demonstrateErrorHandling() {
  console.log('=== Error Handling Demo ===');

  // Try to validate non-existent component
  const invalidResult = enhancedRegistry.validate('NonExistent', {});
  console.log('Non-existent component validation:', invalidResult);

  // Try to validate with invalid props
  const invalidPropsResult = enhancedRegistry.validate('CustomButton', {
    text: 123, // Should be string
    variant: 'invalid', // Should be 'primary' or 'secondary'
  });
  console.log('Invalid props validation:', invalidPropsResult);

  // Try to get non-existent component
  const nonExistentComponent = enhancedRegistry.get('NonExistent');
  console.log('Non-existent component:', nonExistentComponent);
}

// Example 7: Dynamic component loading
export async function demonstrateDynamicLoading() {
  console.log('=== Dynamic Loading Demo ===');

  // Register a lazy component
  registerLazyModal();

  try {
    // Load the component dynamically
    const definition = await enhancedRegistry.loadDynamic('LazyModal');
    console.log('✓ Lazy component loaded:', definition?.metadata.name);
  } catch (error) {
    console.error('✗ Failed to load lazy component:', error);
  }

  // Try to load non-existent component
  const nonExistent = await enhancedRegistry.loadDynamic('NonExistent');
  console.log('Non-existent lazy component:', nonExistent);
}

// Example usage in a React component
export const RegistryDemo: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = React.useState<string>('');
  const [componentProps, setComponentProps] = React.useState<any>({});
  const [validationResult, setValidationResult] = React.useState<any>(null);

  // Get all components for the dropdown
  const allComponents = enhancedRegistry.list();
  const componentKeys = Object.keys(allComponents);

  const handleComponentChange = (componentKey: string) => {
    setSelectedComponent(componentKey);
    
    // Get examples for the selected component
    const examples = enhancedRegistry.getExamples(componentKey);
    if (examples.length > 0) {
      setComponentProps(examples[0].props);
    }
  };

  const handleValidation = () => {
    if (selectedComponent) {
      const result = enhancedRegistry.validate(selectedComponent, componentProps);
      setValidationResult(result);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enhanced Registry Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Component Selection</h2>
          
          <select
            value={selectedComponent}
            onChange={(e) => handleComponentChange(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">Select a component</option>
            {componentKeys.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>

          {selectedComponent && (
            <div>
              <h3 className="font-medium mb-2">Component Metadata</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(enhancedRegistry.getMetadata(selectedComponent), null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Validation</h2>
          
          <textarea
            value={JSON.stringify(componentProps, null, 2)}
            onChange={(e) => {
              try {
                setComponentProps(JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="w-full h-32 p-2 border rounded mb-4 font-mono text-sm"
            placeholder="Component props (JSON)"
          />

          <button
            onClick={handleValidation}
            disabled={!selectedComponent}
            className="w-full bg-blue-600 text-white p-2 rounded disabled:bg-gray-400"
          >
            Validate Props
          </button>

          {validationResult && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Validation Result</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(validationResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Registry Statistics</h2>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
          {JSON.stringify(enhancedRegistry.getStats(), null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default RegistryDemo;