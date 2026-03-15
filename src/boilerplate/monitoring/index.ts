/**
 * Monitoring System Main Export
 * 
 * Provides a unified interface for all monitoring capabilities including
 * structured logging, metrics collection, error tracking, health checks,
 * alerting, and dashboard management.
 */

import { 
  MonitoringConfig,
  StructuredLogger,
  MetricsCollector,
  ErrorTracker,
  HealthChecker,
  AlertManager
} from './interfaces';

import { 
  BoilerplateLogger, 
  initializeLogger, 
  getLogger,
  createLoggingMiddleware,
  getCurrentCorrelationId,
  getCurrentTenantId,
  getCurrentUserId,
  getCurrentRequestId
} from './structured-logger';

import { 
  BoilerplateMetricsCollector,
  createMetricsMiddleware,
  measurePerformance
} from './metrics-collector';

import { 
  BoilerplateErrorTracker,
  createErrorTrackingMiddleware,
  createErrorHandlerMiddleware
} from './error-tracker';

import { 
  BoilerplateHealthChecker,
  createHealthCheckEndpoint,
  createReadinessEndpoint,
  createLivenessEndpoint
} from './health-checker';

import { BoilerplateAlertManager } from './alert-manager';
import { BoilerplateDashboardManager, createDashboardEndpoints } from './dashboard';

export interface MonitoringSystem {
  logger: StructuredLogger;
  metrics: MetricsCollector;
  errorTracker: ErrorTracker;
  healthChecker: HealthChecker;
  alertManager: AlertManager;
  dashboardManager: BoilerplateDashboardManager;
  
  // Middleware functions
  loggingMiddleware: (req: any, res: any, next: any) => void;
  metricsMiddleware: (req: any, res: any, next: any) => void;
  errorTrackingMiddleware: (req: any, res: any, next: any) => void;
  errorHandlerMiddleware: (error: Error, req: any, res: any, next: any) => void;
  
  // Health check endpoints
  healthEndpoint: (req: any, res: any) => Promise<void>;
  readinessEndpoint: (req: any, res: any) => Promise<void>;
  livenessEndpoint: (req: any, res: any) => void;
  
  // Dashboard endpoints
  dashboardEndpoints: {
    listDashboards: (req: any, res: any) => void;
    getDashboard: (req: any, res: any) => Promise<void>;
    createDashboard: (req: any, res: any) => void;
    updateDashboard: (req: any, res: any) => void;
    deleteDashboard: (req: any, res: any) => void;
  };
  
  // Utility functions
  measurePerformance: <T>(operationName: string, operation: () => Promise<T>) => Promise<T>;
  getCurrentCorrelationId: () => string | undefined;
  getCurrentTenantId: () => string | undefined;
  getCurrentUserId: () => string | undefined;
  getCurrentRequestId: () => string | undefined;
  
  // Lifecycle management
  destroy: () => void;
}

export function createMonitoringSystem(config: MonitoringConfig): MonitoringSystem {
  // Initialize core components
  const logger = initializeLogger(config.logging);
  const metrics = new BoilerplateMetricsCollector(config.metrics);
  const errorTracker = new BoilerplateErrorTracker(config.errorTracking);
  const healthChecker = new BoilerplateHealthChecker(config.healthChecks);
  const alertManager = new BoilerplateAlertManager(config.alerts);
  const dashboardManager = new BoilerplateDashboardManager();
  
  // Create middleware functions
  const loggingMiddleware = createLoggingMiddleware(logger);
  const metricsMiddleware = createMetricsMiddleware(metrics);
  const errorTrackingMiddleware = createErrorTrackingMiddleware(errorTracker);
  const errorHandlerMiddleware = createErrorHandlerMiddleware(errorTracker);
  
  // Create endpoint handlers
  const healthEndpoint = createHealthCheckEndpoint(healthChecker);
  const readinessEndpoint = createReadinessEndpoint(healthChecker);
  const livenessEndpoint = createLivenessEndpoint();
  const dashboardEndpoints = createDashboardEndpoints(dashboardManager);
  
  // Create performance measurement wrapper
  const performanceMeasurer = <T>(operationName: string, operation: () => Promise<T>) => 
    measurePerformance(metrics, operationName, operation);
  
  logger.info('Monitoring system initialized', {
    loggingEnabled: config.logging.level !== undefined,
    metricsEnabled: config.metrics.enabled,
    errorTrackingEnabled: config.errorTracking.enabled,
    healthChecksEnabled: config.healthChecks.enabled,
    alertsEnabled: config.alerts.enabled
  });
  
  return {
    logger,
    metrics,
    errorTracker,
    healthChecker,
    alertManager,
    dashboardManager,
    
    loggingMiddleware,
    metricsMiddleware,
    errorTrackingMiddleware,
    errorHandlerMiddleware,
    
    healthEndpoint,
    readinessEndpoint,
    livenessEndpoint,
    dashboardEndpoints,
    
    measurePerformance: performanceMeasurer,
    getCurrentCorrelationId,
    getCurrentTenantId,
    getCurrentUserId,
    getCurrentRequestId,
    
    destroy: () => {
      logger.info('Shutting down monitoring system');
      
      if (metrics && typeof (metrics as any).destroy === 'function') {
        (metrics as any).destroy();
      }
      
      if (healthChecker && typeof (healthChecker as any).destroy === 'function') {
        (healthChecker as any).destroy();
      }
      
      if (alertManager && typeof (alertManager as any).destroy === 'function') {
        (alertManager as any).destroy();
      }
      
      if (dashboardManager && typeof (dashboardManager as any).destroy === 'function') {
        (dashboardManager as any).destroy();
      }
      
      logger.info('Monitoring system shutdown complete');
    }
  };
}

