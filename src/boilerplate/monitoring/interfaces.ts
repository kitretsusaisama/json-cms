/**
 * Logging and Monitoring System Interfaces
 * 
 * Provides structured logging, performance monitoring, error tracking,
 * and health check capabilities for the CMS boilerplate system.
 */

export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogEntry {
  timestamp: string;
  level: keyof LogLevel;
  message: string;
  correlationId: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface StructuredLogger {
  error(message: string, metadata?: Record<string, unknown>, error?: Error): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): StructuredLogger;
}

export interface PerformanceMetrics {
  requestDuration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  tenantId?: string;
  userId?: string;
}

export interface MetricsCollector {
  recordRequest(endpoint: string, method: string, duration: number, statusCode: number): void;
  recordError(error: Error, context?: Record<string, unknown>): void;
  recordCustomMetric(name: string, value: number, tags?: Record<string, string>): void;
  getMetrics(timeRange?: TimeRange): Promise<MetricsSummary>;
  exportMetrics(): Promise<string>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface MetricsSummary {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  performance: {
    averageMemoryUsage: number;
    averageCpuUsage: number;
  };
  custom: Record<string, number>;
}

export interface ErrorTracker {
  captureError(error: Error, context?: ErrorContext): string;
  captureMessage(message: string, level: keyof LogLevel, context?: ErrorContext): string;
  setUser(user: { id: string; email?: string; username?: string }): void;
  setTag(key: string, value: string): void;
  setContext(key: string, context: Record<string, unknown>): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
}

export interface ErrorContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  extra?: Record<string, unknown>;
}

export interface Breadcrumb {
  message: string;
  category?: string;
  level?: keyof LogLevel;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface HealthChecker {
  registerCheck(name: string, check: () => Promise<HealthCheckResult>): void;
  runCheck(name: string): Promise<HealthCheck>;
  runAllChecks(): Promise<HealthCheck[]>;
  getStatus(): Promise<SystemHealth>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: string;
  uptime: number;
  version: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  timeWindow: number; // in seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: AlertChannel[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  aggregation?: 'avg' | 'sum' | 'count' | 'max' | 'min';
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'slack';
  config: Record<string, unknown>;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertManager {
  addRule(rule: AlertRule): void;
  removeRule(ruleId: string): void;
  evaluateRules(metrics: MetricsSummary): Promise<Alert[]>;
  sendAlert(alert: Alert): Promise<void>;
  resolveAlert(alertId: string): Promise<void>;
  getActiveAlerts(): Promise<Alert[]>;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  timeRange: TimeRange;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'status';
  title: string;
  query: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; width: number; height: number };
}

export interface MonitoringConfig {
  logging: {
    level: keyof LogLevel;
    format: 'json' | 'text';
    outputs: ('console' | 'file' | 'remote')[];
    fileConfig?: {
      path: string;
      maxSize: string;
      maxFiles: number;
    };
    remoteConfig?: {
      endpoint: string;
      apiKey: string;
    };
  };
  metrics: {
    enabled: boolean;
    collectInterval: number;
    retentionPeriod: number;
    exportFormat: 'prometheus' | 'json';
  };
  errorTracking: {
    enabled: boolean;
    dsn?: string;
    environment: string;
    sampleRate: number;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  alerts: {
    enabled: boolean;
    evaluationInterval: number;
    defaultChannels: AlertChannel[];
  };
}