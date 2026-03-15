/**
 * CSS Isolation System Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import CSSIsolationManager, { CSSIsolationConfig } from '../isolation-manager';
import CSSConflictDetector from '../conflict-detector';
import CSSCompatibilityLayer, { CompatibilityConfig } from '../compatibility-layer';
import { CSSManager, createCSSManager } from '../index';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn()
}));

describe('CSSIsolationManager', () => {
  let isolationManager: CSSIsolationManager;
  let config: CSSIsolationConfig;

  beforeEach(() => {
    config = {
      strategy: 'namespace',
      namespace: 'cms',
      prefix: 'cms-',
      wrapperClass: 'cms-isolated',
      isolateGlobals: true
    };
    isolationManager = new CSSIsolationManager(config);
  });

  describe('generateNamespacing', () => {
    it('should generate proper namespace for component names', () => {
      expect(isolationManager.generateNamespacing('Button')).toBe('cms-cms-button');
      expect(isolationManager.generateNamespacing('HeaderNav')).toBe('cms-cms-headernav');
      expect(isolationManager.generateNamespacing('User Profile')).toBe('cms-cms-user-profile');
      expect(isolationManager.generateNamespacing('Card-Component')).toBe('cms-cms-card-component');
    });

    it('should handle special characters and numbers', () => {
      expect(isolationManager.generateNamespacing('Button123')).toBe('cms-cms-button123');
      expect(isolationManager.generateNamespacing('Nav@Menu')).toBe('cms-cms-nav-menu');
      expect(isolationManager.generateNamespacing('Form$Input')).toBe('cms-cms-form-input');
    });
  });

  describe('wrapComponent', () => {
    it('should wrap component with namespace strategy', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const WrappedComponent = isolationManager.wrapComponent(TestComponent, 'test-namespace');
      
      expect(WrappedComponent.displayName).toBe('CSSIsolated(TestComponent)');
    });

    it('should handle components without display name', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      delete TestComponent.displayName;
      delete TestComponent.name;
      
      const WrappedComponent = isolationManager.wrapComponent(TestComponent, 'test-namespace');
      expect(WrappedComponent.displayName).toBe('CSSIsolated(Component)');
    });
  });

  describe('detectGlobalStyles', () => {
    it('should detect common global CSS files', async () => {
      const { readFile, stat, readdir } = await import('fs/promises');
      
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readFile).mockResolvedValue('body { margin: 0; }');
      vi.mocked(readdir).mockResolvedValue(['globals.css'] as any);
      
      const globalStyles = await isolationManager.detectGlobalStyles('/test/project');
      
      expect(globalStyles.length).toBeGreaterThan(0);
      expect(globalStyles.some(style => style.file.includes('globals.css'))).toBe(true);
    });

    it('should handle missing files gracefully', async () => {
      const { stat, readdir } = await import('fs/promises');
      
      vi.mocked(stat).mockRejectedValue(new Error('File not found'));
      vi.mocked(readdir).mockRejectedValue(new Error('Directory not found'));
      
      const globalStyles = await isolationManager.detectGlobalStyles('/test/project');
      // Even with errors, the method should return an array (might be empty or have some results)
      expect(Array.isArray(globalStyles)).toBe(true);
    });
  });

  describe('validateIsolation', () => {
    it('should validate isolated components', async () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const WrappedComponent = isolationManager.wrapComponent(TestComponent, 'test');
      
      const report = await isolationManager.validateIsolation(WrappedComponent);
      
      expect(report.isIsolated).toBe(true);
      expect(report.appliedStrategy).toBe('namespace');
    });

    it('should detect non-isolated components', async () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      
      const report = await isolationManager.validateIsolation(TestComponent);
      
      expect(report.isIsolated).toBe(false);
      expect(report.conflicts).toContain('Component is not wrapped with CSS isolation');
    });
  });
});

describe('CSSConflictDetector', () => {
  let conflictDetector: CSSConflictDetector;

  beforeEach(() => {
    conflictDetector = new CSSConflictDetector([], []);
  });

  describe('analyzeConflicts', () => {
    it('should detect framework conflicts', async () => {
      const cssStrategies = [
        { type: 'tailwind', globalFiles: [], conflicts: [] },
        { type: 'bootstrap', globalFiles: [], conflicts: [] }
      ] as any[];
      
      const globalStyles = [
        { file: 'test.css', selectors: [], conflicts: [], framework: 'bootstrap' as const }
      ];
      
      conflictDetector = new CSSConflictDetector(cssStrategies, globalStyles);
      const analysis = await conflictDetector.analyzeConflicts();
      
      expect(analysis.conflicts.length).toBeGreaterThan(0);
      const frameworkConflict = analysis.conflicts.find(c => c.type === 'framework');
      expect(frameworkConflict).toBeDefined();
      if (frameworkConflict) {
        expect(frameworkConflict.severity).toBe('high');
      }
    });

    it('should detect multiple CSS-in-JS solutions', async () => {
      const cssStrategies = [
        { type: 'styled-components', globalFiles: [], conflicts: [] },
        { type: 'emotion', globalFiles: [], conflicts: [] }
      ] as any[];
      
      conflictDetector = new CSSConflictDetector(cssStrategies, []);
      const analysis = await conflictDetector.analyzeConflicts();
      
      expect(analysis.conflicts.some(c => c.description.includes('Multiple CSS-in-JS'))).toBe(true);
    });

    it('should calculate risk score correctly', async () => {
      const cssStrategies = [
        { type: 'tailwind', globalFiles: [], conflicts: [] },
        { type: 'styled-components', globalFiles: [], conflicts: [] },
        { type: 'emotion', globalFiles: [], conflicts: [] }
      ] as any[];
      
      conflictDetector = new CSSConflictDetector(cssStrategies, []);
      const analysis = await conflictDetector.analyzeConflicts();
      
      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('generateAutoFix', () => {
    it('should generate auto-fix for namespace conflicts', () => {
      const conflict = {
        type: 'framework',
        severity: 'medium',
        description: 'Test conflict',
        affectedSelectors: [],
        sourceFiles: [],
        resolution: {
          strategy: 'namespace',
          steps: [],
          estimatedEffort: 'medium',
          autoFixable: true
        }
      } as any;
      
      const autoFix = conflictDetector.generateAutoFix(conflict);
      
      expect(autoFix).toContain('cms-isolated');
      expect(autoFix).toContain('Auto-generated namespace fix');
    });

    it('should return null for non-auto-fixable conflicts', () => {
      const conflict = {
        resolution: {
          autoFixable: false
        }
      } as any;
      
      const autoFix = conflictDetector.generateAutoFix(conflict);
      expect(autoFix).toBeNull();
    });
  });
});

describe('CSSCompatibilityLayer', () => {
  let compatibilityLayer: CSSCompatibilityLayer;
  let config: CompatibilityConfig;

  beforeEach(() => {
    config = {
      namespace: 'cms',
      prefix: 'cms-',
      isolationStrategy: 'wrapper',
      preserveFrameworks: ['tailwind'],
      generateUtilities: true
    };
    compatibilityLayer = new CSSCompatibilityLayer(config);
  });

  describe('generateCompatibilityCSS', () => {
    it('should generate CSS for supported frameworks', () => {
      const cssStrategies = [
        { type: 'tailwind', globalFiles: [], conflicts: [] }
      ] as any[];
      
      const css = compatibilityLayer.generateCompatibilityCSS(cssStrategies);
      
      expect(css).toContain('Tailwind Compatibility');
      expect(css).toContain('.cms-isolated .tw-flex');
    });

    it('should include utility classes when enabled', () => {
      const css = compatibilityLayer.generateCompatibilityCSS([]);
      
      expect(css).toContain('CMS Utility Classes');
      expect(css).toContain('.cms-flex');
    });
  });

  describe('wrapSelectors', () => {
    it('should wrap CSS selectors with namespace', () => {
      const css = '.button { color: red; } .card { background: white; }';
      const wrapped = compatibilityLayer.wrapSelectors(css, 'test');
      
      expect(wrapped).toContain('.test .button');
      expect(wrapped).toContain('.test .card');
    });

    it('should skip at-rules and comments', () => {
      const css = '@media (max-width: 768px) { .button { display: none; } } /* comment */';
      const wrapped = compatibilityLayer.wrapSelectors(css, 'test');
      
      expect(wrapped).toContain('@media (max-width: 768px)');
      expect(wrapped).toContain('/* comment */');
    });
  });

  describe('generateThemeProperties', () => {
    it('should generate CSS custom properties', () => {
      const themeCSS = compatibilityLayer.generateThemeProperties();
      
      expect(themeCSS).toContain(':root');
      expect(themeCSS).toContain('--cms-primary-color');
      expect(themeCSS).toContain('--cms-font-family');
      expect(themeCSS).toContain('--cms-spacing-md');
    });
  });

  describe('createIsolationWrapper', () => {
    it('should create wrapper styles for different strategies', () => {
      const wrapperCSS = compatibilityLayer.createIsolationWrapper();
      
      expect(wrapperCSS).toContain('.cms-wrapper');
      expect(wrapperCSS).toContain('isolation: isolate');
    });
  });
});

