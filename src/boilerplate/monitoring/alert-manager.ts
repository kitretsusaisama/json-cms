/**
 * Alert Manager Implementation
 * 
 * Provides alerting capabilities based on metrics thresholds,
 * error rates, and system health status.
 */

import { 
  AlertManager, 
  AlertRule, 
  Alert, 
  AlertCondition, 
  AlertChannel, 
  MetricsSummary,
  MonitoringConfig 
} from './interfaces';
import { getLogger } from './structured-logger';
import { randomUUID } from 'crypto';

export class BoilerplateAlertManager implements AlertManager {
  private config: MonitoringConfig['alerts'];
  private logger = getLogger();
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private evaluationInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig['alerts']) {
    this.config = config;
    
    if (config.enabled) {
      this.setupDefaultRules();
      this.startEvaluation();
    }
  }

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info('Alert rule added', { 
      ruleId: rule.id, 
      ruleName: rule.name,
      severity: rule.severity 
    });
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.logger.info('Alert rule removed', { ruleId });
  }

  async evaluateRules(metrics: MetricsSummary): Promise<Alert[]> {
    const newAlerts: Alert[] = [];
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      try {
        const shouldAlert = await this.evaluateRule(rule, metrics);
        
        if (shouldAlert) {
          const existingAlert = Array.from(this.activeAlerts.values())
            .find(alert => alert.ruleId === rule.id && !alert.resolved);
          
          if (!existingAlert) {
            const alert = this.createAlert(rule, metrics);
            this.activeAlerts.set(alert.id, alert);
            newAlerts.push(alert);
            
            this.logger.warn('Alert triggered', {
              alertId: alert.id,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: alert.severity
            });
          }
        } else {
          // Check if we should resolve existing alerts for this rule
          const existingAlert = Array.from(this.activeAlerts.values())
            .find(alert => alert.ruleId === rule.id && !alert.resolved);
          
          if (existingAlert) {
            await this.resolveAlert(existingAlert.id);
          }
        }
      } catch (error) {
        this.logger.error('Failed to evaluate alert rule', {
          ruleId: rule.id,
          ruleName: rule.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return newAlerts;
  }

  async sendAlert(alert: Alert): Promise<void> {
    const rule = this.rules.get(alert.ruleId);
    if (!rule) {
      this.logger.error('Cannot send alert: rule not found', { 
        alertId: alert.id, 
        ruleId: alert.ruleId 
      });
      return;
    }
    
    const channels = rule.channels.length > 0 ? rule.channels : this.config.defaultChannels;
    
    for (const channel of channels) {
      try {
        await this.sendToChannel(alert, channel, rule);
        this.logger.info('Alert sent to channel', {
          alertId: alert.id,
          channelType: channel.type,
          severity: alert.severity
        });
      } catch (error) {
        this.logger.error('Failed to send alert to channel', {
          alertId: alert.id,
          channelType: channel.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.resolved) {
      return;
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    
    this.logger.info('Alert resolved', {
      alertId: alert.id,
      ruleId: alert.ruleId,
      duration: new Date(alert.resolvedAt).getTime() - new Date(alert.timestamp).getTime()
    });
    
    // Send resolution notification
    const rule = this.rules.get(alert.ruleId);
    if (rule) {
      const channels = rule.channels.length > 0 ? rule.channels : this.config.defaultChannels;
      
      for (const channel of channels) {
        try {
          await this.sendResolutionToChannel(alert, channel, rule);
        } catch (error) {
          this.logger.error('Failed to send resolution to channel', {
            alertId: alert.id,
            channelType: channel.type,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        // Sort by severity (critical first) then by timestamp
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  private async evaluateRule(rule: AlertRule, metrics: MetricsSummary): Promise<boolean> {
    const value = this.extractMetricValue(rule.condition.metric, metrics);
    if (value === undefined) {
      return false;
    }
    
    const aggregatedValue = this.applyAggregation(value, rule.condition.aggregation);
    
    switch (rule.condition.operator) {
      case 'gt':
        return aggregatedValue > rule.threshold;
      case 'gte':
        return aggregatedValue >= rule.threshold;
      case 'lt':
        return aggregatedValue < rule.threshold;
      case 'lte':
        return aggregatedValue <= rule.threshold;
      case 'eq':
        return aggregatedValue === rule.threshold;
      default:
        return false;
    }
  }

  private extractMetricValue(metricPath: string, metrics: MetricsSummary): number | undefined {
    const parts = metricPath.split('.');
    let current: any = metrics;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'number' ? current : undefined;
  }

  private applyAggregation(value: number, aggregation?: string): number {
    // For single values, aggregation doesn't apply
    // In a real implementation, you might have arrays of values to aggregate
    return value;
  }

  private createAlert(rule: AlertRule, metrics: MetricsSummary): Alert {
    const metricValue = this.extractMetricValue(rule.condition.metric, metrics);
    
    return {
      id: randomUUID(),
      ruleId: rule.id,
      message: this.formatAlertMessage(rule, metricValue),
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata: {
        metricValue,
        threshold: rule.threshold,
        condition: rule.condition,
        metrics: metrics
      }
    };
  }

  private formatAlertMessage(rule: AlertRule, metricValue?: number): string {
    const operator = this.getOperatorSymbol(rule.condition.operator);
    return `${rule.name}: ${rule.condition.metric} (${metricValue}) ${operator} ${rule.threshold}`;
  }

  private getOperatorSymbol(operator: string): string {
    switch (operator) {
      case 'gt': return '>';
      case 'gte': return '>=';
      case 'lt': return '<';
      case 'lte': return '<=';
      case 'eq': return '=';
      default: return operator;
    }
  }

  private async sendToChannel(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(alert, channel, rule);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, channel, rule);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, channel, rule);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  private async sendResolutionToChannel(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailResolution(alert, channel, rule);
        break;
      case 'webhook':
        await this.sendWebhookResolution(alert, channel, rule);
        break;
      case 'slack':
        await this.sendSlackResolution(alert, channel, rule);
        break;
    }
  }

  private async sendEmailAlert(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    // In a real implementation, integrate with email service like SendGrid, SES, etc.
    const emailConfig = channel.config as {
      to: string[];
      from: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
    };
    
    const subject = `🚨 Alert: ${rule.name} (${alert.severity.toUpperCase()})`;
    const body = `
Alert Details:
- Rule: ${rule.name}
- Severity: ${alert.severity.toUpperCase()}
- Message: ${alert.message}
- Timestamp: ${alert.timestamp}
- Alert ID: ${alert.id}

Metadata:
${JSON.stringify(alert.metadata, null, 2)}
    `;
    
    // Placeholder for actual email sending
    this.logger.info('Email alert would be sent', {
      to: emailConfig.to,
      subject,
      alertId: alert.id
    });
  }

  private async sendWebhookAlert(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    const webhookConfig = channel.config as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      auth?: {
        type: 'bearer' | 'basic';
        token?: string;
        username?: string;
        password?: string;
      };
    };
    
    const payload = {
      type: 'alert',
      alert,
      rule: {
        id: rule.id,
        name: rule.name,
        severity: rule.severity
      },
      timestamp: new Date().toISOString()
    };
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...webhookConfig.headers
    };
    
    if (webhookConfig.auth) {
      if (webhookConfig.auth.type === 'bearer' && webhookConfig.auth.token) {
        headers['Authorization'] = `Bearer ${webhookConfig.auth.token}`;
      } else if (webhookConfig.auth.type === 'basic' && webhookConfig.auth.username && webhookConfig.auth.password) {
        const credentials = Buffer.from(`${webhookConfig.auth.username}:${webhookConfig.auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
    }
    
    const response = await fetch(webhookConfig.url, {
      method: webhookConfig.method || 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendSlackAlert(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    const slackConfig = channel.config as {
      webhookUrl: string;
      channel?: string;
      username?: string;
      iconEmoji?: string;
    };
    
    const severityEmoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    };
    
    const payload = {
      channel: slackConfig.channel,
      username: slackConfig.username || 'CMS Alert Bot',
      icon_emoji: slackConfig.iconEmoji || ':warning:',
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        title: `${severityEmoji[alert.severity]} Alert: ${rule.name}`,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: alert.timestamp,
            short: true
          },
          {
            title: 'Alert ID',
            value: alert.id,
            short: true
          }
        ],
        footer: 'CMS Monitoring System',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    };
    
    const response = await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Slack webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendEmailResolution(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    // Similar to sendEmailAlert but for resolution
    this.logger.info('Email resolution would be sent', {
      alertId: alert.id,
      resolvedAt: alert.resolvedAt
    });
  }

  private async sendWebhookResolution(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    const webhookConfig = channel.config as any;
    
    const payload = {
      type: 'resolution',
      alert,
      rule: {
        id: rule.id,
        name: rule.name,
        severity: rule.severity
      },
      timestamp: new Date().toISOString()
    };
    
    await fetch(webhookConfig.url, {
      method: webhookConfig.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...webhookConfig.headers
      },
      body: JSON.stringify(payload)
    });
  }

  private async sendSlackResolution(alert: Alert, channel: AlertChannel, rule: AlertRule): Promise<void> {
    const slackConfig = channel.config as any;
    
    const payload = {
      channel: slackConfig.channel,
      username: slackConfig.username || 'CMS Alert Bot',
      icon_emoji: slackConfig.iconEmoji || ':white_check_mark:',
      attachments: [{
        color: 'good',
        title: `✅ Resolved: ${rule.name}`,
        text: `Alert has been resolved: ${alert.message}`,
        fields: [
          {
            title: 'Resolved At',
            value: alert.resolvedAt,
            short: true
          },
          {
            title: 'Duration',
            value: this.formatDuration(alert.timestamp, alert.resolvedAt!),
            short: true
          }
        ],
        footer: 'CMS Monitoring System'
      }]
    };
    
    await fetch(slackConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return '#ffeb3b';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      case 'critical': return '#9c27b0';
      default: return '#607d8b';
    }
  }

  private formatDuration(start: string, end: string): string {
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  private setupDefaultRules(): void {
    // High error rate alert
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: {
        metric: 'requests.failed',
        operator: 'gt',
        aggregation: 'count'
      },
      threshold: 10,
      timeWindow: 300, // 5 minutes
      severity: 'high',
      enabled: true,
      channels: []
    });
    
    // High response time alert
    this.addRule({
      id: 'high-response-time',
      name: 'High Response Time',
      condition: {
        metric: 'requests.averageResponseTime',
        operator: 'gt',
        aggregation: 'avg'
      },
      threshold: 5000, // 5 seconds
      timeWindow: 300,
      severity: 'medium',
      enabled: true,
      channels: []
    });
    
    // Memory usage alert
    this.addRule({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      condition: {
        metric: 'performance.averageMemoryUsage',
        operator: 'gt'
      },
      threshold: 1024 * 1024 * 1024, // 1GB
      timeWindow: 300,
      severity: 'medium',
      enabled: true,
      channels: []
    });
  }

  private startEvaluation(): void {
    if (!this.config.evaluationInterval) return;
    
    this.evaluationInterval = setInterval(async () => {
      try {
        // In a real implementation, you would get current metrics here
        // For now, we'll skip automatic evaluation
        this.logger.debug('Alert evaluation cycle completed');
      } catch (error) {
        this.logger.error('Alert evaluation failed', {}, error as Error);
      }
    }, this.config.evaluationInterval);
  }

  destroy(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }
  }
}