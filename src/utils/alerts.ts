// Production alerts and notification system
import { productionMonitor } from './monitoring';

interface AlertConfig {
  type: 'error' | 'performance' | 'uptime' | 'security';
  threshold: number;
  cooldown: number; // minutes
  channels: AlertChannel[];
}

interface AlertChannel {
  type: 'email' | 'webhook' | 'console' | 'storage';
  config: Record<string, any>;
}

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  data: any;
  acknowledged: boolean;
}

class AlertManager {
  private alerts: Alert[] = [];
  private alertConfigs: AlertConfig[] = [];
  private lastAlertTimes: Map<string, number> = new Map();

  constructor() {
    this.initializeAlertConfigs();
    this.startAlertMonitoring();
  }

  // Initialize alert configurations
  private initializeAlertConfigs(): void {
    this.alertConfigs = [
      // Error rate alerts
      {
        type: 'error',
        threshold: 5, // 5 errors in window
        cooldown: 15, // 15 minutes
        channels: [
          { type: 'console', config: {} },
          { type: 'storage', config: {} },
        ],
      },
      
      // Performance alerts
      {
        type: 'performance',
        threshold: 0.25, // 25% poor metrics
        cooldown: 30, // 30 minutes
        channels: [
          { type: 'console', config: {} },
          { type: 'storage', config: {} },
        ],
      },
      
      // Uptime alerts
      {
        type: 'uptime',
        threshold: 0.95, // Below 95% uptime
        cooldown: 5, // 5 minutes
        channels: [
          { type: 'console', config: {} },
          { type: 'storage', config: {} },
        ],
      },
    ];
  }

  // Start monitoring for alerts
  private startAlertMonitoring(): void {
    // Check every minute
    setInterval(() => {
      this.checkErrorRateAlerts();
      this.checkPerformanceAlerts();
      this.checkUptimeAlerts();
      this.cleanupOldAlerts();
    }, 60 * 1000);
  }

  // Check error rate alerts
  private checkErrorRateAlerts(): void {
    const errors = productionMonitor.getStoredErrors();
    const recentErrors = errors.filter(error => 
      new Date(error.timestamp) > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    );

    const config = this.alertConfigs.find(c => c.type === 'error');
    if (!config) return;

    if (recentErrors.length >= config.threshold) {
      this.createAlert({
        type: 'error_rate',
        severity: recentErrors.length > 10 ? 'critical' : 'high',
        message: `High error rate detected: ${recentErrors.length} errors in the last 15 minutes`,
        data: {
          errorCount: recentErrors.length,
          timeWindow: '15 minutes',
          errors: recentErrors.slice(-5), // Last 5 errors
        },
      });
    }
  }

  // Check performance alerts
  private checkPerformanceAlerts(): void {
    const summary = productionMonitor.getMonitoringSummary();
    const config = this.alertConfigs.find(c => c.type === 'performance');
    if (!config) return;

    Object.entries(summary.performance).forEach(([metric, data]: [string, any]) => {
      if (data.count === 0) return;
      
      const poorPercentage = (data.poor / data.count);
      
      if (poorPercentage >= config.threshold) {
        this.createAlert({
          type: 'performance_degradation',
          severity: poorPercentage > 0.5 ? 'critical' : 'medium',
          message: `Performance degradation in ${metric}: ${Math.round(poorPercentage * 100)}% poor metrics`,
          data: {
            metric,
            poorPercentage: Math.round(poorPercentage * 100),
            averageValue: data.average,
            totalMeasurements: data.count,
          },
        });
      }
    });
  }

