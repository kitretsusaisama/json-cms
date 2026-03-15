/**
 * CSS Compatibility Layer
 * 
 * Provides compatibility utilities for different CSS frameworks and strategies
 */

import { CSSStrategy } from '../interfaces/scanner';

export interface CompatibilityConfig {
  namespace: string;
  prefix: string;
  isolationStrategy: 'wrapper' | 'reset' | 'custom-properties' | 'shadow-dom';
  preserveFrameworks: string[];
  generateUtilities: boolean;
}

export interface FrameworkAdapter {
  name: string;
  type: 'utility' | 'component' | 'css-in-js' | 'preprocessor';
  generateCompatibilityCSS(): string;
  wrapSelector(selector: string, namespace: string): string;
  extractUtilities(): string[];
}

export class CSSCompatibilityLayer {
  private config: CompatibilityConfig;
  private adapters: Map<string, FrameworkAdapter>;

  constructor(config: CompatibilityConfig) {
    this.config = config;
    this.adapters = new Map();
    
    // Initialize built-in adapters
    this.initializeAdapters();
  }

  /**
   * Generate compatibility CSS for all detected frameworks
   */
  generateCompatibilityCSS(cssStrategies: CSSStrategy[]): string {
    let css = this.generateBaseIsolation();
    
    for (const strategy of cssStrategies) {
      const adapter = this.adapters.get(strategy.type);
      if (adapter) {
        css += `\n/* ${adapter.name} Compatibility */\n`;
        css += adapter.generateCompatibilityCSS();
      }
    }

    if (this.config.generateUtilities) {
      css += this.generateUtilityClasses();
    }

    return css;
  }

