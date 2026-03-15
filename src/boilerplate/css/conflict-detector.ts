/**
 * CSS Conflict Detector and Resolution Tool
 * 
 * Detects and provides solutions for CSS conflicts in CMS integration
 */

import { CSSStrategy } from '../interfaces/scanner';
import { GlobalStyleInfo } from './isolation-manager';

export interface CSSConflict {
  type: 'selector' | 'specificity' | 'cascade' | 'framework' | 'global-reset';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSelectors: string[];
  sourceFiles: string[];
  resolution: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'namespace' | 'specificity' | 'isolation' | 'refactor' | 'override';
  steps: string[];
  code?: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  autoFixable: boolean;
}

export interface ConflictAnalysis {
  conflicts: CSSConflict[];
  riskScore: number; // 0-100
  recommendations: string[];
  compatibilityMatrix: CompatibilityMatrix;
}

export interface CompatibilityMatrix {
  tailwind: CompatibilityLevel;
  bootstrap: CompatibilityLevel;
  cssModules: CompatibilityLevel;
  styledComponents: CompatibilityLevel;
  emotion: CompatibilityLevel;
  globalCSS: CompatibilityLevel;
}

export type CompatibilityLevel = 'compatible' | 'minor-conflicts' | 'major-conflicts' | 'incompatible';

export class CSSConflictDetector {
  private cssStrategies: CSSStrategy[];
  private globalStyles: GlobalStyleInfo[];

  constructor(cssStrategies: CSSStrategy[], globalStyles: GlobalStyleInfo[] = []) {
    this.cssStrategies = cssStrategies;
    this.globalStyles = globalStyles;
  }

  /**
   * Analyze CSS conflicts in the project
   */
  async analyzeConflicts(): Promise<ConflictAnalysis> {
    const conflicts: CSSConflict[] = [];

    // Detect framework conflicts
    conflicts.push(...await this.detectFrameworkConflicts());

    // Detect global style conflicts
    conflicts.push(...await this.detectGlobalStyleConflicts());

    // Detect specificity conflicts
    conflicts.push(...await this.detectSpecificityConflicts());

    // Detect cascade conflicts
    conflicts.push(...await this.detectCascadeConflicts());

    // Calculate risk score
    const riskScore = this.calculateRiskScore(conflicts);

    // Generate recommendations
    const recommendations = this.generateRecommendations(conflicts);

    // Build compatibility matrix
    const compatibilityMatrix = this.buildCompatibilityMatrix();

    return {
      conflicts,
      riskScore,
      recommendations,
      compatibilityMatrix
    };
  }

