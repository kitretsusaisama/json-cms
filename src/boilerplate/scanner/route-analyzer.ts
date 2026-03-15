/**
 * Route Analyzer
 */

import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { RouteInfo } from '../interfaces/scanner';

export class RouteAnalyzer {
  async analyzeRoutes(projectPath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    // Detect framework type
    const framework = await this.detectFramework(projectPath);

    if (framework === 'app-router' || framework === 'mixed') {
      const appRoutes = await this.analyzeAppRouterRoutes(projectPath);
      routes.push(...appRoutes);
    }

    if (framework === 'pages-router' || framework === 'mixed') {
      const pagesRoutes = await this.analyzePagesRouterRoutes(projectPath);
      routes.push(...pagesRoutes);
    }

    return routes;
  }

  async detectFramework(projectPath: string): Promise<'app-router' | 'pages-router' | 'mixed'> {
    let hasAppRouter = false;
    let hasPagesRouter = false;

    try {
      // Check for app directory
      await stat(join(projectPath, 'src/app'));
      hasAppRouter = true;
    } catch {
      try {
        await stat(join(projectPath, 'app'));
        hasAppRouter = true;
      } catch {
        // No app router
      }
    }

    try {
      // Check for pages directory
      await stat(join(projectPath, 'pages'));
      hasPagesRouter = true;
    } catch {
      try {
        await stat(join(projectPath, 'src/pages'));
        hasPagesRouter = true;
      } catch {
        // No pages router
      }
    }

    if (hasAppRouter && hasPagesRouter) return 'mixed';
    if (hasAppRouter) return 'app-router';
    if (hasPagesRouter) return 'pages-router';
    
    // Default to app router for new projects
    return 'app-router';
  }

  async findConflicts(routes: RouteInfo[]): Promise<string[]> {
    const conflicts: string[] = [];
    const pathMap = new Map<string, RouteInfo[]>();

    // Group routes by path
    routes.forEach(route => {
      const normalizedPath = this.normalizePath(route.path);
      if (!pathMap.has(normalizedPath)) {
        pathMap.set(normalizedPath, []);
      }
      pathMap.get(normalizedPath)!.push(route);
    });

    // Check for conflicts
    for (const [path, routeList] of pathMap) {
      if (routeList.length > 1) {
        const frameworks = [...new Set(routeList.map(r => r.framework))];
        if (frameworks.length > 1) {
          conflicts.push(`Path conflict: ${path} exists in both ${frameworks.join(' and ')}`);
        }
      }

      // Check for API route conflicts
      const apiRoutes = routeList.filter(r => r.type === 'api');
      const pageRoutes = routeList.filter(r => r.type === 'page');
      
      if (apiRoutes.length > 0 && pageRoutes.length > 0) {
        conflicts.push(`API and page route conflict at ${path}`);
      }
    }

    // Check for reserved CMS paths
    const reservedPaths = ['/api/cms', '/cms', '/admin'];
    routes.forEach(route => {
      reservedPaths.forEach(reserved => {
        if (route.path.startsWith(reserved)) {
          conflicts.push(`Route ${route.path} conflicts with reserved CMS path ${reserved}`);
        }
      });
    });

    return conflicts;
  }

  async validateRouteStructure(routes: RouteInfo[]): Promise<boolean> {
    // Check for required files
    const hasRootLayout = routes.some(r => r.path === '/layout' && r.type === 'layout');
    const hasRootPage = routes.some(r => r.path === '/' && r.type === 'page');

    if (!hasRootLayout || !hasRootPage) {
      return false;
    }

    // Check for proper nesting
    const dynamicRoutes = routes.filter(r => r.isDynamic);
    for (const route of dynamicRoutes) {
      if (route.hasParams && !this.isValidDynamicRoute(route.path)) {
        return false;
      }
    }

    return true;
  }

  private async analyzeAppRouterRoutes(projectPath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const appDirs = ['src/app', 'app'];

    for (const appDir of appDirs) {
      try {
        await stat(join(projectPath, appDir));
        const appRoutes = await this.scanAppDirectory(join(projectPath, appDir), '');
        routes.push(...appRoutes);
        break; // Use the first valid app directory
      } catch {
        // Directory doesn't exist, try next
      }
    }

    return routes;
  }

  private async analyzePagesRouterRoutes(projectPath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];
    const pagesDirs = ['pages', 'src/pages'];

    for (const pagesDir of pagesDirs) {
      try {
        await stat(join(projectPath, pagesDir));
        const pagesRoutes = await this.scanPagesDirectory(join(projectPath, pagesDir), '');
        routes.push(...pagesRoutes);
        break; // Use the first valid pages directory
      } catch {
        // Directory doesn't exist, try next
      }
    }

