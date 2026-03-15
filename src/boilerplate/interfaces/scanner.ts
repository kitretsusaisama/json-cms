/**
 * Repository Scanner Interface
 * 
 * Analyzes existing Next.js projects for compatibility and integration planning
 */

export interface ScanReport {
  projectPath: string;
  scannedAt: string;
  nextjsVersion: string;
  hasTypeScript: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  cssStrategy: CSSStrategy[];
  routes: RouteInfo[];
  dependencies: DependencyInfo[];
  thirdPartyIntegrations: Integration[];
  conflicts: ConflictInfo[];
  recommendations: Recommendation[];
  score: CompatibilityScore;
}

export interface CSSStrategy {
  type: 'tailwind' | 'styled-components' | 'emotion' | 'css-modules' | 'global-css' | 'sass' | 'less';
  configFile?: string;
  globalFiles: string[];
  conflicts: string[];
}

export interface RouteInfo {
  path: string;
  type: 'page' | 'api' | 'middleware' | 'layout' | 'loading' | 'error';
  isStatic: boolean;
  isDynamic: boolean;
  hasParams: boolean;
  framework: 'app-router' | 'pages-router';
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  isCompatible: boolean;
  conflicts?: string[];
  recommendations?: string[];
}

export interface Integration {
  name: string;
  type: 'auth' | 'analytics' | 'cms' | 'database' | 'deployment' | 'monitoring' | 'other';
  configFiles: string[];
  envVars: string[];
  isCompatible: boolean;
  migrationRequired: boolean;
}

export interface ConflictInfo {
  type: 'css' | 'routing' | 'dependency' | 'configuration' | 'naming';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedFiles: string[];
  resolution: string;
  autoFixable: boolean;
}

export interface Recommendation {
  type: 'upgrade' | 'install' | 'configure' | 'refactor' | 'remove';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  steps: string[];
  estimatedTime: string;
  benefits: string[];
}

export interface CompatibilityScore {
  overall: number; // 0-100
  css: number;
  routing: number;
  dependencies: number;
  configuration: number;
  breakdown: {
    compatible: number;
    warnings: number;
    conflicts: number;
    critical: number;
  };
}

export interface ScanOptions {
  includeNodeModules?: boolean;
  includeDotFiles?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  analyzeCSS?: boolean;
  analyzeDependencies?: boolean;
  analyzeRoutes?: boolean;
  generateReport?: boolean;
  outputPath?: string;
}

/**
 * Repository Scanner Interface
 */
export interface RepositoryScanner {
  /**
   * Scan a Next.js project for compatibility analysis
   */
  scanProject(projectPath: string, options?: ScanOptions): Promise<ScanReport>;

  /**
   * Detect conflicts in the scanned project
   */
  detectConflicts(report: ScanReport): Promise<ConflictInfo[]>;

  /**
   * Generate recommendations based on scan results
   */
  generateRecommendations(report: ScanReport): Promise<Recommendation[]>;

  /**
   * Calculate compatibility score
   */
  calculateScore(report: ScanReport): CompatibilityScore;

  /**
   * Generate a detailed report
   */
  generateReport(report: ScanReport, outputPath?: string): Promise<string>;

  /**
   * Validate project structure
   */
  validateProject(projectPath: string): Promise<boolean>;
}

/**
 * CSS Analyzer Interface
 */
export interface CSSAnalyzer {
  analyzeCSS(projectPath: string): Promise<CSSStrategy[]>;
  detectGlobalStyles(projectPath: string): Promise<string[]>;
  findConflicts(strategies: CSSStrategy[]): Promise<string[]>;
  generateNamespacing(componentName: string): string;
}

/**
 * Dependency Analyzer Interface
 */
export interface DependencyAnalyzer {
  analyzeDependencies(packageJsonPath: string): Promise<DependencyInfo[]>;
  checkCompatibility(dependencies: DependencyInfo[]): Promise<DependencyInfo[]>;
  findConflicts(dependencies: DependencyInfo[]): Promise<string[]>;
  suggestUpgrades(dependencies: DependencyInfo[]): Promise<Recommendation[]>;
}

/**
 * Route Analyzer Interface
 */
export interface RouteAnalyzer {
  analyzeRoutes(projectPath: string): Promise<RouteInfo[]>;
  detectFramework(projectPath: string): Promise<'app-router' | 'pages-router' | 'mixed'>;
  findConflicts(routes: RouteInfo[]): Promise<string[]>;
  validateRouteStructure(routes: RouteInfo[]): Promise<boolean>;
}