  /**
   * Detect conflicts between CSS frameworks
   */
  private async detectFrameworkConflicts(): Promise<CSSConflict[]> {
    const conflicts: CSSConflict[] = [];

    const frameworks = this.cssStrategies.map(s => s.type);
    
    // Multiple CSS-in-JS solutions
    const cssInJSFrameworks = frameworks.filter(f => ['styled-components', 'emotion'].includes(f));
    if (cssInJSFrameworks.length > 1) {
      conflicts.push({
        type: 'framework',
        severity: 'high',
        description: `Multiple CSS-in-JS solutions detected: ${cssInJSFrameworks.join(', ')}`,
        affectedSelectors: [],
        sourceFiles: this.getFrameworkFiles(cssInJSFrameworks),
        resolution: {
          strategy: 'refactor',
          steps: [
            'Choose one CSS-in-JS solution as primary',
            'Migrate components to use consistent styling approach',
            'Remove unused CSS-in-JS dependencies'
          ],
          estimatedEffort: 'high',
          autoFixable: false
        }
      });
    }

    // Tailwind + CSS Modules conflicts
    if (frameworks.includes('tailwind') && frameworks.includes('css-modules')) {
      conflicts.push({
        type: 'framework',
        severity: 'medium',
        description: 'Tailwind CSS and CSS Modules can conflict with class naming conventions',
        affectedSelectors: ['utility classes', 'module classes'],
        sourceFiles: this.getFrameworkFiles(['tailwind', 'css-modules']),
        resolution: {
          strategy: 'namespace',
          steps: [
            'Configure Tailwind with prefix option',
            'Use CSS Modules for component-specific styles',
            'Avoid Tailwind utilities in CSS Module files'
          ],
          code: `// tailwind.config.js
module.exports = {
  prefix: 'tw-',
  // ... other config
}`,
          estimatedEffort: 'medium',
          autoFixable: true
        }
      });
    }

    // Bootstrap + Tailwind conflicts
    if (frameworks.includes('tailwind') && this.hasBootstrap()) {
      conflicts.push({
        type: 'framework',
        severity: 'high',
        description: 'Bootstrap and Tailwind CSS have conflicting utility classes and reset styles',
        affectedSelectors: ['.container', '.row', '.col-*', 'utility classes'],
        sourceFiles: this.getBootstrapFiles(),
        resolution: {
          strategy: 'isolation',
          steps: [
            'Use Tailwind prefix to avoid Bootstrap conflicts',
            'Isolate Bootstrap components in separate containers',
            'Consider migrating from Bootstrap to Tailwind utilities'
          ],
          code: `// Use prefixed Tailwind classes
<div className="tw-flex tw-items-center">
  {/* Tailwind utilities */}
</div>

<div className="bootstrap-container">
  {/* Bootstrap components */}
</div>`,
          estimatedEffort: 'high',
          autoFixable: false
        }
      });
    }

    return conflicts;
  }

