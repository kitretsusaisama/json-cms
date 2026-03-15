/**
 * CSS Isolation and Compatibility System
 * 
 * Main entry point for CSS isolation, conflict detection, and compatibility management
 */

export { default as CSSIsolationManager } from './isolation-manager';
export { default as CSSConflictDetector } from './conflict-detector';
export { default as CSSCompatibilityLayer } from './compatibility-layer';

export type {
  CSSIsolationConfig,
  GlobalStyleInfo,
  IsolationReport,
  CSSIsolationStrategy
} from './isolation-manager';

export type {
  CSSConflict,
  ConflictResolution,
  ConflictAnalysis,
  CompatibilityMatrix,
  CompatibilityLevel
} from './conflict-detector';

export type {
  CompatibilityConfig,
  FrameworkAdapter,
  CompatibilityReport,
  CompatibilityConflict
} from './compatibility-layer';

import CSSIsolationManager, { CSSIsolationConfig } from './isolation-manager';
import CSSConflictDetector from './conflict-detector';
import CSSCompatibilityLayer, { CompatibilityConfig } from './compatibility-layer';
import { CSSStrategy } from '../interfaces/scanner';

/**
 * Main CSS Manager that orchestrates all CSS isolation functionality
 */
export class CSSManager {
  private isolationManager: CSSIsolationManager;
  private conflictDetector: CSSConflictDetector;
  private compatibilityLayer: CSSCompatibilityLayer;

  constructor(
    isolationConfig: CSSIsolationConfig,
    compatibilityConfig: CompatibilityConfig,
    cssStrategies: CSSStrategy[] = []
  ) {
    this.isolationManager = new CSSIsolationManager(isolationConfig, cssStrategies);
    this.compatibilityLayer = new CSSCompatibilityLayer(compatibilityConfig);
    this.conflictDetector = new CSSConflictDetector(cssStrategies);
  }

  /**
   * Perform complete CSS analysis and setup
   */
  async setupCSSIsolation(projectPath: string) {
    // 1. Detect global styles
    const globalStyles = await this.isolationManager.detectGlobalStyles(projectPath);
    
    // 2. Analyze conflicts
    this.conflictDetector = new CSSConflictDetector([], globalStyles);
    const conflictAnalysis = await this.conflictDetector.analyzeConflicts();
    
    // 3. Generate compatibility CSS
    const compatibilityCSS = this.compatibilityLayer.generateCompatibilityCSS([]);
    
    // 4. Create isolation wrapper styles
    const isolationCSS = this.compatibilityLayer.createIsolationWrapper();
    
    return {
      globalStyles,
      conflictAnalysis,
      compatibilityCSS,
      isolationCSS,
      recommendations: this.generateSetupRecommendations(conflictAnalysis)
    };
  }

  /**
   * Wrap a React component with CSS isolation
   */
  wrapComponent(component: React.ComponentType, componentName: string) {
    const namespace = this.isolationManager.generateNamespacing(componentName);
    return this.isolationManager.wrapComponent(component, namespace);
  }

  /**
   * Generate CSS for project integration
   */
  async generateIntegrationCSS(projectPath: string, cssStrategies: CSSStrategy[]): Promise<string> {
    let css = '';
    
    // Add base isolation styles
    css += this.compatibilityLayer.createIsolationWrapper();
    css += '\n';
    
    // Add framework compatibility
    css += this.compatibilityLayer.generateCompatibilityCSS(cssStrategies);
    css += '\n';
    
    // Add theme properties
    css += this.compatibilityLayer.generateThemeProperties();
    css += '\n';
    
    // Detect and resolve conflicts
    const globalStyles = await this.isolationManager.detectGlobalStyles(projectPath);
    if (globalStyles.length > 0) {
      css += '/* Global Style Compatibility */\n';
      css += this.isolationManager.createCompatibilityLayer(globalStyles);
    }
    
    return css;
  }

  /**
   * Validate CSS isolation for a component
   */
  async validateComponent(component: React.ComponentType) {
    return await this.isolationManager.validateIsolation(component);
  }

  /**
   * Get conflict analysis report
   */
  async getConflictReport() {
    return await this.conflictDetector.analyzeConflicts();
  }

  /**
   * Generate auto-fix for conflicts
   */
  generateAutoFixes() {
    // This would generate auto-fix code for detected conflicts
    return {
      css: this.compatibilityLayer.createIsolationWrapper(),
      recommendations: [
        'Apply CSS isolation wrapper to CMS components',
        'Use CSS custom properties for theming',
        'Implement namespace prefixing for conflicting selectors'
      ]
    };
  }

  /**
   * Create CSS file for project integration
   */
  async createCSSFile(projectPath: string, cssStrategies: CSSStrategy[], outputPath?: string): Promise<string> {
    const css = await this.generateIntegrationCSS(projectPath, cssStrategies);
    
    const finalOutputPath = outputPath || 'src/styles/cms-isolation.css';
    
    // Write CSS file (in a real implementation, you'd use fs.writeFile)
    const header = `/**
 * CMS CSS Isolation and Compatibility Layer
 * 
 * Auto-generated CSS for CMS component isolation and framework compatibility.
 * This file should be imported in your main application CSS.
 * 
 * Generated on: ${new Date().toISOString()}
 */

`;
    
    const fullCSS = header + css;
    
    return fullCSS;
  }

  // Private helper methods

  private generateSetupRecommendations(conflictAnalysis: any): string[] {
    const recommendations: string[] = [];
    
    recommendations.push('Import the generated CSS isolation file in your main application');
    recommendations.push('Wrap CMS components with the CSS isolation manager');
    
    if (conflictAnalysis.riskScore > 50) {
      recommendations.push('High risk of CSS conflicts detected - consider framework consolidation');
    }
    
    if (conflictAnalysis.conflicts.length > 0) {
      recommendations.push('Review and resolve detected CSS conflicts before production deployment');
    }
    
    recommendations.push('Test CMS components in isolation to ensure proper styling');
    recommendations.push('Use CSS custom properties for consistent theming across components');
    
    return recommendations;
  }
}

/**
 * Factory function to create CSS Manager with default configuration
 */
export function createCSSManager(cssStrategies: CSSStrategy[] = []): CSSManager {
  const isolationConfig: CSSIsolationConfig = {
    strategy: 'namespace',
    namespace: 'cms',
    prefix: 'cms-',
    wrapperClass: 'cms-isolated',
    isolateGlobals: true
  };

  const compatibilityConfig: CompatibilityConfig = {
    namespace: 'cms',
    prefix: 'cms-',
    isolationStrategy: 'wrapper',
    preserveFrameworks: ['tailwind', 'bootstrap'],
    generateUtilities: true
  };

  return new CSSManager(isolationConfig, compatibilityConfig, cssStrategies);
}

/**
 * Utility function to detect CSS strategies in a project
 */
export async function detectCSSStrategies(projectPath: string): Promise<CSSStrategy[]> {
  const { CSSAnalyzer } = await import('../scanner/css-analyzer');
  const analyzer = new CSSAnalyzer();
  return await analyzer.analyzeCSS(projectPath);
}

/**
 * Quick setup function for CSS isolation
 */
export async function quickSetupCSSIsolation(projectPath: string) {
  const cssStrategies = await detectCSSStrategies(projectPath);
  const cssManager = createCSSManager(cssStrategies);
  
  const setup = await cssManager.setupCSSIsolation(projectPath);
  const cssFile = await cssManager.createCSSFile(projectPath, cssStrategies);
  
  return {
    ...setup,
    cssFile,
    cssManager
  };
}

export default CSSManager;