    return routes;
  }

  private async scanAppDirectory(dirPath: string, routePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    try {
      const items = await readdir(dirPath);

      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = await stat(itemPath);

        if (stats.isDirectory()) {
          // Handle route groups and dynamic routes
          let newRoutePath = routePath;
          
          if (item.startsWith('(') && item.endsWith(')')) {
            // Route group - doesn't affect URL
            newRoutePath = routePath;
          } else if (item.startsWith('[') && item.endsWith(']')) {
            // Dynamic route
            newRoutePath = join(routePath, item);
          } else {
            // Regular route segment
            newRoutePath = join(routePath, item);
          }

          const nestedRoutes = await this.scanAppDirectory(itemPath, newRoutePath);
          routes.push(...nestedRoutes);
        } else if (stats.isFile()) {
          const route = this.analyzeAppRouterFile(itemPath, routePath, item);
          if (route) {
            routes.push(route);
          }
        }
      }
    } catch {
      // Error reading directory
    }

    return routes;
  }

  private async scanPagesDirectory(dirPath: string, routePath: string): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    try {
      const items = await readdir(dirPath);

      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = await stat(itemPath);

        if (stats.isDirectory()) {
          let newRoutePath = routePath;
          
          if (item === 'api') {
            newRoutePath = '/api';
          } else {
            newRoutePath = join(routePath, item);
          }

          const nestedRoutes = await this.scanPagesDirectory(itemPath, newRoutePath);
          routes.push(...nestedRoutes);
        } else if (stats.isFile()) {
          const route = this.analyzePagesRouterFile(itemPath, routePath, item);
          if (route) {
            routes.push(route);
          }
        }
      }
    } catch {
      // Error reading directory
    }

    return routes;
  }

  private analyzeAppRouterFile(filePath: string, routePath: string, fileName: string): RouteInfo | null {
    const ext = extname(fileName);
    const baseName = basename(fileName, ext);

    // Only analyze TypeScript/JavaScript files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return null;
    }

    let type: RouteInfo['type'];
    let path = routePath;

    switch (baseName) {
      case 'page':
        type = 'page';
        break;
      case 'layout':
        type = 'layout';
        break;
      case 'loading':
        type = 'loading';
        break;
      case 'error':
        type = 'error';
        break;
      case 'route':
        type = 'api';
        path = join('/api', routePath);
        break;
      default:
        return null; // Not a recognized App Router file
    }

    return {
      path: this.normalizePath(path),
      type,
      isStatic: !this.isDynamicPath(path),
      isDynamic: this.isDynamicPath(path),
      hasParams: this.hasParams(path),
      framework: 'app-router'
    };
  }

  private analyzePagesRouterFile(filePath: string, routePath: string, fileName: string): RouteInfo | null {
    const ext = extname(fileName);
    const baseName = basename(fileName, ext);

    // Only analyze TypeScript/JavaScript files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return null;
    }

    // Skip special files
    if (['_app', '_document', '_error', '404', '500'].includes(baseName)) {
      return null;
    }

    let path: string;
    let type: RouteInfo['type'] = 'page';

    if (routePath.startsWith('/api')) {
      type = 'api';
      path = baseName === 'index' ? routePath : join(routePath, baseName);
    } else {
      path = baseName === 'index' ? routePath || '/' : join(routePath, baseName);
    }

    return {
      path: this.normalizePath(path),
      type,
      isStatic: !this.isDynamicPath(path),
      isDynamic: this.isDynamicPath(path),
      hasParams: this.hasParams(path),
      framework: 'pages-router'
    };
  }

  private normalizePath(path: string): string {
    if (!path || path === '') return '/';
    
    // Convert Windows paths to Unix paths
    const normalized = path.replace(/\\/g, '/');
    
    // Ensure path starts with /
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  private isDynamicPath(path: string): boolean {
    return path.includes('[') && path.includes(']');
  }

  private hasParams(path: string): boolean {
    return this.isDynamicPath(path) || path.includes(':');
  }

  private isValidDynamicRoute(path: string): boolean {
    // Check for valid dynamic route syntax
    const dynamicSegments = path.match(/\[([^\]]+)\]/g);
    
    if (!dynamicSegments) return true;

    for (const segment of dynamicSegments) {
      const param = segment.slice(1, -1); // Remove [ and ]
      
      // Check for valid parameter names
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param) && !param.startsWith('...')) {
        return false;
      }
    }

    return true;
  }
}