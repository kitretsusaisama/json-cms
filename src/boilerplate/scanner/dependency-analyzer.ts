/**
 * Dependency Analyzer
 */

import { readFile } from 'fs/promises';
import { DependencyInfo, Recommendation } from '../interfaces/scanner';

export class DependencyAnalyzer {
  // Known incompatible packages with the CMS boilerplate
  private readonly incompatiblePackages = new Set([
    // Old versions that might cause issues
    'react@<16.8.0',
    'next@<13.0.0',
    'typescript@<4.0.0'
  ]);

  // Packages that might conflict with CMS functionality
  private readonly conflictingPackages = new Map([
    ['gatsby', 'Gatsby conflicts with Next.js'],
    ['create-react-app', 'CRA conflicts with Next.js'],
    ['nuxt', 'Nuxt.js conflicts with Next.js'],
    ['vue', 'Vue.js conflicts with React-based CMS'],
    ['angular', 'Angular conflicts with React-based CMS']
  ]);

  // Recommended versions for optimal compatibility
  private readonly recommendedVersions = new Map([
    ['next', '>=15.0.0'],
    ['react', '>=18.0.0'],
    ['react-dom', '>=18.0.0'],
    ['typescript', '>=5.0.0'],
    ['tailwindcss', '>=3.0.0'],
    ['zod', '>=3.20.0']
  ]);