// Default configuration factory
export function createDefaultMonitoringConfig(): MonitoringConfig {
  return {
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'INFO',
      format: (process.env.LOG_FORMAT as any) || 'json',
      outputs: ['console'],
      fileConfig: process.env.LOG_FILE_PATH ? {
        path: process.env.LOG_FILE_PATH,
        maxSize: '100MB',
        maxFiles: 5
      } : undefined,
      remoteConfig: process.env.LOG_REMOTE_ENDPOINT ? {
        endpoint: process.env.LOG_REMOTE_ENDPOINT,
        apiKey: process.env.LOG_REMOTE_API_KEY || ''
      } : undefined
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      collectInterval: parseInt(process.env.METRICS_COLLECT_INTERVAL || '30000'),
      retentionPeriod: parseInt(process.env.METRICS_RETENTION_PERIOD || '604800000'), // 7 days
      exportFormat: (process.env.METRICS_EXPORT_FORMAT as any) || 'json'
    },
    errorTracking: {
      enabled: process.env.ERROR_TRACKING_ENABLED !== 'false',
      dsn: process.env.ERROR_TRACKING_DSN,
      environment: process.env.NODE_ENV || 'development',
      sampleRate: parseFloat(process.env.ERROR_TRACKING_SAMPLE_RATE || '1.0')
    },
    healthChecks: {
      enabled: process.env.HEALTH_CHECKS_ENABLED !== 'false',
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'), // 1 minute
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000') // 5 seconds
    },
    alerts: {
      enabled: process.env.ALERTS_ENABLED !== 'false',
      evaluationInterval: parseInt(process.env.ALERT_EVALUATION_INTERVAL || '60000'), // 1 minute
      defaultChannels: []
    }
  };
}

// Express.js integration helper
export function setupMonitoringMiddleware(app: any, monitoringSystem: MonitoringSystem): void {
  // Add monitoring middleware in the correct order
  app.use(monitoringSystem.loggingMiddleware);
  app.use(monitoringSystem.errorTrackingMiddleware);
  app.use(monitoringSystem.metricsMiddleware);
  
  // Add health check endpoints
  app.get('/health', monitoringSystem.healthEndpoint);
  app.get('/health/ready', monitoringSystem.readinessEndpoint);
  app.get('/health/live', monitoringSystem.livenessEndpoint);
  
  // Add metrics endpoint
  app.get('/metrics', async (req: any, res: any) => {
    try {
      const metrics = await monitoringSystem.metrics.exportMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to export metrics',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Add dashboard endpoints
  app.get('/api/monitoring/dashboards', monitoringSystem.dashboardEndpoints.listDashboards);
  app.get('/api/monitoring/dashboards/:id', monitoringSystem.dashboardEndpoints.getDashboard);
  app.post('/api/monitoring/dashboards', monitoringSystem.dashboardEndpoints.createDashboard);
  app.put('/api/monitoring/dashboards/:id', monitoringSystem.dashboardEndpoints.updateDashboard);
  app.delete('/api/monitoring/dashboards/:id', monitoringSystem.dashboardEndpoints.deleteDashboard);
  
  // Add error handler middleware (should be last)
  app.use(monitoringSystem.errorHandlerMiddleware);
}

// Next.js API route helpers
export function createNextJSMonitoringRoutes(monitoringSystem: MonitoringSystem) {
  return {
    // /api/monitoring/health
    health: async (req: any, res: any) => {
      return monitoringSystem.healthEndpoint(req, res);
    },
    
    // /api/monitoring/metrics
    metrics: async (req: any, res: any) => {
      try {
        const metrics = await monitoringSystem.metrics.exportMetrics();
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).send(metrics);
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to export metrics',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    },
    
    // /api/monitoring/dashboards/[...slug]
    dashboards: async (req: any, res: any) => {
      const { method } = req;
      const { slug } = req.query;
      
      try {
        if (method === 'GET' && !slug) {
          return monitoringSystem.dashboardEndpoints.listDashboards(req, res);
        } else if (method === 'GET' && slug && slug.length === 1) {
          req.params = { id: slug[0] };
          return monitoringSystem.dashboardEndpoints.getDashboard(req, res);
        } else if (method === 'POST' && !slug) {
          return monitoringSystem.dashboardEndpoints.createDashboard(req, res);
        } else if (method === 'PUT' && slug && slug.length === 1) {
          req.params = { id: slug[0] };
          return monitoringSystem.dashboardEndpoints.updateDashboard(req, res);
        } else if (method === 'DELETE' && slug && slug.length === 1) {
          req.params = { id: slug[0] };
          return monitoringSystem.dashboardEndpoints.deleteDashboard(req, res);
        } else {
          res.status(404).json({ error: 'Not found' });
        }
      } catch (error) {
        res.status(500).json({ 
          error: 'Dashboard operation failed',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };
}

// Re-export all interfaces and types
export * from './interfaces';
export {
  BoilerplateLogger,
  BoilerplateMetricsCollector,
  BoilerplateErrorTracker,
  BoilerplateHealthChecker,
  BoilerplateAlertManager,
  BoilerplateDashboardManager
};