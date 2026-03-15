/**
 * Registry Validation Script
 * Simple validation to test the enhanced registry functionality
 */

import React from 'react';
import { z } from 'zod';
import { EnhancedComponentRegistry } from './enhanced-registry';
import { migrateExistingRegistry, validateMigratedComponents } from './registry-migrator';
import type { ComponentDefinition, ComponentMetadata } from '../interfaces/component-registry';

// Mock React component for testing
const TestComponent: React.FC<{ title: string; description?: string }> = ({ title, description }) => {
  return React.createElement('div', {}, title, description);
};

TestComponent.displayName = 'TestComponent';

// Test schema
const testSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

// Test metadata
const testMetadata: ComponentMetadata = {
  name: 'Test Component',
  description: 'A test component for validation',
  category: 'test',
  version: '1.0.0',
  author: 'test-author',
  tags: ['test'],
};

function runValidationTests() {
  console.log('🧪 Running Enhanced Registry Validation Tests...\n');

  const registry = new EnhancedComponentRegistry();
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Component Registration
  totalTests++;
  try {
    const definition: ComponentDefinition = {
      component: TestComponent,
      schema: testSchema,
      metadata: testMetadata,
    };

    registry.register('TestComponent', definition);
    
    if (registry.has('TestComponent')) {
      console.log('✅ Test 1: Component registration - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 1: Component registration - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 1: Component registration - FAILED:', error);
  }

  // Test 2: Component Retrieval
  totalTests++;
  try {
    const definition = registry.get('TestComponent');
    
    if (definition && definition.component === TestComponent) {
      console.log('✅ Test 2: Component retrieval - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 2: Component retrieval - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 2: Component retrieval - FAILED:', error);
  }

  // Test 3: Props Validation (Valid)
  totalTests++;
  try {
    const result = registry.validate('TestComponent', {
      title: 'Test Title',
      description: 'Test Description',
    });
    
    if (result.valid && result.errors.length === 0) {
      console.log('✅ Test 3: Valid props validation - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 3: Valid props validation - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 3: Valid props validation - FAILED:', error);
  }

  // Test 4: Props Validation (Invalid)
  totalTests++;
  try {
    const result = registry.validate('TestComponent', {
      description: 'Missing title',
    });
    
    if (!result.valid && result.errors.length > 0) {
      console.log('✅ Test 4: Invalid props validation - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 4: Invalid props validation - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 4: Invalid props validation - FAILED:', error);
  }

  // Test 5: Component Search
  totalTests++;
  try {
    const results = registry.search('test');
    
    if (results.length > 0 && results[0].metadata.name === 'Test Component') {
      console.log('✅ Test 5: Component search - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 5: Component search - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 5: Component search - FAILED:', error);
  }

  // Test 6: Category Listing
  totalTests++;
  try {
    const components = registry.listByCategory('test');
    
    if (Object.keys(components).length > 0 && components.TestComponent) {
      console.log('✅ Test 6: Category listing - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 6: Category listing - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 6: Category listing - FAILED:', error);
  }

  // Test 7: Plugin Registration
  totalTests++;
  try {
    const pluginComponents = {
      PluginComponent: {
        component: TestComponent,
        metadata: { ...testMetadata, name: 'Plugin Component' },
      },
    };

    registry.registerPlugin('test-plugin', pluginComponents);
    
    if (registry.has('PluginComponent')) {
      console.log('✅ Test 7: Plugin registration - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 7: Plugin registration - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 7: Plugin registration - FAILED:', error);
  }

  // Test 8: Registry Statistics
  totalTests++;
  try {
    const stats = registry.getStats();
    
    if (stats.totalComponents >= 2 && stats.categoryCounts.test >= 1) {
      console.log('✅ Test 8: Registry statistics - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 8: Registry statistics - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 8: Registry statistics - FAILED:', error);
  }

  // Test 9: Existing Registry Migration (Skip in Node.js context)
  totalTests++;
  try {
    // Create a mock registry for testing
    const mockRegistry = {
      TestMigrationComponent: TestComponent,
    };
    
    migrateExistingRegistry(mockRegistry);
    const migrationResults = validateMigratedComponents();
    
    if (migrationResults.valid > 0) {
      console.log('✅ Test 9: Registry migration - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 9: Registry migration - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 9: Registry migration - FAILED:', error);
  }

  // Test 10: Non-existent Component Handling
  totalTests++;
  try {
    const result = registry.validate('NonExistent', {});
    
    if (!result.valid && result.errors[0]?.code === 'COMPONENT_NOT_FOUND') {
      console.log('✅ Test 10: Non-existent component handling - PASSED');
      passedTests++;
    } else {
      console.log('❌ Test 10: Non-existent component handling - FAILED');
    }
  } catch (error) {
    console.log('❌ Test 10: Non-existent component handling - FAILED:', error);
  }

  // Summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Enhanced registry is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

  return { passedTests, totalTests, success: passedTests === totalTests };
}

// Run the validation if this file is executed directly
if (require.main === module) {
  runValidationTests();
}

export { runValidationTests };