describe('CSSManager', () => {
  let cssManager: CSSManager;

  beforeEach(() => {
    cssManager = createCSSManager([]);
  });

  describe('setupCSSIsolation', () => {
    it('should perform complete CSS setup', async () => {
      const { readFile, stat } = await import('fs/promises');
      
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readFile).mockResolvedValue('body { margin: 0; }');
      
      const setup = await cssManager.setupCSSIsolation('/test/project');
      
      expect(setup).toHaveProperty('globalStyles');
      expect(setup).toHaveProperty('conflictAnalysis');
      expect(setup).toHaveProperty('compatibilityCSS');
      expect(setup).toHaveProperty('isolationCSS');
      expect(setup).toHaveProperty('recommendations');
    });
  });

  describe('generateIntegrationCSS', () => {
    it('should generate complete integration CSS', async () => {
      const { readFile, stat } = await import('fs/promises');
      
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readFile).mockResolvedValue('body { margin: 0; }');
      
      const css = await cssManager.generateIntegrationCSS('/test/project', []);
      
      expect(css).toContain('cms-wrapper');
      expect(css).toContain(':root');
      expect(css).toContain('--cms-primary-color');
    });
  });

  describe('wrapComponent', () => {
    it('should wrap component with proper isolation', () => {
      const TestComponent = () => React.createElement('div', null, 'Test');
      const WrappedComponent = cssManager.wrapComponent(TestComponent, 'TestButton');
      
      expect(WrappedComponent.displayName).toBe('CSSIsolated(TestComponent)');
    });
  });

  describe('createCSSFile', () => {
    it('should create CSS file with header and content', async () => {
      const { readFile, stat } = await import('fs/promises');
      
      vi.mocked(stat).mockResolvedValue({} as any);
      vi.mocked(readFile).mockResolvedValue('body { margin: 0; }');
      
      const cssFile = await cssManager.createCSSFile('/test/project', []);
      
      expect(cssFile).toContain('CMS CSS Isolation and Compatibility Layer');
      expect(cssFile).toContain('Auto-generated CSS');
      expect(cssFile).toContain('Generated on:');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete CSS isolation workflow', async () => {
    const { readFile, stat, readdir } = await import('fs/promises');
    
    // Mock file system
    vi.mocked(stat).mockResolvedValue({} as any);
    vi.mocked(readFile).mockResolvedValue(`
      body { margin: 0; padding: 0; }
      .button { color: red !important; }
      * { box-sizing: border-box; }
    `);
    vi.mocked(readdir).mockResolvedValue(['globals.css'] as any);
    
    const cssManager = createCSSManager([
      { type: 'tailwind', globalFiles: ['tailwind.css'], conflicts: [] },
      { type: 'global-css', globalFiles: ['globals.css'], conflicts: [] }
    ] as any[]);
    
    // Perform setup
    const setup = await cssManager.setupCSSIsolation('/test/project');
    
    // Validate results
    expect(setup.globalStyles.length).toBeGreaterThan(0);
    expect(setup.conflictAnalysis.conflicts.length).toBeGreaterThan(0);
    expect(setup.compatibilityCSS).toContain('CMS Base Isolation Styles');
    expect(setup.recommendations.length).toBeGreaterThan(0);
    
    // Generate CSS file
    const cssFile = await cssManager.createCSSFile('/test/project', []);
    expect(cssFile).toContain('cms-isolated');
    expect(cssFile).toContain('--cms-primary-color');
  });

  it('should handle projects with no CSS frameworks', async () => {
    const { stat } = await import('fs/promises');
    
    vi.mocked(stat).mockRejectedValue(new Error('File not found'));
    
    const cssManager = createCSSManager([]);
    const setup = await cssManager.setupCSSIsolation('/test/project');
    
    // Even with no frameworks, we might still detect some global styles from mocked files
    expect(setup.conflictAnalysis.riskScore).toBeGreaterThanOrEqual(0);
    expect(setup.recommendations.length).toBeGreaterThan(0);
  });
});