  /**
   * Wrap CSS selectors with namespace
   */
  wrapSelectors(css: string, namespace?: string): string {
    const ns = namespace || this.config.namespace;
    
    // Simple CSS selector wrapping (can be enhanced with proper CSS parser)
    return css.replace(/([^{}]+)\s*\{/g, (match, selector) => {
      const trimmedSelector = selector.trim();
      
      // Skip at-rules and comments
      if (trimmedSelector.startsWith('@') || trimmedSelector.startsWith('/*')) {
        return match;
      }
      
      // Wrap selector with namespace
      const wrappedSelector = `.${ns} ${trimmedSelector}`;
      return `${wrappedSelector} {`;
    });
  }

  /**
   * Generate CSS custom properties for theming
   */
  generateThemeProperties(): string {
    return `
:root {
  /* CMS Theme Properties */
  --cms-primary-color: #007bff;
  --cms-secondary-color: #6c757d;
  --cms-success-color: #28a745;
  --cms-danger-color: #dc3545;
  --cms-warning-color: #ffc107;
  --cms-info-color: #17a2b8;
  --cms-light-color: #f8f9fa;
  --cms-dark-color: #343a40;
  
  /* Typography */
  --cms-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --cms-font-size-base: 1rem;
  --cms-line-height-base: 1.5;
  
  /* Spacing */
  --cms-spacing-xs: 0.25rem;
  --cms-spacing-sm: 0.5rem;
  --cms-spacing-md: 1rem;
  --cms-spacing-lg: 1.5rem;
  --cms-spacing-xl: 3rem;
  
  /* Borders */
  --cms-border-width: 1px;
  --cms-border-color: #dee2e6;
  --cms-border-radius: 0.25rem;
  
  /* Shadows */
  --cms-shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  --cms-shadow-md: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  --cms-shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
}
`;
  }

  /**
   * Generate framework-specific prefixed utilities
   */
  generatePrefixedUtilities(framework: string): string {
    const adapter = this.adapters.get(framework);
    if (!adapter) {
      return '';
    }

    const utilities = adapter.extractUtilities();
    const prefix = this.config.prefix;
    
    return utilities
      .map(utility => `.${prefix}${utility}`)
      .join('\n');
  }

  /**
   * Create isolation wrapper styles
   */
  createIsolationWrapper(): string {
    const namespace = this.config.namespace;
    
    switch (this.config.isolationStrategy) {
      case 'wrapper':
        return `
.${namespace}-wrapper {
  isolation: isolate;
  position: relative;
  z-index: 1;
}

.${namespace}-wrapper * {
  box-sizing: border-box;
}
`;

      case 'reset':
        return `
.${namespace}-reset {
  all: initial;
  font-family: var(--cms-font-family);
  font-size: var(--cms-font-size-base);
  line-height: var(--cms-line-height-base);
  color: var(--cms-dark-color);
}

.${namespace}-reset * {
  all: unset;
  display: revert;
  box-sizing: border-box;
}
`;

      case 'custom-properties':
        return `
.${namespace}-themed {
  font-family: var(--cms-font-family);
  font-size: var(--cms-font-size-base);
  line-height: var(--cms-line-height-base);
  color: var(--cms-text-color, inherit);
}
`;

      case 'shadow-dom':
        return `
.${namespace}-shadow-host {
  display: block;
  isolation: isolate;
}

.${namespace}-shadow-host::part(content) {
  font-family: var(--cms-font-family);
  color: var(--cms-text-color);
}
`;

      default:
        return '';
    }
  }

  /**
   * Register custom framework adapter
   */
  registerAdapter(adapter: FrameworkAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get compatibility report for frameworks
   */
  getCompatibilityReport(cssStrategies: CSSStrategy[]): CompatibilityReport {
    const report: CompatibilityReport = {
      compatible: [],
      conflicts: [],
      recommendations: []
    };

    for (const strategy of cssStrategies) {
      const adapter = this.adapters.get(strategy.type);
      
      if (adapter) {
        report.compatible.push(strategy.type);
      } else {
        report.conflicts.push({
          framework: strategy.type,
          issue: 'No compatibility adapter available',
          severity: 'medium'
        });
      }
    }

    // Generate recommendations
    if (report.conflicts.length > 0) {
      report.recommendations.push('Consider implementing custom adapters for unsupported frameworks');
    }

    if (cssStrategies.length > 2) {
      report.recommendations.push('Multiple CSS frameworks detected - consider consolidating');
    }

    return report;
  }

  // Private methods

  private initializeAdapters(): void {
    this.adapters.set('tailwind', new TailwindAdapter());
    this.adapters.set('bootstrap', new BootstrapAdapter());
    this.adapters.set('css-modules', new CSSModulesAdapter());
    this.adapters.set('styled-components', new StyledComponentsAdapter());
    this.adapters.set('emotion', new EmotionAdapter());
    this.adapters.set('global-css', new GlobalCSSAdapter());
  }

  private generateBaseIsolation(): string {
    const namespace = this.config.namespace;
    
    return `
/* CMS Base Isolation Styles */
.${namespace}-isolated {
  /* Create new stacking context */
  isolation: isolate;
  position: relative;
  z-index: 1;
  
  /* Reset box model */
  box-sizing: border-box;
  
  /* Prevent style inheritance */
  all: initial;
  
  /* Restore essential properties */
  font-family: var(--cms-font-family, inherit);
  font-size: var(--cms-font-size-base, 1rem);
  line-height: var(--cms-line-height-base, 1.5);
  color: var(--cms-text-color, inherit);
}

.${namespace}-isolated *,
.${namespace}-isolated *::before,
.${namespace}-isolated *::after {
  box-sizing: border-box;
}

/* Preserve display values */
.${namespace}-isolated * {
  display: revert;
}

${this.generateThemeProperties()}
${this.createIsolationWrapper()}
`;
  }

  private generateUtilityClasses(): string {
    const namespace = this.config.namespace;
    
    return `
/* CMS Utility Classes */
.${namespace}-flex { display: flex !important; }
.${namespace}-grid { display: grid !important; }
.${namespace}-block { display: block !important; }
.${namespace}-inline { display: inline !important; }
.${namespace}-inline-block { display: inline-block !important; }
.${namespace}-hidden { display: none !important; }

.${namespace}-text-left { text-align: left !important; }
.${namespace}-text-center { text-align: center !important; }
.${namespace}-text-right { text-align: right !important; }

.${namespace}-m-0 { margin: 0 !important; }
.${namespace}-m-1 { margin: var(--cms-spacing-xs) !important; }
.${namespace}-m-2 { margin: var(--cms-spacing-sm) !important; }
.${namespace}-m-3 { margin: var(--cms-spacing-md) !important; }
.${namespace}-m-4 { margin: var(--cms-spacing-lg) !important; }

.${namespace}-p-0 { padding: 0 !important; }
.${namespace}-p-1 { padding: var(--cms-spacing-xs) !important; }
.${namespace}-p-2 { padding: var(--cms-spacing-sm) !important; }
.${namespace}-p-3 { padding: var(--cms-spacing-md) !important; }
.${namespace}-p-4 { padding: var(--cms-spacing-lg) !important; }
`;
  }
}

// Framework Adapters

class TailwindAdapter implements FrameworkAdapter {
  name = 'tailwind';
  type = 'utility' as const;

  generateCompatibilityCSS(): string {
    return `
/* Tailwind Compatibility */
.cms-isolated .tw-flex { display: flex; }
.cms-isolated .tw-grid { display: grid; }
.cms-isolated .tw-hidden { display: none; }
.cms-isolated .tw-block { display: block; }

/* Prevent Tailwind reset conflicts */
.cms-isolated {
  /* Override Tailwind's normalize */
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}
`;
  }

  wrapSelector(selector: string, namespace: string): string {
    return `.${namespace} .tw-${selector}`;
  }

  extractUtilities(): string[] {
    return ['flex', 'grid', 'hidden', 'block', 'inline', 'text-center', 'text-left', 'text-right'];
  }
}

class BootstrapAdapter implements FrameworkAdapter {
  name = 'bootstrap';
  type = 'component' as const;

  generateCompatibilityCSS(): string {
    return `
/* Bootstrap Compatibility */
.cms-isolated .container,
.cms-isolated .container-fluid {
  width: 100%;
  padding-right: 15px;
  padding-left: 15px;
  margin-right: auto;
  margin-left: auto;
}

.cms-isolated .row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -15px;
  margin-left: -15px;
}

.cms-isolated [class*="col-"] {
  position: relative;
  width: 100%;
  padding-right: 15px;
  padding-left: 15px;
}
`;
  }

  wrapSelector(selector: string, namespace: string): string {
    return `.${namespace} .${selector}`;
  }

  extractUtilities(): string[] {
    return ['container', 'row', 'col', 'd-flex', 'd-block', 'd-none', 'text-center'];
  }
}

class CSSModulesAdapter implements FrameworkAdapter {
  name = 'css-modules';
  type = 'component' as const;

  generateCompatibilityCSS(): string {
    return `
/* CSS Modules Compatibility */
.cms-isolated [class*="_"] {
  /* Preserve CSS Modules scoping */
  all: revert;
}
`;
  }

  wrapSelector(selector: string, namespace: string): string {
    return selector; // CSS Modules already scoped
  }

  extractUtilities(): string[] {
    return [];
  }
}

class StyledComponentsAdapter implements FrameworkAdapter {
  name = 'styled-components';
  type = 'css-in-js' as const;

  generateCompatibilityCSS(): string {
    return `
/* Styled Components Compatibility */
.cms-isolated [class*="sc-"] {
  /* Preserve styled-components styles */
  all: revert;
}
`;
  }

  wrapSelector(selector: string, namespace: string): string {
    return selector; // Styled-components handles scoping
  }

  extractUtilities(): string[] {
    return [];
  }
}

class EmotionAdapter implements FrameworkAdapter {
  name = 'emotion';
  type = 'css-in-js' as const;

  generateCompatibilityCSS(): string {
    return `
/* Emotion Compatibility */
.cms-isolated [class*="css-"] {
  /* Preserve Emotion styles */
  all: revert;
}
`;
  }

  wrapSelector(selector: string, namespace: string): string {
    return selector; // Emotion handles scoping
  }

  extractUtilities(): string[] {
    return [];
  }
}

class GlobalCSSAdapter implements FrameworkAdapter {
  name = 'global-css';
  type = 'component' as const;

  generateCompatibilityCSS(): string {
    return `
/* Global CSS Compatibility */
.cms-isolated {
  /* Reset global styles within CMS components */
  all: initial;
  font-family: inherit;
  line-height: inherit;
  color: inherit;
}

.cms-isolated * {
  /* Prevent global style inheritance */
  all: unset;
  display: revert;
  box-sizing: border-box;
}
`;
  }

  wrapSelector(selector: string, namespace: string): string {
    return `.${namespace} ${selector}`;
  }

  extractUtilities(): string[] {
    return [];
  }
}

// Types

export interface CompatibilityReport {
  compatible: string[];
  conflicts: CompatibilityConflict[];
  recommendations: string[];
}

export interface CompatibilityConflict {
  framework: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export default CSSCompatibilityLayer;