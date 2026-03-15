/**
 * Monitoring Dashboard Implementation
 * 
 * Provides dashboard creation, widget management, and data visualization
 * for monitoring metrics and system health.
 */

import { 
  MonitoringDashboard, 
  DashboardWidget, 
  TimeRange,
  MetricsSummary,
  HealthCheck 
} from './interfaces';
import { getLogger } from './structured-logger';
import { randomUUID } from 'crypto';

interface DashboardData {
  widgets: Array<{
    id: string;
    data: unknown;
    lastUpdated: string;
  }>;
  lastRefresh: string;
}

export class BoilerplateDashboardManager {
  private logger = getLogger();
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private dashboardData: Map<string, DashboardData> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.createDefaultDashboards();
  }

  createDashboard(dashboard: Omit<MonitoringDashboard, 'id'>): MonitoringDashboard {
    const newDashboard: MonitoringDashboard = {
      id: randomUUID(),
      ...dashboard
    };
    
    this.dashboards.set(newDashboard.id, newDashboard);
    this.initializeDashboardData(newDashboard.id);
    this.startRefreshInterval(newDashboard);
    
    this.logger.info('Dashboard created', {
      dashboardId: newDashboard.id,
      dashboardName: newDashboard.name,
      widgetCount: newDashboard.widgets.length
    });
    
    return newDashboard;
  }

  getDashboard(id: string): MonitoringDashboard | undefined {
    return this.dashboards.get(id);
  }

  getAllDashboards(): MonitoringDashboard[] {
    return Array.from(this.dashboards.values());
  }

  updateDashboard(id: string, updates: Partial<MonitoringDashboard>): MonitoringDashboard | undefined {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;
    
    const updatedDashboard = { ...dashboard, ...updates };
    this.dashboards.set(id, updatedDashboard);
    
    // Restart refresh interval if it changed
    if (updates.refreshInterval !== undefined) {
      this.stopRefreshInterval(id);
      this.startRefreshInterval(updatedDashboard);
    }
    
    this.logger.info('Dashboard updated', {
      dashboardId: id,
      updates: Object.keys(updates)
    });
    
    return updatedDashboard;
  }

  deleteDashboard(id: string): boolean {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return false;
    
    this.stopRefreshInterval(id);
    this.dashboards.delete(id);
    this.dashboardData.delete(id);
    
    this.logger.info('Dashboard deleted', { dashboardId: id });
    return true;
  }

  addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): DashboardWidget | undefined {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return undefined;
    
    const newWidget: DashboardWidget = {
      id: randomUUID(),
      ...widget
    };
    
    dashboard.widgets.push(newWidget);
    this.dashboards.set(dashboardId, dashboard);
    
    this.logger.info('Widget added to dashboard', {
      dashboardId,
      widgetId: newWidget.id,
      widgetType: newWidget.type
    });
    
    return newWidget;
  }

  updateWidget(dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>): DashboardWidget | undefined {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return undefined;
    
    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return undefined;
    
    const updatedWidget = { ...dashboard.widgets[widgetIndex], ...updates };
    dashboard.widgets[widgetIndex] = updatedWidget;
    this.dashboards.set(dashboardId, dashboard);
    
    this.logger.info('Widget updated', {
      dashboardId,
      widgetId,
      updates: Object.keys(updates)
    });
    
    return updatedWidget;
  }

  removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;
    
    const initialLength = dashboard.widgets.length;
    dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
    
    if (dashboard.widgets.length === initialLength) return false;
    
    this.dashboards.set(dashboardId, dashboard);
    
    this.logger.info('Widget removed from dashboard', {
      dashboardId,
      widgetId
    });
    
    return true;
  }

  async getDashboardData(dashboardId: string): Promise<DashboardData | undefined> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return undefined;
    
    await this.refreshDashboardData(dashboardId);
    return this.dashboardData.get(dashboardId);
  }

  async refreshDashboardData(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;
    
    const widgetData = await Promise.allSettled(
      dashboard.widgets.map(async widget => {
        try {
          const data = await this.executeWidgetQuery(widget, dashboard.timeRange);
          return {
            id: widget.id,
            data,
            lastUpdated: new Date().toISOString()
          };
        } catch (error) {
          this.logger.error('Widget query failed', {
            dashboardId,
            widgetId: widget.id,
            error: error instanceof Error ? error.message : String(error)
          });
          
          return {
            id: widget.id,
            data: { error: 'Failed to load data' },
            lastUpdated: new Date().toISOString()
          };
        }
      })
    );
    
    const dashboardData: DashboardData = {
      widgets: widgetData.map(result => 
        result.status === 'fulfilled' ? result.value : {
          id: 'unknown',
          data: { error: 'Widget failed to load' },
          lastUpdated: new Date().toISOString()
        }
      ),
      lastRefresh: new Date().toISOString()
    };
    
    this.dashboardData.set(dashboardId, dashboardData);
  }

  private async executeWidgetQuery(widget: DashboardWidget, timeRange: TimeRange): Promise<unknown> {
    // This is a simplified query executor
    // In a real implementation, you would have a proper query engine
    
    switch (widget.type) {
      case 'metric':
        return this.executeMetricQuery(widget.query, timeRange);
      
      case 'chart':
        return this.executeChartQuery(widget.query, timeRange);
      
      case 'table':
        return this.executeTableQuery(widget.query, timeRange);
      
      case 'status':
        return this.executeStatusQuery(widget.query);
      
      default:
        throw new Error(`Unsupported widget type: ${widget.type}`);
    }
  }

  private async executeMetricQuery(query: string, timeRange: TimeRange): Promise<unknown> {
    // Parse simple metric queries like "requests.total", "errors.count", etc.
    const parts = query.split('.');
    
    // Mock data - in a real implementation, query your metrics store
    const mockMetrics: MetricsSummary = {
      requests: {
        total: 1250,
        successful: 1180,
        failed: 70,
        averageResponseTime: 245
      },
      errors: {
        total: 70,
        byType: {
          'ValidationError': 25,
          'DatabaseError': 15,
          'NetworkError': 30
        }
      },
      performance: {
        averageMemoryUsage: 512 * 1024 * 1024, // 512MB
        averageCpuUsage: 45000 // microseconds
      },
      custom: {
        'page_views': 5420,
        'user_sessions': 892
      }
    };
    
    // Navigate to the requested metric
    let result: any = mockMetrics;
    for (const part of parts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part];
      } else {
        result = null;
        break;
      }
    }
    
    return {
      value: result,
      timestamp: new Date().toISOString(),
      query,
      timeRange
    };
  }

  private async executeChartQuery(query: string, timeRange: TimeRange): Promise<unknown> {
    // Generate mock time series data
    const now = new Date();
    const points = [];
    const intervalMs = (timeRange.end.getTime() - timeRange.start.getTime()) / 50; // 50 data points
    
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(timeRange.start.getTime() + (i * intervalMs));
      const value = Math.floor(Math.random() * 100) + 50; // Random values between 50-150
      
      points.push({
        timestamp: timestamp.toISOString(),
        value
      });
    }
    
    return {
      series: [{
        name: query,
        data: points
      }],
      query,
      timeRange
    };
  }

  private async executeTableQuery(query: string, timeRange: TimeRange): Promise<unknown> {
    // Generate mock tabular data
    const mockData = [
      { endpoint: '/api/pages', requests: 450, errors: 12, avgResponseTime: 120 },
      { endpoint: '/api/blocks', requests: 320, errors: 8, avgResponseTime: 95 },
      { endpoint: '/api/components', requests: 180, errors: 3, avgResponseTime: 85 },
      { endpoint: '/api/seo', requests: 90, errors: 2, avgResponseTime: 110 },
      { endpoint: '/api/health', requests: 60, errors: 0, avgResponseTime: 25 }
    ];
    
    return {
      columns: [
        { key: 'endpoint', title: 'Endpoint', type: 'string' },
        { key: 'requests', title: 'Requests', type: 'number' },
        { key: 'errors', title: 'Errors', type: 'number' },
        { key: 'avgResponseTime', title: 'Avg Response Time (ms)', type: 'number' }
      ],
      rows: mockData,
      query,
      timeRange
    };
  }

  private async executeStatusQuery(query: string): Promise<unknown> {
    // Generate mock status data
    const mockHealthChecks: HealthCheck[] = [
      {
        name: 'database',
        status: 'healthy',
        message: 'Database connection successful',
        duration: 45,
        timestamp: new Date().toISOString()
      },
      {
        name: 'memory',
        status: 'healthy',
        message: 'Memory usage: 512MB / 1GB (51.2%)',
        duration: 2,
        timestamp: new Date().toISOString()
      },
      {
        name: 'external-api',
        status: 'degraded',
        message: 'External API responding slowly',
        duration: 2500,
        timestamp: new Date().toISOString()
      }
    ];
    
    const overallStatus = mockHealthChecks.some(check => check.status === 'unhealthy') 
      ? 'unhealthy' 
      : mockHealthChecks.some(check => check.status === 'degraded')
      ? 'degraded'
      : 'healthy';
    
    return {
      status: overallStatus,
      checks: mockHealthChecks,
      query
    };
  }

  private initializeDashboardData(dashboardId: string): void {
    this.dashboardData.set(dashboardId, {
      widgets: [],
      lastRefresh: new Date().toISOString()
    });
  }

  private startRefreshInterval(dashboard: MonitoringDashboard): void {
    if (dashboard.refreshInterval <= 0) return;
    
    const interval = setInterval(async () => {
      try {
        await this.refreshDashboardData(dashboard.id);
      } catch (error) {
        this.logger.error('Dashboard refresh failed', {
          dashboardId: dashboard.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, dashboard.refreshInterval);
    
    this.refreshIntervals.set(dashboard.id, interval);
  }

  private stopRefreshInterval(dashboardId: string): void {
    const interval = this.refreshIntervals.get(dashboardId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(dashboardId);
    }
  }

  private createDefaultDashboards(): void {
    // System Overview Dashboard
    this.createDashboard({
      name: 'System Overview',
      refreshInterval: 30000, // 30 seconds
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        end: new Date()
      },
      widgets: [
        {
          id: randomUUID(),
          type: 'status',
          title: 'System Health',
          query: 'health.overall',
          config: {},
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: randomUUID(),
          type: 'metric',
          title: 'Total Requests',
          query: 'requests.total',
          config: { format: 'number' },
          position: { x: 6, y: 0, width: 3, height: 2 }
        },
        {
          id: randomUUID(),
          type: 'metric',
          title: 'Error Rate',
          query: 'requests.failed',
          config: { format: 'number', suffix: ' errors' },
          position: { x: 9, y: 0, width: 3, height: 2 }
        },
        {
          id: randomUUID(),
          type: 'chart',
          title: 'Response Time Trend',
          query: 'requests.averageResponseTime',
          config: { chartType: 'line' },
          position: { x: 0, y: 4, width: 12, height: 4 }
        },
        {
          id: randomUUID(),
          type: 'table',
          title: 'Top Endpoints',
          query: 'endpoints.stats',
          config: {},
          position: { x: 0, y: 8, width: 12, height: 4 }
        }
      ]
    });

    // Performance Dashboard
    this.createDashboard({
      name: 'Performance Metrics',
      refreshInterval: 15000, // 15 seconds
      timeRange: {
        start: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        end: new Date()
      },
      widgets: [
        {
          id: randomUUID(),
          type: 'chart',
          title: 'Memory Usage',
          query: 'performance.averageMemoryUsage',
          config: { chartType: 'area', unit: 'bytes' },
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: randomUUID(),
          type: 'chart',
          title: 'CPU Usage',
          query: 'performance.averageCpuUsage',
          config: { chartType: 'line', unit: 'percent' },
          position: { x: 6, y: 0, width: 6, height: 4 }
        },
        {
          id: randomUUID(),
          type: 'metric',
          title: 'Avg Response Time',
          query: 'requests.averageResponseTime',
          config: { format: 'number', suffix: 'ms' },
          position: { x: 0, y: 4, width: 4, height: 2 }
        },
        {
          id: randomUUID(),
          type: 'metric',
          title: 'Requests/Min',
          query: 'requests.rate',
          config: { format: 'number' },
          position: { x: 4, y: 4, width: 4, height: 2 }
        },
        {
          id: randomUUID(),
          type: 'metric',
          title: 'Error Rate %',
          query: 'requests.errorRate',
          config: { format: 'percentage' },
          position: { x: 8, y: 4, width: 4, height: 2 }
        }
      ]
    });
  }

  destroy(): void {
    // Clean up all refresh intervals
    for (const interval of this.refreshIntervals.values()) {
      clearInterval(interval);
    }
    this.refreshIntervals.clear();
  }
}

// Express endpoints for dashboard API
export function createDashboardEndpoints(dashboardManager: BoilerplateDashboardManager) {
  return {
    // GET /api/monitoring/dashboards
    listDashboards: (req: any, res: any) => {
      try {
        const dashboards = dashboardManager.getAllDashboards();
        res.json({ dashboards });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to list dashboards',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    },

    // GET /api/monitoring/dashboards/:id
    getDashboard: async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const dashboard = dashboardManager.getDashboard(id);
        
        if (!dashboard) {
          return res.status(404).json({ error: 'Dashboard not found' });
        }
        
        const data = await dashboardManager.getDashboardData(id);
        res.json({ dashboard, data });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to get dashboard',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    },

    // POST /api/monitoring/dashboards
    createDashboard: (req: any, res: any) => {
      try {
        const dashboard = dashboardManager.createDashboard(req.body);
        res.status(201).json({ dashboard });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to create dashboard',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    },

    // PUT /api/monitoring/dashboards/:id
    updateDashboard: (req: any, res: any) => {
      try {
        const { id } = req.params;
        const dashboard = dashboardManager.updateDashboard(id, req.body);
        
        if (!dashboard) {
          return res.status(404).json({ error: 'Dashboard not found' });
        }
        
        res.json({ dashboard });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to update dashboard',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    },

    // DELETE /api/monitoring/dashboards/:id
    deleteDashboard: (req: any, res: any) => {
      try {
        const { id } = req.params;
        const deleted = dashboardManager.deleteDashboard(id);
        
        if (!deleted) {
          return res.status(404).json({ error: 'Dashboard not found' });
        }
        
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to delete dashboard',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };
}