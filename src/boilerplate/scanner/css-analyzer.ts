/**
 * CSS Strategy Analyzer
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { CSSStrategy } from '../interfaces/scanner';
import { CSSConflictDetector, CSSIsolationManager } from '../css';

export class CSSAnalyzer {
  async analyzeCSS(projectPath: string): Promise<CSSStrategy[]> {
    const strategies: CSSStrategy[] = [];

    // Check for Tailwind CSS
    const tailwindStrategy = await this.detectTailwind(projectPath);
    if (tailwindStrategy) strategies.push(tailwindStrategy);

    // Check for styled-components
    const styledComponentsStrategy = await this.detectStyledComponents(projectPath);
    if (styledComponentsStrategy) strategies.push(styledComponentsStrategy);

    // Check for Emotion
    const emotionStrategy = await this.detectEmotion(projectPath);
    if (emotionStrategy) strategies.push(emotionStrategy);

    // Check for CSS Modules
    const cssModulesStrategy = await this.detectCSSModules(projectPath);
    if (cssModulesStrategy) strategies.push(cssModulesStrategy);

    // Check for global CSS
    const globalCSSStrategy = await this.detectGlobalCSS(projectPath);
    if (globalCSSStrategy) strategies.push(globalCSSStrategy);

    // Check for Sass/SCSS
    const sassStrategy = await this.detectSass(projectPath);
    if (sassStrategy) strategies.push(sassStrategy);

    return strategies;
  }

  async detectGlobalStyles(projectPath: string): Promise<string[]> {
    const globalFiles: string[] = [];
    
    try {
      // Check common global CSS locations
      const commonPaths = [
        'styles/globals.css',
        'src/app/globals.css',
        'pages/_app.css',
        'src/styles/globals.css',
        'public/styles/global.css'
      ];

      for (const path of commonPaths) {
        try {
          await stat(join(projectPath, path));
          globalFiles.push(path);
        } catch {
          // File doesn't exist, continue
        }
      }

      // Scan for CSS files in common directories
      const styleDirs = ['styles', 'src/styles', 'public/styles'];
      
      for (const dir of styleDirs) {
        try {
          const files = await this.scanCSSFiles(join(projectPath, dir));
          globalFiles.push(...files.map(f => join(dir, f)));
        } catch {
          // Directory doesn't exist, continue
        }
      }

    } catch (error) {
      // Ignore errors and return what we found
    }

    return globalFiles;
  }

  async findConflicts(strategies: CSSStrategy[]): Promise<string[]> {
    const conflicts: string[] = [];

    // Check for multiple CSS-in-JS solutions
    const cssInJSStrategies = strategies.filter(s => 
      ['styled-components', 'emotion'].includes(s.type)
    );
    
    if (cssInJSStrategies.length > 1) {
      conflicts.push(`Multiple CSS-in-JS solutions detected: ${cssInJSStrategies.map(s => s.type).join(', ')}`);
    }

    // Check for Tailwind + CSS Modules conflicts
    const hasTailwind = strategies.some(s => s.type === 'tailwind');
    const hasCSSModules = strategies.some(s => s.type === 'css-modules');
    
    if (hasTailwind && hasCSSModules) {
      conflicts.push('Tailwind CSS and CSS Modules can conflict with class naming');
    }

    // Check for global CSS conflicts
    const globalCSS = strategies.find(s => s.type === 'global-css');
    if (globalCSS && globalCSS.conflicts.length > 0) {
      conflicts.push(...globalCSS.conflicts);
    }

    return conflicts;
  }

  generateNamespacing(componentName: string): string {
    return `cms-${componentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  /**
   * Enhanced conflict detection using the new conflict detector
   */
  async findConflictsEnhanced(strategies: CSSStrategy[]): Promise<string[]> {
    try {
      const globalStyles = await this.detectGlobalStyles('.');
      const conflictDetector = new CSSConflictDetector(strategies, globalStyles.map(file => ({
        file,
        selectors: [],
        conflicts: [],
        framework: 'custom' as const
      })));
      
      const analysis = await conflictDetector.analyzeConflicts();
      return analysis.conflicts.map(c => c.description);
    } catch (error) {
      console.warn('Enhanced conflict detection failed, falling back to basic detection');
      return this.findConflicts(strategies);
    }
  }

  /**
   * Generate CSS isolation recommendations
   */
  generateIsolationRecommendations(strategies: CSSStrategy[]): string[] {
    const recommendations: string[] = [];
    
    const hasMultipleFrameworks = strategies.length > 1;
    const hasGlobalCSS = strategies.some(s => s.type === 'global-css');
    const hasTailwind = strategies.some(s => s.type === 'tailwind');
    const hasCSSInJS = strategies.some(s => ['styled-components', 'emotion'].includes(s.type));
    
    if (hasMultipleFrameworks) {
      recommendations.push('Use CSS isolation to prevent framework conflicts');
    }
    
    if (hasGlobalCSS) {
      recommendations.push('Implement CSS namespacing for global styles');
      recommendations.push('Use CSS custom properties for consistent theming');
    }
    
    if (hasTailwind) {
      recommendations.push('Configure Tailwind prefix to avoid utility class conflicts');
    }
    
    if (hasCSSInJS) {
      recommendations.push('Ensure CSS-in-JS styles are properly scoped');
    }
    
    recommendations.push('Wrap CMS components with isolation containers');
    recommendations.push('Test component styles in isolation');
    
    return recommendations;
  }

  // Private methods for detecting specific CSS strategies

  private async detectTailwind(projectPath: string): Promise<CSSStrategy | null> {
    try {
      // Check for Tailwind config
      const configFiles = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'];
      let configFile: string | undefined;

      for (const file of configFiles) {
        try {
          await stat(join(projectPath, file));
          configFile = file;
          break;
        } catch {
          // Continue checking
        }
      }

      // Check package.json for Tailwind dependency
      const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
      const hasTailwind = packageJson.dependencies?.tailwindcss || packageJson.devDependencies?.tailwindcss;

      if (hasTailwind || configFile) {
        return {
          type: 'tailwind',
          configFile,
          globalFiles: await this.findTailwindFiles(projectPath),
          conflicts: []
        };
      }
    } catch {
      // Tailwind not detected
    }

    return null;
  }

  private async detectStyledComponents(projectPath: string): Promise<CSSStrategy | null> {
    try {
      const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
      const hasStyledComponents = packageJson.dependencies?.['styled-components'] || 
                                 packageJson.devDependencies?.['styled-components'];

      if (hasStyledComponents) {
        return {
          type: 'styled-components',
          globalFiles: [],
          conflicts: []
        };
      }
    } catch {
      // styled-components not detected
    }

    return null;
  }

  private async detectEmotion(projectPath: string): Promise<CSSStrategy | null> {
    try {
      const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
      const hasEmotion = packageJson.dependencies?.['@emotion/react'] || 
                        packageJson.devDependencies?.['@emotion/react'] ||
                        packageJson.dependencies?.['@emotion/styled'] || 
                        packageJson.devDependencies?.['@emotion/styled'];

      if (hasEmotion) {
        return {
          type: 'emotion',
          globalFiles: [],
          conflicts: []
        };
      }
    } catch {
      // Emotion not detected
    }

    return null;
  }

  private async detectCSSModules(projectPath: string): Promise<CSSStrategy | null> {
    try {
      // Look for .module.css files
      const moduleFiles = await this.findCSSModuleFiles(projectPath);
      
      if (moduleFiles.length > 0) {
        return {
          type: 'css-modules',
          globalFiles: moduleFiles,
          conflicts: []
        };
      }
    } catch {
      // CSS Modules not detected
    }

    return null;
  }

  private async detectGlobalCSS(projectPath: string): Promise<CSSStrategy | null> {
    try {
      const globalFiles = await this.detectGlobalStyles(projectPath);
      
      if (globalFiles.length > 0) {
        return {
          type: 'global-css',
          globalFiles,
          conflicts: await this.analyzeGlobalCSSConflicts(projectPath, globalFiles)
        };
      }
    } catch {
      // Global CSS not detected
    }

    return null;
  }

  private async detectSass(projectPath: string): Promise<CSSStrategy | null> {
    try {
      const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
      const hasSass = packageJson.dependencies?.sass || packageJson.devDependencies?.sass;

      if (hasSass) {
        const sassFiles = await this.findSassFiles(projectPath);
        return {
          type: 'sass',
          globalFiles: sassFiles,
          conflicts: []
        };
      }
    } catch {
      // Sass not detected
    }

    return null;
  }

  private async findTailwindFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    // Common Tailwind CSS import locations
    const commonFiles = [
      'src/app/globals.css',
      'styles/globals.css',
      'src/styles/tailwind.css'
    ];

    for (const file of commonFiles) {
      try {
        const content = await readFile(join(projectPath, file), 'utf-8');
        if (content.includes('@tailwind') || content.includes('tailwindcss')) {
          files.push(file);
        }
      } catch {
        // File doesn't exist or can't be read
      }
    }

    return files;
  }

  private async findCSSModuleFiles(projectPath: string): Promise<string[]> {
    const moduleFiles: string[] = [];
    
    try {
      await this.scanDirectoryForPattern(projectPath, /\.module\.(css|scss|sass)$/, moduleFiles);
    } catch {
      // Error scanning directory
    }

    return moduleFiles;
  }

  private async findSassFiles(projectPath: string): Promise<string[]> {
    const sassFiles: string[] = [];
    
    try {
      await this.scanDirectoryForPattern(projectPath, /\.(scss|sass)$/, sassFiles);
    } catch {
      // Error scanning directory
    }

    return sassFiles;
  }

  private async scanCSSFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await readdir(dirPath);
      return files.filter(file => ['.css', '.scss', '.sass'].includes(extname(file)));
    } catch {
      return [];
    }
  }

  private async scanDirectoryForPattern(
    dirPath: string, 
    pattern: RegExp, 
    results: string[], 
    currentPath = ''
  ): Promise<void> {
    try {
      const items = await readdir(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const relativePath = join(currentPath, item);
        
        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            await this.scanDirectoryForPattern(fullPath, pattern, results, relativePath);
          } else if (stats.isFile() && pattern.test(item)) {
            results.push(relativePath);
          }
        } catch {
          // Skip items that can't be accessed
        }
      }
    } catch {
      // Directory can't be read
    }
  }

  private async analyzeGlobalCSSConflicts(projectPath: string, globalFiles: string[]): Promise<string[]> {
    const conflicts: string[] = [];
    
    for (const file of globalFiles) {
      try {
        const content = await readFile(join(projectPath, file), 'utf-8');
        
        // Check for potential conflicts
        if (content.includes('* {') || content.includes('html {') || content.includes('body {')) {
          conflicts.push(`Global reset styles in ${file} may conflict with component styles`);
        }
        
        if (content.includes('!important')) {
          conflicts.push(`Important declarations in ${file} may override component styles`);
        }
      } catch {
        // Can't read file
      }
    }
    
    return conflicts;
  }
}