  /**
   * Detect global style conflicts
   */
  private async detectGlobalStyleConflicts(): Promise<CSSConflict[]> {
    const conflicts: CSSConflict[] = [];

    for (const styleInfo of this.globalStyles) {
      // Global reset conflicts
      const resetSelectors = styleInfo.selectors.filter(s => 
        s.includes('*') || s.includes('html') || s.includes('body')
      );

      if (resetSelectors.length > 0) {
        conflicts.push({
          type: 'global-reset',
          severity: 'high',
          description: `Global reset styles in ${styleInfo.file} may override component styles`,
          affectedSelectors: resetSelectors,
          sourceFiles: [styleInfo.file],
          resolution: {
            strategy: 'isolation',
            steps: [
              'Scope global resets to specific containers',
              'Use CSS custom properties for consistent theming',
              'Implement CSS isolation for CMS components'
            ],
            code: `/* Instead of global reset */
* { margin: 0; padding: 0; }

/* Use scoped reset */
.app-container * { margin: 0; padding: 0; }

/* Preserve CMS component styles */
.cms-isolated { all: initial; }`,
            estimatedEffort: 'medium',
            autoFixable: true
          }
        });
      }

      // Important declaration conflicts
      if (styleInfo.conflicts.some(c => c.includes('Important declarations'))) {
        conflicts.push({
          type: 'specificity',
          severity: 'medium',
          description: `Excessive use of !important in ${styleInfo.file} may override component styles`,
          affectedSelectors: this.extractImportantSelectors(styleInfo.file),
          sourceFiles: [styleInfo.file],
          resolution: {
            strategy: 'specificity',
            steps: [
              'Increase CSS specificity instead of using !important',
              'Refactor styles to use proper cascade order',
              'Use CSS custom properties for dynamic values'
            ],
            code: `/* Instead of !important */
.button { color: red !important; }

/* Use higher specificity */
.app .button { color: red; }

/* Or use CSS custom properties */
.button { color: var(--button-color, red); }`,
            estimatedEffort: 'medium',
            autoFixable: false
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect CSS specificity conflicts
   */
  private async detectSpecificityConflicts(): Promise<CSSConflict[]> {
    const conflicts: CSSConflict[] = [];

    // Check for overly specific selectors
    for (const styleInfo of this.globalStyles) {
      const highSpecificitySelectors = styleInfo.selectors.filter(selector => 
        this.calculateSpecificity(selector) > 100 // Arbitrary threshold
      );

      if (highSpecificitySelectors.length > 0) {
        conflicts.push({
          type: 'specificity',
          severity: 'medium',
          description: `High specificity selectors in ${styleInfo.file} may be difficult to override`,
          affectedSelectors: highSpecificitySelectors,
          sourceFiles: [styleInfo.file],
          resolution: {
            strategy: 'refactor',
            steps: [
              'Reduce selector specificity by using classes instead of IDs',
              'Avoid deeply nested selectors',
              'Use CSS custom properties for theming'
            ],
            estimatedEffort: 'medium',
            autoFixable: false
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect CSS cascade conflicts
   */
  private async detectCascadeConflicts(): Promise<CSSConflict[]> {
    const conflicts: CSSConflict[] = [];

    // Check for conflicting property declarations
    const propertyConflicts = this.findPropertyConflicts();
    
    if (propertyConflicts.length > 0) {
      conflicts.push({
        type: 'cascade',
        severity: 'low',
        description: 'Multiple stylesheets define conflicting properties for the same selectors',
        affectedSelectors: propertyConflicts,
        sourceFiles: this.globalStyles.map(s => s.file),
        resolution: {
          strategy: 'namespace',
          steps: [
            'Use CSS namespacing to scope conflicting styles',
            'Implement CSS-in-JS for component-specific styles',
            'Use CSS custom properties for consistent theming'
          ],
          estimatedEffort: 'low',
          autoFixable: true
        }
      });
    }

    return conflicts;
  }

  /**
   * Calculate risk score based on conflicts
   */
  private calculateRiskScore(conflicts: CSSConflict[]): number {
    let score = 0;
    
    for (const conflict of conflicts) {
      switch (conflict.severity) {
        case 'critical':
          score += 25;
          break;
        case 'high':
          score += 15;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
          score += 5;
          break;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Generate recommendations based on conflicts
   */
  private generateRecommendations(conflicts: CSSConflict[]): string[] {
    const recommendations: string[] = [];

    // Framework-specific recommendations
    if (conflicts.some(c => c.type === 'framework')) {
      recommendations.push('Consider standardizing on a single CSS framework or methodology');
      recommendations.push('Use CSS isolation techniques to prevent framework conflicts');
    }

    // Global style recommendations
    if (conflicts.some(c => c.type === 'global-reset')) {
      recommendations.push('Implement CSS isolation for CMS components');
      recommendations.push('Scope global resets to specific containers');
    }

    // Specificity recommendations
    if (conflicts.some(c => c.type === 'specificity')) {
      recommendations.push('Reduce CSS specificity by avoiding deeply nested selectors');
      recommendations.push('Use CSS custom properties for consistent theming');
    }

    // General recommendations
    recommendations.push('Use CSS Modules or CSS-in-JS for component-scoped styles');
    recommendations.push('Implement a CSS naming convention (BEM, SMACSS, etc.)');
    recommendations.push('Use PostCSS plugins for automatic prefixing and optimization');

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Build compatibility matrix
   */
  private buildCompatibilityMatrix(): CompatibilityMatrix {
    const frameworks = this.cssStrategies.map(s => s.type);
    
    return {
      tailwind: this.assessCompatibility('tailwind', frameworks),
      bootstrap: this.assessCompatibility('bootstrap', frameworks),
      cssModules: this.assessCompatibility('css-modules', frameworks),
      styledComponents: this.assessCompatibility('styled-components', frameworks),
      emotion: this.assessCompatibility('emotion', frameworks),
      globalCSS: this.assessCompatibility('global-css', frameworks)
    };
  }

  /**
   * Assess compatibility level for a specific framework
   */
  private assessCompatibility(framework: string, existingFrameworks: string[]): CompatibilityLevel {
    // Define compatibility rules
    const incompatibleCombinations = [
      ['styled-components', 'emotion'], // Multiple CSS-in-JS
    ];

    const majorConflictCombinations = [
      ['tailwind', 'bootstrap'], // Utility class conflicts
    ];

    const minorConflictCombinations = [
      ['tailwind', 'css-modules'], // Naming convention conflicts
      ['global-css', 'css-modules'], // Scope conflicts
    ];

    if (!existingFrameworks.includes(framework)) {
      return 'compatible';
    }

    // Check for incompatible combinations
    for (const combo of incompatibleCombinations) {
      if (combo.includes(framework) && combo.some(f => existingFrameworks.includes(f) && f !== framework)) {
        return 'incompatible';
      }
    }

    // Check for major conflicts
    for (const combo of majorConflictCombinations) {
      if (combo.includes(framework) && combo.some(f => existingFrameworks.includes(f) && f !== framework)) {
        return 'major-conflicts';
      }
    }

    // Check for minor conflicts
    for (const combo of minorConflictCombinations) {
      if (combo.includes(framework) && combo.some(f => existingFrameworks.includes(f) && f !== framework)) {
        return 'minor-conflicts';
      }
    }

    return 'compatible';
  }

  // Helper methods

  private getFrameworkFiles(frameworks: string[]): string[] {
    return this.cssStrategies
      .filter(s => frameworks.includes(s.type))
      .flatMap(s => s.globalFiles);
  }

  private hasBootstrap(): boolean {
    return this.globalStyles.some(s => s.framework === 'bootstrap');
  }

  private getBootstrapFiles(): string[] {
    return this.globalStyles
      .filter(s => s.framework === 'bootstrap')
      .map(s => s.file);
  }

  private extractImportantSelectors(filePath: string): string[] {
    // This would need to parse the actual CSS file to extract selectors with !important
    // For now, return a placeholder
    return ['selectors with !important'];
  }

  private calculateSpecificity(selector: string): number {
    // Simplified specificity calculation
    // Real implementation would need proper CSS selector parsing
    let specificity = 0;
    
    // Count IDs
    specificity += (selector.match(/#/g) || []).length * 100;
    
    // Count classes, attributes, pseudo-classes
    specificity += (selector.match(/\.|:|\[/g) || []).length * 10;
    
    // Count elements
    specificity += (selector.match(/\b[a-z]+\b/g) || []).length;
    
    return specificity;
  }

  private findPropertyConflicts(): string[] {
    // This would analyze actual CSS content to find conflicting property declarations
    // For now, return common conflict patterns
    return [
      'body { font-family: ... }',
      '* { box-sizing: ... }',
      'a { color: ... }'
    ];
  }

  /**
   * Generate auto-fix code for resolvable conflicts
   */
  generateAutoFix(conflict: CSSConflict): string | null {
    if (!conflict.resolution.autoFixable) {
      return null;
    }

    switch (conflict.resolution.strategy) {
      case 'namespace':
        return this.generateNamespaceFix(conflict);
      case 'isolation':
        return this.generateIsolationFix(conflict);
      case 'specificity':
        return this.generateSpecificityFix(conflict);
      default:
        return null;
    }
  }

  private generateNamespaceFix(conflict: CSSConflict): string {
    return `
/* Auto-generated namespace fix for ${conflict.description} */
.cms-isolated {
  /* Isolate CMS components from global styles */
  all: initial;
  font-family: inherit;
  line-height: inherit;
}

.cms-isolated * {
  box-sizing: border-box;
}
`;
  }

  private generateIsolationFix(conflict: CSSConflict): string {
    return `
/* Auto-generated isolation fix for ${conflict.description} */
.cms-component-wrapper {
  isolation: isolate;
  position: relative;
  z-index: 1;
}

.cms-component-wrapper * {
  all: revert;
}
`;
  }

  private generateSpecificityFix(conflict: CSSConflict): string {
    return `
/* Auto-generated specificity fix for ${conflict.description} */
/* Use CSS custom properties instead of !important */
:root {
  --cms-primary-color: #007bff;
  --cms-text-color: #333;
  --cms-background-color: #fff;
}

.cms-component {
  color: var(--cms-text-color);
  background-color: var(--cms-background-color);
}
`;
  }
}

export default CSSConflictDetector;