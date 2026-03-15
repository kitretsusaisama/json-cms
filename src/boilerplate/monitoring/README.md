# Monitoring System

The monitoring system provides comprehensive observability for the JSON CMS Boilerplate, including structured logging, metrics collection, error tracking, health checks, alerting, and dashboard management.

## Features

### 🔍 Structured Logging
- Correlation IDs for request tracing
- Tenant and user context awareness
- Multiple output formats (JSON, text)
- Multiple destinations (console, file, remote)
- Automatic request/response logging

### 📊 Metrics Collection
- Request metrics (count, duration, status codes)
- Performance metrics (memory, CPU, event loop lag)
- Custom metrics support
- Prometheus export format
- Automatic cleanup and retention

### 🚨 Error Tracking
- Automatic error capture and context collection
- Breadcrumb tracking for debugging
- Integration with external services (Sentry, Rollbar, etc.)
- Error fingerprinting and deduplication
- User and request context capture

### 💚 Health Checks
- System health monitoring (memory, CPU, disk)
- Database connectivity checks
- External service dependency checks
- Kubernetes-ready endpoints (liveness, readiness)
- Custom health check registration

### 🔔 Alerting
- Rule-based alerting on metrics and health
- Multiple notification channels (email, Slack, webhooks)
- Alert severity levels and escalation
- Alert resolution tracking
- Default system alerts

### 📈 Dashboards
- Real-time monitoring dashboards
- Customizable widgets (metrics, charts, tables, status)
- Auto-refresh capabilities
- Time range selection
- Export and sharing

## Quick Start

### Basic Setup

```typescript
import { createMonitoringSystem, createDefaultMonitoringConfig } from '@/boilerplate/monitoring';

// Create monitoring system with default config
const config = createDefaultMonitoringConfig();
const monitoring = createMonitoringSystem(config);

// Use in your application
monitoring.logger.info('Application started');
monitoring.metrics.recordCustomMetric('app_startup', 1);
```

### Express.js Integration

```typescript
import express from 'express';
import { setupMonitoringMiddleware } from '@/boilerplate/monitoring';

const app = express();

// Setup all monitoring middleware and endpoints
setupMonitoringMiddleware(app, monitoring);

// Your routes here...

app.listen(3000);
```

### Next.js Integration

```typescript
// pages/api/monitoring/health.ts
import { createNextJSMonitoringRoutes } from '@/boilerplate/monitoring';

const routes = createNextJSMonitoringRoutes(monitoring);
export default routes.health;
```

```typescript
// pages/api/monitoring/metrics.ts
export default routes.metrics;
```

```typescript
// pages/api/monitoring/dashboards/[...slug].ts
export default routes.dashboards;
```

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=INFO                    # ERROR, WARN, INFO, DEBUG
LOG_FORMAT=json                   # json, text
LOG_FILE_PATH=/var/log/app.log    # Optional file output
LOG_REMOTE_ENDPOINT=https://...   # Optional remote logging
LOG_REMOTE_API_KEY=secret         # API key for remote logging

# Metrics
METRICS_ENABLED=true              # Enable/disable metrics
METRICS_COLLECT_INTERVAL=30000    # Collection interval (ms)
METRICS_RETENTION_PERIOD=604800000 # Retention period (ms)
METRICS_EXPORT_FORMAT=json        # json, prometheus

# Error Tracking
ERROR_TRACKING_ENABLED=true       # Enable/disable error tracking
ERROR_TRACKING_DSN=https://...    # Sentry/external service DSN
ERROR_TRACKING_SAMPLE_RATE=1.0    # Sample rate (0.0-1.0)

# Health Checks
HEALTH_CHECKS_ENABLED=true        # Enable/disable health checks
HEALTH_CHECK_INTERVAL=60000       # Check interval (ms)
HEALTH_CHECK_TIMEOUT=5000         # Check timeout (ms)

# Alerts
ALERTS_ENABLED=true               # Enable/disable alerts
ALERT_EVALUATION_INTERVAL=60000   # Evaluation interval (ms)
```

### Custom Configuration

```typescript
import { MonitoringConfig } from '@/boilerplate/monitoring';

const config: MonitoringConfig = {
  logging: {
    level: 'INFO',
    format: 'json',
    outputs: ['console', 'file'],
    fileConfig: {
      path: '/var/log/cms.log',
      maxSize: '100MB',
      maxFiles: 5
    }
  },
  metrics: {
    enabled: true,
    collectInterval: 30000,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    exportFormat: 'prometheus'
  },
  errorTracking: {
    enabled: true,
    dsn: 'https://your-sentry-dsn',
    environment: 'production',
    sampleRate: 0.1
  },
  healthChecks: {
    enabled: true,
    interval: 60000,
    timeout: 5000
  },
  alerts: {
    enabled: true,
    evaluationInterval: 60000,
    defaultChannels: [
      {
        type: 'slack',
        config: {
          webhookUrl: 'https://hooks.slack.com/...',
          channel: '#alerts'
        }
      }
    ]
  }
};
```

## Usage Examples

### Structured Logging

```typescript
import { getLogger } from '@/boilerplate/monitoring';

