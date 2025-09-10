// Production monitoring and analytics utilities
import { performanceMonitor } from './performance';

// Error tracking configuration
interface ErrorTrackingConfig {
  dsn?: string;
  environment: string;
  release?: string;
  sampleRate: number;
  enableConsoleCapture: boolean;
}

// Analytics configuration
interface AnalyticsConfig {
  measurementId?: string;
  enablePageViews: boolean;
  enableUserProperties: boolean;
  enableCustomEvents: boolean;
}

// Uptime monitoring
interface UptimeConfig {
  endpoint: string;
  interval: number; // minutes
  timeout: number; // seconds
}

class ProductionMonitor {
  private errorConfig: ErrorTrackingConfig;
  private analyticsConfig: AnalyticsConfig;
  private uptimeConfig?: UptimeConfig;

  constructor() {
    this.errorConfig = {
      environment: import.meta.env.VITE_APP_ENV || 'production',
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      sampleRate: 1.0,
      enableConsoleCapture: true,
    };

    this.analyticsConfig = {
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      enablePageViews: true,
      enableUserProperties: true,
      enableCustomEvents: true,
    };

    this.initializeMonitoring();
  }

  // Initialize all monitoring systems
  private initializeMonitoring(): void {
    if (import.meta.env.PROD) {
      this.initErrorTracking();
      this.initAnalytics();
      this.initUptimeMonitoring();
      this.initPerformanceAlerts();
    }
  }

