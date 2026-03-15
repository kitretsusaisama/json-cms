/**
 * CSS Isolation Manager
 * 
 * Provides CSS isolation and compatibility for CMS components
 */

import React from 'react';
import { CSSStrategy } from '../interfaces/scanner';

export interface CSSIsolationConfig {
  strategy: 'css-modules' | 'css-in-js' | 'namespace' | 'shadow-dom';
  namespace?: string;
  prefix?: string;
  wrapperClass?: string;
  isolateGlobals?: boolean;
}

export interface GlobalStyleInfo {
  file: string;
  selectors: string[];
  conflicts: string[];
  framework?: 'tailwind' | 'bootstrap' | 'custom';
}

export interface IsolationReport {
  isIsolated: boolean;
  conflicts: string[];
  recommendations: string[];
  appliedStrategy: string;
}

export interface CSSIsolationStrategy {
  detectGlobalStyles(projectPath: string): Promise<GlobalStyleInfo[]>;
  generateNamespacing(componentName: string): string;
  wrapComponent(component: React.ComponentType, namespace: string): React.ComponentType;
  validateIsolation(component: React.ComponentType): Promise<IsolationReport>;
}

export class CSSIsolationManager implements CSSIsolationStrategy {
  private config: CSSIsolationConfig;
  private cssStrategies: CSSStrategy[];

  constructor(config: CSSIsolationConfig, cssStrategies: CSSStrategy[] = []) {
    this.config = config;
    this.cssStrategies = cssStrategies;
  }

