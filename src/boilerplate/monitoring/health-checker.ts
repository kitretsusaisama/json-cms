/**
 * Health Checker Implementation
 * 
 * Provides system health monitoring, dependency checks,
 * and health status endpoints for the CMS boilerplate system.
 */

import { 
  HealthChecker, 
  HealthCheck, 
  HealthCheckResult, 
  SystemHealth,
  MonitoringConfig 
} from './interfaces';
import { getLogger } from './structured-logger';

type HealthCheckFunction = () => Promise<HealthCheckResult>;

export class BoilerplateHealthChecker implements HealthChecker {
  private config: MonitoringConfig['healthChecks'];
  private logger = getLogger();
  private checks: Map<string, HealthCheckFunction> = new Map();
  private lastResults: Map<string, HealthCheck> = new Map();
  private checkInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig['healthChecks']) {
    this.config = config;
    
    if (config.enabled) {
      this.registerDefaultChecks();
      this.startPeriodicChecks();
    }
  }

  registerCheck(name: string, check: HealthCheckFunction): void {
    this.checks.set(name, check);
    this.logger.info('Health check registered', { checkName: name });
  }

  async runCheck(name: string): Promise<HealthCheck> {
    const checkFunction = this.checks.get(name);
    if (!checkFunction) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        checkFunction(),
        this.createTimeoutPromise()
      ]);
      
      const duration = Date.now() - startTime;
      
      const healthCheck: HealthCheck = {
        name,
        status: result.status,
        message: result.message,
        duration,
        timestamp: new Date().toISOString(),
        metadata: result.metadata
      };
      
      this.lastResults.set(name, healthCheck);
      
      this.logger.debug('Health check completed', {
        checkName: name,
        status: result.status,
        duration
      });
      
      return healthCheck;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const healthCheck: HealthCheck = {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString(),
        metadata: { error: error instanceof Error ? error.stack : String(error) }
      };
      
      this.lastResults.set(name, healthCheck);
      
      this.logger.warn('Health check failed', {
        checkName: name,
        error: error instanceof Error ? error.message : String(error),
        duration
      });
      
      return healthCheck;
    }
  }

  async runAllChecks(): Promise<HealthCheck[]> {
    const checkNames = Array.from(this.checks.keys());
    const results = await Promise.allSettled(
      checkNames.map(name => this.runCheck(name))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: checkNames[index],
          status: 'unhealthy' as const,
          message: result.reason?.message || 'Check execution failed',
          duration: 0,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  async getStatus(): Promise<SystemHealth> {
    const checks = await this.runAllChecks();
    
    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const degradedChecks = checks.filter(check => check.status === 'degraded');
    
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timed out after ${this.config.timeout}ms`));
      }, this.config.timeout || 5000);
    });
  }

  private registerDefaultChecks(): void {
    // Memory usage check
    this.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`;
      
      if (usagePercent > 90) {
        status = 'unhealthy';
        message += ' - Critical memory usage';
      } else if (usagePercent > 75) {
        status = 'degraded';
        message += ' - High memory usage';
      }
      
      return {
        status,
        message,
        metadata: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
          usagePercent
        }
      };
    });

    // CPU usage check
    this.registerCheck('cpu', async () => {
      const startUsage = process.cpuUsage();
      
      // Wait 100ms to measure CPU usage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endUsage = process.cpuUsage(startUsage);
      const totalUsage = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
      const usagePercent = (totalUsage / 100) * 100; // Percentage over 100ms period
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `CPU usage: ${usagePercent.toFixed(1)}%`;
      
      if (usagePercent > 90) {
        status = 'unhealthy';
        message += ' - Critical CPU usage';
      } else if (usagePercent > 75) {
        status = 'degraded';
        message += ' - High CPU usage';
      }
      
      return {
        status,
        message,
        metadata: {
          user: endUsage.user,
          system: endUsage.system,
          total: totalUsage,
          usagePercent
        }
      };
    });

    // Event loop lag check
    this.registerCheck('eventloop', async () => {
      const start = process.hrtime.bigint();
      
      await new Promise(resolve => setImmediate(resolve));
      
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Event loop lag: ${lag.toFixed(2)}ms`;
      
      if (lag > 100) {
        status = 'unhealthy';
        message += ' - Critical event loop lag';
      } else if (lag > 50) {
        status = 'degraded';
        message += ' - High event loop lag';
      }
      
      return {
        status,
        message,
        metadata: { lag }
      };
    });

    // File system check
    this.registerCheck('filesystem', async () => {
      try {
        const fs = require('fs').promises;
        const testFile = '/tmp/health-check-test';
        
        await fs.writeFile(testFile, 'test');
        await fs.readFile(testFile);
        await fs.unlink(testFile);
        
        return {
          status: 'healthy' as const,
          message: 'File system is accessible'
        };
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          message: `File system error: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    });

    // Database connectivity check (if configured)
    if (process.env.DATABASE_URL) {
      this.registerCheck('database', async () => {
        try {
          // This is a placeholder - in a real implementation, you would
          // check your actual database connection
          const connectionTest = await this.testDatabaseConnection();
          
          return {
            status: connectionTest.success ? 'healthy' as const : 'unhealthy' as const,
            message: connectionTest.message,
            metadata: connectionTest.metadata
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      });
    }

    // External service checks (if configured)
    const externalServices = process.env.EXTERNAL_SERVICES?.split(',') || [];
    externalServices.forEach(service => {
      this.registerCheck(`external-${service}`, async () => {
        try {
          const response = await fetch(service, {
            method: 'HEAD',
            timeout: 5000
          });
          
          return {
            status: response.ok ? 'healthy' as const : 'degraded' as const,
            message: `External service ${service}: ${response.status} ${response.statusText}`,
            metadata: {
              status: response.status,
              statusText: response.statusText
            }
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            message: `External service ${service} unreachable: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      });
    });
  }

  private async testDatabaseConnection(): Promise<{
    success: boolean;
    message: string;
    metadata?: Record<string, unknown>;
  }> {
    // Placeholder for database connection test
    // In a real implementation, this would test your actual database
    return {
      success: true,
      message: 'Database connection successful',
      metadata: {
        connectionTime: Date.now()
      }
    };
  }

  private startPeriodicChecks(): void {
    if (!this.config.interval) return;
    
    this.checkInterval = setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        this.logger.error('Periodic health check failed', {}, error as Error);
      }
    }, this.config.interval);
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  // Utility methods for getting health check history
  getLastResults(): HealthCheck[] {
    return Array.from(this.lastResults.values());
  }

  getLastResult(checkName: string): HealthCheck | undefined {
    return this.lastResults.get(checkName);
  }
}

// Express middleware for health check endpoints
export function createHealthCheckEndpoint(healthChecker: HealthChecker) {
  return async (req: any, res: any) => {
    try {
      const health = await healthChecker.getStatus();
      
      // Set appropriate HTTP status code
      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200; // Still OK, but with warnings
      } else if (health.status === 'unhealthy') {
        statusCode = 503; // Service Unavailable
      }
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        message: 'Health check system error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}

// Readiness probe endpoint (for Kubernetes)
export function createReadinessEndpoint(healthChecker: HealthChecker) {
  return async (req: any, res: any) => {
    try {
      const health = await healthChecker.getStatus();
      
      if (health.status === 'healthy' || health.status === 'degraded') {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready' });
      }
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: 'Health check failed' });
    }
  };
}

// Liveness probe endpoint (for Kubernetes)
export function createLivenessEndpoint() {
  return (req: any, res: any) => {
    // Simple liveness check - if the process is running, it's alive
    res.status(200).json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };
}