  // Initialize error tracking
  private initErrorTracking(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'promise-rejection',
        promise: event.promise,
      });
    });

    // Console error capture
    if (this.errorConfig.enableConsoleCapture) {
      const originalError = console.error;
      console.error = (...args) => {
        this.captureError(new Error(args.join(' ')), {
          type: 'console-error',
          args,
        });
        originalError.apply(console, args);
      };
    }
  }

  // Capture and send errors
  private captureError(error: Error, context: Record<string, any> = {}): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      environment: this.errorConfig.environment,
      release: this.errorConfig.release,
      context,
      user: this.getCurrentUser(),
      breadcrumbs: this.getBreadcrumbs(),
    };

    // Send to error tracking service
    this.sendErrorReport(errorData);

    // Log locally for development
    if (import.meta.env.DEV) {
      console.error('Error captured:', errorData);
    }
  }

  // Send error report to monitoring service
  private async sendErrorReport(errorData: any): Promise<void> {
    try {
      // Sample rate check
      if (Math.random() > this.errorConfig.sampleRate) return;

      // Send to your error tracking service (e.g., Sentry, LogRocket, etc.)
      if (this.errorConfig.dsn) {
        await fetch(this.errorConfig.dsn, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorData),
        });
      }

      // Store locally as fallback
      const errors = this.getStoredErrors();
      errors.push(errorData);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('production-errors', JSON.stringify(errors));
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  // Initialize analytics
  private initAnalytics(): void {
    if (!this.analyticsConfig.measurementId) return;

    // Initialize Google Analytics 4
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.analyticsConfig.measurementId}`;
    document.head.appendChild(script);

    // Configure gtag
    window.gtag = window.gtag || function() {
      (window.gtag.q = window.gtag.q || []).push(arguments);
    };
    
    window.gtag('js', new Date());
    window.gtag('config', this.analyticsConfig.measurementId, {
      page_title: document.title,
      page_location: window.location.href,
    });

    // Track page views
    if (this.analyticsConfig.enablePageViews) {
      this.trackPageView();
    }
  }

  // Track page views
  public trackPageView(page?: string): void {
    if (!this.analyticsConfig.enablePageViews || !window.gtag) return;

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: page || window.location.href,
    });
  }

  // Track custom events
  public trackEvent(eventName: string, parameters: Record<string, any> = {}): void {
    if (!this.analyticsConfig.enableCustomEvents || !window.gtag) return;

    window.gtag('event', eventName, {
      ...parameters,
      timestamp: new Date().toISOString(),
    });
  }

  // Set user properties
  public setUserProperties(properties: Record<string, any>): void {
    if (!this.analyticsConfig.enableUserProperties || !window.gtag) return;

    window.gtag('config', this.analyticsConfig.measurementId, {
      user_properties: properties,
    });
  }

  // Initialize uptime monitoring
  private initUptimeMonitoring(): void {
    if (!this.uptimeConfig) return;

    setInterval(() => {
      this.checkUptime();
    }, this.uptimeConfig.interval * 60 * 1000);

    // Initial check
    this.checkUptime();
  }

  // Check application uptime
  private async checkUptime(): Promise<void> {
    if (!this.uptimeConfig) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.uptimeConfig.timeout * 1000);

      const response = await fetch(this.uptimeConfig.endpoint, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const uptimeData = {
        timestamp: new Date().toISOString(),
        status: response.ok ? 'up' : 'down',
        responseTime: performance.now(),
        statusCode: response.status,
      };

      this.reportUptime(uptimeData);
    } catch (error) {
      this.reportUptime({
        timestamp: new Date().toISOString(),
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Report uptime status
  private reportUptime(data: any): void {
    // Send to monitoring service
    console.log('Uptime check:', data);
    
    // Store locally
    const uptimeHistory = this.getUptimeHistory();
    uptimeHistory.push(data);
    
    // Keep only last 100 checks
    if (uptimeHistory.length > 100) {
      uptimeHistory.splice(0, uptimeHistory.length - 100);
    }
    
    localStorage.setItem('uptime-history', JSON.stringify(uptimeHistory));
  }

  // Initialize performance alerts
  private initPerformanceAlerts(): void {
    // Monitor Web Vitals and alert on poor performance
    const checkPerformance = () => {
      const summary = performanceMonitor.getPerformanceSummary();
      
      Object.entries(summary).forEach(([metric, data]: [string, any]) => {
        const poorPercentage = (data.poor / data.count) * 100;
        
        if (poorPercentage > 25) { // Alert if more than 25% of metrics are poor
          this.trackEvent('performance_alert', {
            metric,
            poor_percentage: poorPercentage,
            average_value: data.average,
            total_measurements: data.count,
          });
        }
      });
    };

    // Check every 5 minutes
    setInterval(checkPerformance, 5 * 60 * 1000);
  }

  // Get current user info
  private getCurrentUser(): any {
    // Get user info from your auth system
    return {
      id: 'anonymous',
      timestamp: new Date().toISOString(),
    };
  }

  // Get breadcrumbs for error context
  private getBreadcrumbs(): any[] {
    // Return navigation/action history
    return [
      {
        timestamp: new Date().toISOString(),
        category: 'navigation',
        message: `Current page: ${window.location.pathname}`,
      },
    ];
  }

  // Get stored errors
  public getStoredErrors(): any[] {
    try {
      const stored = localStorage.getItem('production-errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Get uptime history
  public getUptimeHistory(): any[] {
    try {
      const stored = localStorage.getItem('uptime-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Clear stored data
  public clearStoredData(): void {
    localStorage.removeItem('production-errors');
    localStorage.removeItem('uptime-history');
  }

  // Get monitoring summary
  public getMonitoringSummary(): any {
    const errors = this.getStoredErrors();
    const uptime = this.getUptimeHistory();
    const performance = performanceMonitor.getPerformanceSummary();

    return {
      errors: {
        total: errors.length,
        recent: errors.filter(e => 
          new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
      },
      uptime: {
        total_checks: uptime.length,
        up_percentage: uptime.length > 0 ? 
          (uptime.filter(u => u.status === 'up').length / uptime.length) * 100 : 0,
      },
      performance,
    };
  }
}

// Global monitoring instance
export const productionMonitor = new ProductionMonitor();

// Extend window type for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Export monitoring functions
export const {
  trackPageView,
  trackEvent,
  setUserProperties,
  getStoredErrors,
  getUptimeHistory,
  clearStoredData,
  getMonitoringSummary,
} = productionMonitor;