  /**
   * Detect global styles in the project
   */
  async detectGlobalStyles(projectPath: string): Promise<GlobalStyleInfo[]> {
    const { readFile, readdir, stat } = await import('fs/promises');
    const { join, extname } = await import('path');
    
    const globalStyles: GlobalStyleInfo[] = [];
    
    try {
      // Common global CSS locations
      const commonPaths = [
        'styles/globals.css',
        'src/app/globals.css',
        'pages/_app.css',
        'src/styles/globals.css',
        'public/styles/global.css'
      ];

      for (const path of commonPaths) {
        try {
          const fullPath = join(projectPath, path);
          await stat(fullPath);
          
          const content = await readFile(fullPath, 'utf-8');
          const styleInfo = await this.analyzeStyleFile(path, content);
          if (styleInfo) {
            globalStyles.push(styleInfo);
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Scan for additional CSS files
      const styleDirs = ['styles', 'src/styles', 'public/styles'];
      
      for (const dir of styleDirs) {
        try {
          const dirPath = join(projectPath, dir);
          const files = await readdir(dirPath);
          
          for (const file of files) {
            if (['.css', '.scss', '.sass'].includes(extname(file))) {
              const filePath = join(dirPath, file);
              const content = await readFile(filePath, 'utf-8');
              const styleInfo = await this.analyzeStyleFile(join(dir, file), content);
              if (styleInfo) {
                globalStyles.push(styleInfo);
              }
            }
          }
        } catch {
          // Directory doesn't exist, continue
        }
      }

    } catch (error) {
      console.warn('Error detecting global styles:', error);
    }

    return globalStyles;
  }

  /**
   * Generate namespace for component isolation
   */
  generateNamespacing(componentName: string): string {
    const baseNamespace = this.config.namespace || 'cms';
    const prefix = this.config.prefix || '';
    
    // Sanitize component name
    const sanitized = componentName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${prefix}${baseNamespace}-${sanitized}`;
  }

  /**
   * Wrap component with CSS isolation
   */
  wrapComponent(component: React.ComponentType<any>, namespace: string): React.ComponentType<any> {
    const WrappedComponent = React.forwardRef<any, any>((props, ref) => {
      const isolationProps = this.getIsolationProps(namespace);
      
      switch (this.config.strategy) {
        case 'namespace':
          return React.createElement(
            'div',
            {
              ...isolationProps,
              className: `${namespace} ${isolationProps.className || ''}`.trim()
            },
            React.createElement(component, { ...props, ref })
          );
          
        case 'css-in-js':
          return React.createElement(
            'div',
            {
              ...isolationProps,
              style: {
                ...this.getCSSInJSStyles(namespace),
                ...isolationProps.style
              }
            },
            React.createElement(component, { ...props, ref })
          );
          
        case 'shadow-dom':
          return React.createElement(ShadowDOMWrapper, {
            namespace,
            ...isolationProps
          }, React.createElement(component, { ...props, ref }));
          
        case 'css-modules':
        default:
          return React.createElement(
            'div',
            {
              ...isolationProps,
              className: `${this.config.wrapperClass || 'cms-component'} ${isolationProps.className || ''}`.trim(),
              'data-cms-namespace': namespace
            },
            React.createElement(component, { ...props, ref })
          );
      }
    });

    WrappedComponent.displayName = `CSSIsolated(${component.displayName || component.name || 'Component'})`;
    
    return WrappedComponent;
  }

  /**
   * Validate component isolation
   */
  async validateIsolation(component: React.ComponentType): Promise<IsolationReport> {
    const report: IsolationReport = {
      isIsolated: false,
      conflicts: [],
      recommendations: [],
      appliedStrategy: this.config.strategy
    };

    try {
      // Check if component has proper isolation wrapper
      const componentName = component.displayName || component.name || 'Unknown';
      
      if (componentName.startsWith('CSSIsolated(')) {
        report.isIsolated = true;
      } else {
        report.conflicts.push('Component is not wrapped with CSS isolation');
        report.recommendations.push('Wrap component using wrapComponent method');
      }

      // Check for potential global style conflicts
      const globalConflicts = await this.detectPotentialConflicts();
      report.conflicts.push(...globalConflicts);

      // Generate recommendations based on CSS strategies
      const strategyRecommendations = this.generateStrategyRecommendations();
      report.recommendations.push(...strategyRecommendations);

    } catch (error) {
      report.conflicts.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return report;
  }

  /**
   * Create compatibility layer for existing global styles
   */
  createCompatibilityLayer(globalStyles: GlobalStyleInfo[]): string {
    let compatibilityCSS = '';
    
    // Generate prefixed versions of global styles
    for (const styleInfo of globalStyles) {
      if (styleInfo.framework === 'tailwind') {
        compatibilityCSS += this.createTailwindCompatibility();
      } else if (styleInfo.framework === 'bootstrap') {
        compatibilityCSS += this.createBootstrapCompatibility();
      } else {
        compatibilityCSS += this.createCustomCompatibility(styleInfo);
      }
    }

    return compatibilityCSS;
  }

  /**
   * Generate CSS conflict resolution
   */
  generateConflictResolution(conflicts: string[]): string[] {
    const resolutions: string[] = [];

    for (const conflict of conflicts) {
      if (conflict.includes('Global reset styles')) {
        resolutions.push('Use CSS-in-JS or CSS Modules to scope component styles');
        resolutions.push('Add !important declarations sparingly for critical overrides');
      } else if (conflict.includes('Important declarations')) {
        resolutions.push('Increase CSS specificity instead of using !important');
        resolutions.push('Use CSS custom properties for dynamic styling');
      } else if (conflict.includes('Tailwind')) {
        resolutions.push('Use Tailwind prefix configuration to avoid conflicts');
        resolutions.push('Wrap CMS components in isolated containers');
      } else {
        resolutions.push('Use CSS namespacing to isolate component styles');
      }
    }

    return [...new Set(resolutions)]; // Remove duplicates
  }

  // Private helper methods

  private async analyzeStyleFile(filePath: string, content: string): Promise<GlobalStyleInfo | null> {
    const selectors = this.extractSelectors(content);
    const conflicts = this.detectStyleConflicts(content);
    const framework = this.detectFramework(content);

    if (selectors.length === 0) {
      return null;
    }

    return {
      file: filePath,
      selectors,
      conflicts,
      framework
    };
  }

  private extractSelectors(content: string): string[] {
    const selectors: string[] = [];
    
    // Simple CSS selector extraction (can be enhanced with proper CSS parser)
    const selectorRegex = /([^{}]+)\s*\{[^}]*\}/g;
    let match;
    
    while ((match = selectorRegex.exec(content)) !== null) {
      const selector = match[1].trim();
      if (selector && !selector.startsWith('@') && !selector.startsWith('/*')) {
        selectors.push(selector);
      }
    }
    
    return selectors;
  }

  private detectStyleConflicts(content: string): string[] {
    const conflicts: string[] = [];
    
    // Check for global resets
    if (content.includes('* {') || content.includes('*,') || content.includes('*, *::before, *::after')) {
      conflicts.push('Global reset styles detected');
    }
    
    // Check for important declarations
    if (content.includes('!important')) {
      conflicts.push('Important declarations may override component styles');
    }
    
    // Check for body/html styles
    if (content.includes('body {') || content.includes('html {')) {
      conflicts.push('Global body/html styles may affect components');
    }
    
    return conflicts;
  }

  private detectFramework(content: string): 'tailwind' | 'bootstrap' | 'custom' | undefined {
    if (content.includes('@tailwind') || content.includes('tailwindcss')) {
      return 'tailwind';
    }
    
    if (content.includes('bootstrap') || content.includes('.container') || content.includes('.row')) {
      return 'bootstrap';
    }
    
    return 'custom';
  }

  private getIsolationProps(namespace: string): Record<string, any> {
    return {
      'data-cms-component': true,
      'data-cms-namespace': namespace,
      className: this.config.wrapperClass || 'cms-isolated'
    };
  }

  private getCSSInJSStyles(namespace: string): React.CSSProperties {
    return {
      isolation: 'isolate',
      position: 'relative',
      zIndex: 1
    };
  }

  private async detectPotentialConflicts(): Promise<string[]> {
    const conflicts: string[] = [];
    
    // Check CSS strategies for potential conflicts
    const hasTailwind = this.cssStrategies.some(s => s.type === 'tailwind');
    const hasGlobalCSS = this.cssStrategies.some(s => s.type === 'global-css');
    const hasCSSInJS = this.cssStrategies.some(s => s.type === 'styled-components' || s.type === 'emotion');
    
    if (hasTailwind && hasGlobalCSS) {
      conflicts.push('Tailwind utility classes may conflict with global CSS');
    }
    
    if (hasCSSInJS && hasGlobalCSS) {
      conflicts.push('CSS-in-JS styles may be overridden by global CSS');
    }
    
    return conflicts;
  }

  private generateStrategyRecommendations(): string[] {
    const recommendations: string[] = [];
    
    switch (this.config.strategy) {
      case 'css-modules':
        recommendations.push('Use CSS Modules for component-scoped styles');
        recommendations.push('Avoid global selectors in module files');
        break;
        
      case 'css-in-js':
        recommendations.push('Use CSS-in-JS for dynamic styling');
        recommendations.push('Consider performance implications of runtime styles');
        break;
        
      case 'namespace':
        recommendations.push('Use consistent namespace prefixes');
        recommendations.push('Avoid deeply nested selectors');
        break;
        
      case 'shadow-dom':
        recommendations.push('Test browser compatibility for Shadow DOM');
        recommendations.push('Consider accessibility implications');
        break;
    }
    
    return recommendations;
  }

  private createTailwindCompatibility(): string {
    const namespace = this.config.namespace || 'cms';
    
    return `
/* Tailwind Compatibility Layer */
.${namespace}-isolated {
  /* Reset Tailwind base styles within CMS components */
  all: initial;
  font-family: inherit;
  line-height: inherit;
}

.${namespace}-isolated * {
  box-sizing: border-box;
}

/* Preserve useful Tailwind utilities */
.${namespace}-isolated .tw-flex { display: flex; }
.${namespace}-isolated .tw-grid { display: grid; }
.${namespace}-isolated .tw-hidden { display: none; }
`;
  }

  private createBootstrapCompatibility(): string {
    const namespace = this.config.namespace || 'cms';
    
    return `
/* Bootstrap Compatibility Layer */
.${namespace}-isolated {
  /* Reset Bootstrap base styles */
  font-size: initial;
  line-height: initial;
  color: initial;
}

.${namespace}-isolated .container,
.${namespace}-isolated .row,
.${namespace}-isolated [class*="col-"] {
  /* Prevent Bootstrap grid conflicts */
  all: revert;
}
`;
  }

  private createCustomCompatibility(styleInfo: GlobalStyleInfo): string {
    const namespace = this.config.namespace || 'cms';
    
    return `
/* Custom Compatibility Layer for ${styleInfo.file} */
.${namespace}-isolated {
  /* Isolate from global styles */
  all: initial;
  font-family: inherit;
}

/* Specific conflict resolutions */
${styleInfo.conflicts.map(conflict => `/* TODO: Resolve ${conflict} */`).join('\n')}
`;
  }
}

/**
 * Shadow DOM Wrapper Component
 */
const ShadowDOMWrapper = ({ 
  namespace, 
  children, 
  className, 
  style 
}: {
  namespace: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const shadowRootRef = React.useRef<ShadowRoot | null>(null);

  React.useEffect(() => {
    if (containerRef.current && !shadowRootRef.current) {
      try {
        shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
        
        // Add basic styles to shadow DOM
        const styleElement = document.createElement('style');
        styleElement.textContent = `
          :host {
            display: block;
            isolation: isolate;
          }
          
          * {
            box-sizing: border-box;
          }
        `;
        shadowRootRef.current.appendChild(styleElement);
      } catch (error) {
        console.warn('Shadow DOM not supported, falling back to regular DOM');
      }
    }
  }, []);

  // For Shadow DOM, we need to render differently
  // This is a simplified implementation - in practice, you'd use a library like react-shadow
  return React.createElement('div', {
    ref: containerRef,
    className,
    style,
    'data-cms-namespace': namespace,
    'data-cms-shadow-dom': 'true'
  }, React.createElement('div', {
    'data-cms-fallback': 'true'
  }, children));
};

export default CSSIsolationManager;