  // Check uptime alerts
  private checkUptimeAlerts(): void {
    const uptimeHistory = productionMonitor.getUptimeHistory();
    const recentChecks = uptimeHistory.filter(check =>
      new Date(check.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    if (recentChecks.length === 0) return;

    const upChecks = recentChecks.filter(check => check.status === 'up');
    const uptimePercentage = upChecks.length / recentChecks.length;

    const config = this.alertConfigs.find(c => c.type === 'uptime');
    if (!config) return;

    if (uptimePercentage < config.threshold) {
      this.createAlert({
        type: 'uptime_degradation',
        severity: uptimePercentage < 0.8 ? 'critical' : 'high',
        message: `Low uptime detected: ${Math.round(uptimePercentage * 100)}% in the last hour`,
        data: {
          uptimePercentage: Math.round(uptimePercentage * 100),
          totalChecks: recentChecks.length,
          downChecks: recentChecks.length - upChecks.length,
          timeWindow: '1 hour',
        },
      });
    }
  }

  // Create and send alert
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alertKey = `${alertData.type}_${alertData.severity}`;
    const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;
    const config = this.alertConfigs.find(c => c.type === alertData.type.split('_')[0]);
    
    if (!config) return;

    // Check cooldown
    const now = Date.now();
    if (now - lastAlertTime < config.cooldown * 60 * 1000) {
      return; // Still in cooldown period
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alertData,
    };

    this.alerts.push(alert);
    this.lastAlertTimes.set(alertKey, now);

    // Send through configured channels
    config.channels.forEach(channel => {
      this.sendAlert(alert, channel);
    });

    // Store alert
    this.storeAlert(alert);
  }

  // Send alert through channel
  private async sendAlert(alert: Alert, channel: AlertChannel): Promise<void> {
    try {
      switch (channel.type) {
        case 'console':
          this.sendConsoleAlert(alert);
          break;
        
        case 'storage':
          this.sendStorageAlert(alert);
          break;
        
        case 'webhook':
          await this.sendWebhookAlert(alert, channel.config);
          break;
        
        case 'email':
          await this.sendEmailAlert(alert, channel.config);
          break;
      }
    } catch (error) {
      console.error(`Failed to send alert through ${channel.type}:`, error);
    }
  }

  // Send console alert
  private sendConsoleAlert(alert: Alert): void {
    const emoji = this.getSeverityEmoji(alert.severity);
    const message = `${emoji} ALERT [${alert.severity.toUpperCase()}] ${alert.message}`;
    
    switch (alert.severity) {
      case 'critical':
        console.error(message, alert.data);
        break;
      case 'high':
        console.warn(message, alert.data);
        break;
      default:
        console.info(message, alert.data);
    }
  }

  // Send storage alert
  private sendStorageAlert(alert: Alert): void {
    const alerts = this.getStoredAlerts();
    alerts.push(alert);
    
    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts.splice(0, alerts.length - 100);
    }
    
    localStorage.setItem('production-alerts', JSON.stringify(alerts));
  }

  // Send webhook alert
  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    if (!config.url) return;

    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'comercializadora-cf',
      environment: import.meta.env.VITE_APP_ENV,
    };

    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
      body: JSON.stringify(payload),
    });
  }

  // Send email alert
  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    // Implementation would depend on your email service
    console.log('Email alert would be sent:', { alert, config });
  }

  // Generate alert ID
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get severity emoji
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return 'ℹ️';
      default: return '📢';
    }
  }

  // Store alert
  private storeAlert(alert: Alert): void {
    // Store in memory
    this.alerts.push(alert);
    
    // Keep only last 50 alerts in memory
    if (this.alerts.length > 50) {
      this.alerts.splice(0, this.alerts.length - 50);
    }
  }

  // Clean up old alerts
  private cleanupOldAlerts(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > cutoff
    );
  }

  // Get stored alerts
  public getStoredAlerts(): Alert[] {
    try {
      const stored = localStorage.getItem('production-alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Get active alerts
  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  // Acknowledge alert
  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }

    // Update stored alerts
    const storedAlerts = this.getStoredAlerts();
    const storedAlert = storedAlerts.find(a => a.id === alertId);
    if (storedAlert) {
      storedAlert.acknowledged = true;
      localStorage.setItem('production-alerts', JSON.stringify(storedAlerts));
    }
  }

  // Get alert summary
  public getAlertSummary(): any {
    const alerts = this.getStoredAlerts();
    const activeAlerts = alerts.filter(a => !a.acknowledged);
    
    return {
      total: alerts.length,
      active: activeAlerts.length,
      bySeverity: {
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length,
      },
      byType: activeAlerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Clear all alerts
  public clearAlerts(): void {
    this.alerts = [];
    localStorage.removeItem('production-alerts');
  }
}

// Global alert manager instance
export const alertManager = new AlertManager();

// Export alert functions
export const {
  getStoredAlerts,
  getActiveAlerts,
  acknowledgeAlert,
  getAlertSummary,
  clearAlerts,
} = alertManager;