  async analyzeDependencies(packageJsonPath: string): Promise<DependencyInfo[]> {
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      const dependencies: DependencyInfo[] = [];

      // Analyze regular dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies.push(await this.analyzeDependency(name, version as string, 'dependency'));
        }
      }

      // Analyze dev dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies.push(await this.analyzeDependency(name, version as string, 'devDependency'));
        }
      }

      // Analyze peer dependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          dependencies.push(await this.analyzeDependency(name, version as string, 'peerDependency'));
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(`Failed to analyze dependencies: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async checkCompatibility(dependencies: DependencyInfo[]): Promise<DependencyInfo[]> {
    return dependencies.map(dep => {
      const conflicts: string[] = [];
      const recommendations: string[] = [];

      // Check for known incompatible packages
      const incompatiblePattern = `${dep.name}@<`;
      for (const incompatible of this.incompatiblePackages) {
        if (incompatible.startsWith(incompatiblePattern)) {
          const minVersion = incompatible.split('<')[1];
          if (this.compareVersions(dep.version, minVersion) < 0) {
            conflicts.push(`Version ${dep.version} is below minimum required ${minVersion}`);
            dep.isCompatible = false;
          }
        }
      }

      // Check for conflicting packages
      if (this.conflictingPackages.has(dep.name)) {
        conflicts.push(this.conflictingPackages.get(dep.name)!);
        dep.isCompatible = false;
      }

      // Check for recommended versions
      if (this.recommendedVersions.has(dep.name)) {
        const recommended = this.recommendedVersions.get(dep.name)!;
        const minVersion = recommended.replace('>=', '');
        if (this.compareVersions(dep.version, minVersion) < 0) {
          recommendations.push(`Consider upgrading to ${recommended} for better compatibility`);
        }
      }

      return {
        ...dep,
        conflicts: conflicts.length > 0 ? conflicts : dep.conflicts,
        recommendations: recommendations.length > 0 ? recommendations : dep.recommendations
      };
    });
  }

  async findConflicts(dependencies: DependencyInfo[]): Promise<string[]> {
    const conflicts: string[] = [];

    // Check for version conflicts
    const packageVersions = new Map<string, string[]>();
    
    dependencies.forEach(dep => {
      if (!packageVersions.has(dep.name)) {
        packageVersions.set(dep.name, []);
      }
      packageVersions.get(dep.name)!.push(dep.version);
    });

    // Find packages with multiple versions
    for (const [name, versions] of packageVersions) {
      const uniqueVersions = [...new Set(versions)];
      if (uniqueVersions.length > 1) {
        conflicts.push(`Multiple versions of ${name}: ${uniqueVersions.join(', ')}`);
      }
    }

    // Check for React version conflicts
    const reactDep = dependencies.find(d => d.name === 'react');
    const reactDomDep = dependencies.find(d => d.name === 'react-dom');
    
    if (reactDep && reactDomDep && reactDep.version !== reactDomDep.version) {
      conflicts.push(`React version mismatch: react@${reactDep.version} vs react-dom@${reactDomDep.version}`);
    }

    // Check for Next.js compatibility
    const nextDep = dependencies.find(d => d.name === 'next');
    if (nextDep && this.compareVersions(nextDep.version, '13.0.0') < 0) {
      conflicts.push(`Next.js version ${nextDep.version} is not supported. Minimum version is 13.0.0`);
    }

    // Check for TypeScript compatibility
    const tsDep = dependencies.find(d => d.name === 'typescript');
    if (tsDep && this.compareVersions(tsDep.version, '4.0.0') < 0) {
      conflicts.push(`TypeScript version ${tsDep.version} may cause compatibility issues`);
    }

    return conflicts;
  }

  async suggestUpgrades(dependencies: DependencyInfo[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for outdated Next.js
    const nextDep = dependencies.find(d => d.name === 'next');
    if (nextDep && this.compareVersions(nextDep.version, '15.0.0') < 0) {
      recommendations.push({
        type: 'upgrade',
        priority: 'high',
        title: 'Upgrade Next.js',
        description: `Next.js ${nextDep.version} is outdated. Upgrade to latest version for better performance and features.`,
        steps: [
          'Update package.json: "next": "^15.0.0"',
          'Run npm install or yarn install',
          'Update any deprecated API usage',
          'Test the application thoroughly'
        ],
        estimatedTime: '2-4 hours',
        benefits: ['Better performance', 'Latest features', 'Security updates', 'Better CMS compatibility']
      });
    }

    // Check for outdated React
    const reactDep = dependencies.find(d => d.name === 'react');
    if (reactDep && this.compareVersions(reactDep.version, '18.0.0') < 0) {
      recommendations.push({
        type: 'upgrade',
        priority: 'high',
        title: 'Upgrade React',
        description: `React ${reactDep.version} is outdated. Upgrade to React 18 for concurrent features.`,
        steps: [
          'Update package.json: "react": "^18.0.0", "react-dom": "^18.0.0"',
          'Update ReactDOM.render to createRoot',
          'Test for any breaking changes',
          'Update type definitions if using TypeScript'
        ],
        estimatedTime: '1-2 hours',
        benefits: ['Concurrent rendering', 'Better performance', 'Latest React features']
      });
    }

    // Suggest adding missing recommended dependencies
    const hasZod = dependencies.some(d => d.name === 'zod');
    if (!hasZod) {
      recommendations.push({
        type: 'install',
        priority: 'medium',
        title: 'Add Zod for Schema Validation',
        description: 'Zod provides runtime type checking and validation for the CMS system.',
        steps: [
          'Install Zod: npm install zod',
          'Add type definitions for better TypeScript support'
        ],
        estimatedTime: '15 minutes',
        benefits: ['Runtime type safety', 'Better error messages', 'Schema validation']
      });
    }

    const hasTailwind = dependencies.some(d => d.name === 'tailwindcss');
    if (!hasTailwind) {
      recommendations.push({
        type: 'install',
        priority: 'low',
        title: 'Consider Adding Tailwind CSS',
        description: 'Tailwind CSS provides utility-first styling that works well with the CMS components.',
        steps: [
          'Install Tailwind: npm install -D tailwindcss postcss autoprefixer',
          'Initialize Tailwind: npx tailwindcss init -p',
          'Configure content paths in tailwind.config.js',
          'Add Tailwind directives to CSS'
        ],
        estimatedTime: '30 minutes',
        benefits: ['Utility-first CSS', 'Consistent design system', 'Smaller bundle size']
      });
    }

    return recommendations;
  }

  private async analyzeDependency(
    name: string, 
    version: string, 
    type: 'dependency' | 'devDependency' | 'peerDependency'
  ): Promise<DependencyInfo> {
    // Clean version string (remove ^ ~ etc.)
    const cleanVersion = version.replace(/[^\d.]/g, '');
    
    return {
      name,
      version: cleanVersion,
      type,
      isCompatible: !this.conflictingPackages.has(name),
      conflicts: this.conflictingPackages.has(name) ? [this.conflictingPackages.get(name)!] : undefined,
      recommendations: []
    };
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }
}