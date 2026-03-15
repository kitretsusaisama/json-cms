/**
 * Repository Scanner Implementation
 * 
 * Analyzes Next.js projects for compatibility and integration planning
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { 
  RepositoryScanner, 
  ScanReport, 
  ScanOptions, 
  ConflictInfo, 
  Recommendation, 
  CompatibilityScore,
  RouteInfo,
  DependencyInfo,
  Integration,
  CSSStrategy
} from '../interfaces/scanner';
import { CSSAnalyzer } from './css-analyzer';
import { DependencyAnalyzer } from './dependency-analyzer';
import { RouteAnalyzer } from './route-analyzer';

export class DefaultRepositoryScanner implements RepositoryScanner {
  private cssAnalyzer: CSSAnalyzer;
  private dependencyAnalyzer: DependencyAnalyzer;
  private routeAnalyzer: RouteAnalyzer;

  constructor() {
    this.cssAnalyzer = new CSSAnalyzer();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.routeAnalyzer = new RouteAnalyzer();
  }

  async scanProject(projectPath: string, options: ScanOptions = {}): Promise<ScanReport> {
    const startTime = Date.now();
    
    try {
      // Validate project structure
      await this.validateProject(projectPath);

      // Read package.json
      const packageJsonPath = join(projectPath, 'package.json');
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

      // Analyze different aspects
      const [cssStrategies, routes, dependencies] = await Promise.all([
        options.analyzeCSS !== false ? this.cssAnalyzer.analyzeCSS(projectPath) : [],
        options.analyzeRoutes !== false ? this.routeAnalyzer.analyzeRoutes(projectPath) : [],
        options.analyzeDependencies !== false ? this.dependencyAnalyzer.analyzeDependencies(packageJsonPath) : []
      ]);

      // Detect integrations
      const integrations = await this.detectIntegrations(projectPath, packageJson);

      // Create initial report
      const report: ScanReport = {
        projectPath,
        scannedAt: new Date().toISOString(),
        nextjsVersion: this.extractNextJSVersion(dependencies),
        hasTypeScript: await this.hasTypeScript(projectPath),
        packageManager: await this.detectPackageManager(projectPath),
        cssStrategy: cssStrategies,
        routes,
        dependencies,
        thirdPartyIntegrations: integrations,
        conflicts: [],
        recommendations: [],
        score: { overall: 0, css: 0, routing: 0, dependencies: 0, configuration: 0, breakdown: { compatible: 0, warnings: 0, conflicts: 0, critical: 0 } }
      };

      // Detect conflicts and generate recommendations
      report.conflicts = await this.detectConflicts(report);
      report.recommendations = await this.generateRecommendations(report);
      report.score = this.calculateScore(report);

      return report;

    } catch (error) {
      throw new Error(`Failed to scan project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async detectConflicts(report: ScanReport): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    // CSS conflicts
    const cssConflicts = await this.cssAnalyzer.findConflicts(report.cssStrategy);
    conflicts.push(...cssConflicts.map(conflict => ({
      type: 'css' as const,
      severity: 'medium' as const,
      description: conflict,
      affectedFiles: [],
      resolution: 'Use CSS modules or namespace components',
      autoFixable: true
    })));

    // Dependency conflicts
    const depConflicts = await this.dependencyAnalyzer.findConflicts(report.dependencies);
    conflicts.push(...depConflicts.map(conflict => ({
      type: 'dependency' as const,
      severity: 'high' as const,
      description: conflict,
      affectedFiles: ['package.json'],
      resolution: 'Update or remove conflicting dependencies',
      autoFixable: false
    })));

    // Route conflicts
    const routeConflicts = await this.routeAnalyzer.findConflicts(report.routes);
    conflicts.push(...routeConflicts.map(conflict => ({
      type: 'routing' as const,
      severity: 'high' as const,
      description: conflict,
      affectedFiles: [],
      resolution: 'Rename conflicting routes or use different paths',
      autoFixable: false
    })));

    // Next.js version compatibility
    if (report.nextjsVersion && this.compareVersions(report.nextjsVersion, '13.0.0') < 0) {
      conflicts.push({
        type: 'configuration',
        severity: 'critical',
        description: `Next.js version ${report.nextjsVersion} is not supported. Minimum version is 13.0.0`,
        affectedFiles: ['package.json'],
        resolution: 'Upgrade Next.js to version 13.0.0 or higher',
        autoFixable: false
      });
    }

    return conflicts;
  }

  async generateRecommendations(report: ScanReport): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // TypeScript recommendation
    if (!report.hasTypeScript) {
      recommendations.push({
        type: 'configure',
        priority: 'high',
        title: 'Add TypeScript Support',
        description: 'TypeScript provides better type safety and developer experience',
        steps: [
          'Install TypeScript: npm install --save-dev typescript @types/react @types/node',
          'Rename .js files to .ts/.tsx',
          'Add tsconfig.json configuration',
          'Update import statements'
        ],
        estimatedTime: '2-4 hours',
        benefits: ['Better type safety', 'Improved IDE support', 'Easier refactoring']
      });
    }

    // CSS strategy recommendations
    if (report.cssStrategy.length > 2) {
      recommendations.push({
        type: 'refactor',
        priority: 'medium',
        title: 'Consolidate CSS Strategies',
        description: 'Multiple CSS strategies can cause conflicts and increase bundle size',
        steps: [
          'Choose a primary CSS strategy (Tailwind or CSS Modules recommended)',
          'Migrate existing styles to the chosen strategy',
          'Remove unused CSS dependencies',
          'Update component styles'
        ],
        estimatedTime: '1-2 days',
        benefits: ['Reduced bundle size', 'Consistent styling', 'Easier maintenance']
      });
    }

    // Dependency upgrade recommendations
    const upgradeRecommendations = await this.dependencyAnalyzer.suggestUpgrades(report.dependencies);
    recommendations.push(...upgradeRecommendations);

    // App Router migration recommendation
    const hasAppRouter = report.routes.some(route => route.framework === 'app-router');
    const hasPagesRouter = report.routes.some(route => route.framework === 'pages-router');
    
    if (hasPagesRouter && !hasAppRouter) {
      recommendations.push({
        type: 'upgrade',
        priority: 'medium',
        title: 'Migrate to App Router',
        description: 'App Router provides better performance and developer experience',
        steps: [
          'Create src/app directory',
          'Move pages to app directory structure',
          'Update API routes',
          'Migrate layouts and error boundaries'
        ],
        estimatedTime: '1-3 days',
        benefits: ['Better performance', 'Improved SEO', 'Modern React features']
      });
    }

    return recommendations;
  }

  calculateScore(report: ScanReport): CompatibilityScore {
    let cssScore = 100;
    let routingScore = 100;
    let dependencyScore = 100;
    let configScore = 100;

    const breakdown = {
      compatible: 0,
      warnings: 0,
      conflicts: 0,
      critical: 0
    };

    // Analyze conflicts
    report.conflicts.forEach(conflict => {
      const penalty = this.getSeverityPenalty(conflict.severity);
      
      switch (conflict.type) {
        case 'css':
          cssScore -= penalty;
          break;
        case 'routing':
          routingScore -= penalty;
          break;
        case 'dependency':
          dependencyScore -= penalty;
          break;
        case 'configuration':
          configScore -= penalty;
          break;
      }

      breakdown[conflict.severity === 'critical' ? 'critical' : 
               conflict.severity === 'high' ? 'conflicts' :
               conflict.severity === 'medium' ? 'warnings' : 'compatible']++;
    });

    // Ensure scores don't go below 0
    cssScore = Math.max(0, cssScore);
    routingScore = Math.max(0, routingScore);
    dependencyScore = Math.max(0, dependencyScore);
    configScore = Math.max(0, configScore);

    const overall = Math.round((cssScore + routingScore + dependencyScore + configScore) / 4);

    return {
      overall,
      css: Math.round(cssScore),
      routing: Math.round(routingScore),
      dependencies: Math.round(dependencyScore),
      configuration: Math.round(configScore),
      breakdown
    };
  }

  async generateReport(report: ScanReport, outputPath?: string): Promise<string> {
    const reportContent = `# Project Compatibility Report

Generated: ${report.scannedAt}
Project: ${report.projectPath}

## Summary

- **Overall Score**: ${report.score.overall}/100
- **Next.js Version**: ${report.nextjsVersion}
- **TypeScript**: ${report.hasTypeScript ? '✅' : '❌'}
- **Package Manager**: ${report.packageManager}

## Detailed Scores

- **CSS**: ${report.score.css}/100
- **Routing**: ${report.score.routing}/100
- **Dependencies**: ${report.score.dependencies}/100
- **Configuration**: ${report.score.configuration}/100

## Conflicts (${report.conflicts.length})

${report.conflicts.map(conflict => `
### ${conflict.type.toUpperCase()} - ${conflict.severity.toUpperCase()}
${conflict.description}
**Resolution**: ${conflict.resolution}
**Auto-fixable**: ${conflict.autoFixable ? '✅' : '❌'}
`).join('\n')}

## Recommendations (${report.recommendations.length})

${report.recommendations.map(rec => `
### ${rec.title} (${rec.priority.toUpperCase()})
${rec.description}
**Estimated Time**: ${rec.estimatedTime}
**Benefits**: ${rec.benefits.join(', ')}
`).join('\n')}

## CSS Strategies

${report.cssStrategy.map(css => `- ${css.type}${css.configFile ? ` (${css.configFile})` : ''}`).join('\n')}

## Routes (${report.routes.length})

${report.routes.slice(0, 10).map(route => `- ${route.path} (${route.type})`).join('\n')}
${report.routes.length > 10 ? `... and ${report.routes.length - 10} more` : ''}

## Dependencies

- **Total**: ${report.dependencies.length}
- **Compatible**: ${report.dependencies.filter(d => d.isCompatible).length}
- **Incompatible**: ${report.dependencies.filter(d => !d.isCompatible).length}
`;

    if (outputPath) {
      await writeFile(outputPath, reportContent);
    }

    return reportContent;
  }

  async validateProject(projectPath: string): Promise<boolean> {
    try {
      // Check if package.json exists
      const packageJsonPath = join(projectPath, 'package.json');
      await stat(packageJsonPath);

      // Check if it's a Next.js project
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      const hasNext = packageJson.dependencies?.next || packageJson.devDependencies?.next;
      
      if (!hasNext) {
        throw new Error('Not a Next.js project (next dependency not found)');
      }

      return true;
    } catch (error) {
      throw new Error(`Invalid Next.js project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods

  private extractNextJSVersion(dependencies: DependencyInfo[]): string {
    const nextDep = dependencies.find(dep => dep.name === 'next');
    return nextDep?.version || 'unknown';
  }

  private async hasTypeScript(projectPath: string): Promise<boolean> {
    try {
      await stat(join(projectPath, 'tsconfig.json'));
      return true;
    } catch {
      return false;
    }
  }

  private async detectPackageManager(projectPath: string): Promise<'npm' | 'yarn' | 'pnpm' | 'bun'> {
    try {
      await stat(join(projectPath, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {}

    try {
      await stat(join(projectPath, 'yarn.lock'));
      return 'yarn';
    } catch {}

    try {
      await stat(join(projectPath, 'bun.lockb'));
      return 'bun';
    } catch {}

    return 'npm';
  }

  private async detectIntegrations(projectPath: string, packageJson: any): Promise<Integration[]> {
    const integrations: Integration[] = [];
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Auth integrations
    if (allDeps['next-auth'] || allDeps['@auth/nextjs']) {
      integrations.push({
        name: 'NextAuth.js',
        type: 'auth',
        configFiles: ['pages/api/auth/[...nextauth].js', 'app/api/auth/[...nextauth]/route.ts'],
        envVars: ['NEXTAUTH_SECRET', 'NEXTAUTH_URL'],
        isCompatible: true,
        migrationRequired: false
      });
    }

    // Analytics
    if (allDeps['@vercel/analytics'] || allDeps['google-analytics']) {
      integrations.push({
        name: 'Analytics',
        type: 'analytics',
        configFiles: [],
        envVars: ['NEXT_PUBLIC_GA_ID'],
        isCompatible: true,
        migrationRequired: false
      });
    }

    // Database
    if (allDeps['prisma'] || allDeps['@prisma/client']) {
      integrations.push({
        name: 'Prisma',
        type: 'database',
        configFiles: ['prisma/schema.prisma'],
        envVars: ['DATABASE_URL'],
        isCompatible: true,
        migrationRequired: false
      });
    }

    return integrations;
  }

  private getSeverityPenalty(severity: string): number {
    switch (severity) {
      case 'critical': return 50;
      case 'high': return 30;
      case 'medium': return 15;
      case 'low': return 5;
      default: return 0;
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.replace(/[^\d.]/g, '').split('.').map(Number);
    const v2Parts = version2.replace(/[^\d.]/g, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }
}