const logger = getLogger();

// Basic logging
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.error('Database connection failed', { host: 'db.example.com' }, error);

// Child logger with context
const userLogger = logger.child({ userId: '123', tenantId: 'tenant-1' });
userLogger.info('Profile updated');
```

### Metrics Collection

```typescript
import { measurePerformance } from '@/boilerplate/monitoring';

// Measure operation performance
const result = await monitoring.measurePerformance('database_query', async () => {
  return await db.query('SELECT * FROM users');
});

// Record custom metrics
monitoring.metrics.recordCustomMetric('user_signup', 1, { 
  source: 'web',
  plan: 'premium' 
});
```

### Error Tracking

```typescript
// Automatic error capture
try {
  await riskyOperation();
} catch (error) {
  const errorId = monitoring.errorTracker.captureError(error, {
    userId: '123',
    operation: 'user_update'
  });
  
  logger.error('Operation failed', { errorId });
}

// Add breadcrumbs for context
monitoring.errorTracker.addBreadcrumb({
  message: 'User clicked save button',
  category: 'ui',
  level: 'INFO'
});
```

### Health Checks

```typescript
// Register custom health check
monitoring.healthChecker.registerCheck('external-api', async () => {
  try {
    const response = await fetch('https://api.example.com/health');
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      message: `API responded with ${response.status}`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `API unreachable: ${error.message}`
    };
  }
});
```

### Alerting

```typescript
// Add custom alert rule
monitoring.alertManager.addRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  condition: {
    metric: 'requests.failed',
    operator: 'gt'
  },
  threshold: 10,
  timeWindow: 300,
  severity: 'high',
  enabled: true,
  channels: [
    {
      type: 'slack',
      config: {
        webhookUrl: 'https://hooks.slack.com/...',
        channel: '#critical-alerts'
      }
    }
  ]
});
```

### Dashboard Management

```typescript
// Create custom dashboard
const dashboard = monitoring.dashboardManager.createDashboard({
  name: 'API Performance',
  refreshInterval: 30000,
  timeRange: {
    start: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    end: new Date()
  },
  widgets: [
    {
      id: 'response-time-chart',
      type: 'chart',
      title: 'Response Time Trend',
      query: 'requests.averageResponseTime',
      config: { chartType: 'line' },
      position: { x: 0, y: 0, width: 12, height: 4 }
    }
  ]
});
```

## API Endpoints

### Health Endpoints

- `GET /health` - Overall system health
- `GET /health/ready` - Readiness probe (Kubernetes)
- `GET /health/live` - Liveness probe (Kubernetes)

### Metrics Endpoints

- `GET /metrics` - Prometheus-formatted metrics

### Dashboard API

- `GET /api/monitoring/dashboards` - List all dashboards
- `GET /api/monitoring/dashboards/:id` - Get dashboard with data
- `POST /api/monitoring/dashboards` - Create new dashboard
- `PUT /api/monitoring/dashboards/:id` - Update dashboard
- `DELETE /api/monitoring/dashboards/:id` - Delete dashboard

## Integration with External Services

### Sentry Integration

```typescript
const config = {
  errorTracking: {
    enabled: true,
    dsn: 'https://your-sentry-dsn@sentry.io/project-id',
    environment: 'production',
    sampleRate: 0.1
  }
};
```

### Prometheus Integration

```typescript
const config = {
  metrics: {
    enabled: true,
    exportFormat: 'prometheus'
  }
};

// Metrics available at /metrics endpoint
```

### Slack Alerts

```typescript
const alertChannel = {
  type: 'slack',
  config: {
    webhookUrl: 'https://hooks.slack.com/services/...',
    channel: '#alerts',
    username: 'CMS Alert Bot',
    iconEmoji: ':warning:'
  }
};
```

## Best Practices

### Logging
- Use structured logging with consistent field names
- Include correlation IDs for request tracing
- Log at appropriate levels (ERROR for errors, INFO for business events)
- Avoid logging sensitive information

### Metrics
- Use consistent naming conventions for metrics
- Include relevant tags for filtering and grouping
- Monitor key business metrics, not just technical metrics
- Set up alerts on critical metrics

### Error Tracking
- Capture errors with sufficient context
- Use breadcrumbs to track user actions
- Set up error budgets and SLOs
- Review and triage errors regularly

### Health Checks
- Check all critical dependencies
- Keep checks lightweight and fast
- Use appropriate timeouts
- Monitor check results and trends

### Alerting
- Set meaningful thresholds based on SLOs
- Avoid alert fatigue with proper severity levels
- Include runbook links in alert messages
- Test alert channels regularly

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check metrics retention period
   - Monitor for memory leaks in custom metrics
   - Adjust collection intervals

2. **Missing Correlation IDs**
   - Ensure logging middleware is properly installed
   - Check middleware order in Express.js

3. **Health Checks Failing**
   - Verify check timeouts are appropriate
   - Check network connectivity to dependencies
   - Review check implementation logic

4. **Alerts Not Firing**
   - Verify alert rules and thresholds
   - Check alert manager configuration
   - Test notification channels

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=DEBUG
```

This will provide detailed information about monitoring system operations.