// Utilidades para monitoreo de rendimiento en producción
import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

// Configuración de métricas
interface PerformanceConfig {
  endpoint?: string;
  debug?: boolean;
  sampleRate?: number;
}

// Métricas de rendimiento
interface PerformanceMetrics {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      debug: false,
      sampleRate: 1,
      ...config,
    };
  }

  // Inicializar monitoreo de Web Vitals
  public initWebVitals(): void {
    if (typeof window === 'undefined') return;

    const handleMetric = (metric: Metric) => {
      const performanceMetric: PerformanceMetrics = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType || 'unknown',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      this.metrics.push(performanceMetric);
      
      if (this.config.debug) {
        console.log(`[Performance] ${metric.name}:`, performanceMetric);
      }

      this.sendMetric(performanceMetric);
    };

    // Registrar métricas de Web Vitals
    onCLS(handleMetric);
    onINP(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }

  // Monitorear recursos
  public monitorResources(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Solo monitorear recursos importantes
          if (this.shouldMonitorResource(resourceEntry.name)) {
            const metric: PerformanceMetrics = {
              name: 'resource-timing',
              value: resourceEntry.duration,
              rating: this.getRatingForDuration(resourceEntry.duration),
              delta: 0,
              id: resourceEntry.name,
              navigationType: 'resource',
              timestamp: Date.now(),
              url: resourceEntry.name,
              userAgent: navigator.userAgent,
            };

            if (this.config.debug) {
              console.log('[Performance] Resource:', metric);
            }

            this.sendMetric(metric);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  // Monitorear errores de JavaScript
  public monitorErrors(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      const errorMetric: PerformanceMetrics = {
        name: 'javascript-error',
        value: 1,
        rating: 'poor',
        delta: 0,
        id: `${event.filename}:${event.lineno}:${event.colno}`,
        navigationType: 'error',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      if (this.config.debug) {
        console.error('[Performance] JS Error:', errorMetric, event.error);
      }

      this.sendMetric(errorMetric);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const errorMetric: PerformanceMetrics = {
        name: 'unhandled-promise-rejection',
        value: 1,
        rating: 'poor',
        delta: 0,
        id: event.reason?.toString?.() || String(event.reason) || 'unknown',
        navigationType: 'error',
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      if (this.config.debug) {
        console.error('[Performance] Promise Rejection:', errorMetric, event.reason);
      }

      this.sendMetric(errorMetric);
    });
  }

  // Enviar métrica al endpoint
  private sendMetric(metric: PerformanceMetrics): void {
    // Aplicar sample rate
    if (Math.random() > (this.config.sampleRate || 1)) return;

    if (this.config.endpoint) {
      // Enviar a endpoint personalizado
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      }).catch((error) => {
        if (this.config.debug) {
          console.error('[Performance] Failed to send metric:', error);
        }
      });
    } else {
      // Almacenar localmente para desarrollo
      const stored = localStorage.getItem('performance-metrics');
      const metrics = stored ? JSON.parse(stored) : [];
      metrics.push(metric);
      
      // Mantener solo las últimas 100 métricas
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100);
      }
      
      localStorage.setItem('performance-metrics', JSON.stringify(metrics));
    }
  }

  // Determinar si debe monitorear un recurso
  private shouldMonitorResource(url: string): boolean {
    // Monitorear solo recursos importantes
    const importantPatterns = [
      /\.js$/,
      /\.css$/,
      /\.woff2?$/,
      /api\//,
      /firebase/,
    ];

    return importantPatterns.some(pattern => pattern.test(url));
  }

  // Obtener rating basado en duración
  private getRatingForDuration(duration: number): 'good' | 'needs-improvement' | 'poor' {
    if (duration < 100) return 'good';
    if (duration < 300) return 'needs-improvement';
    return 'poor';
  }

  // Obtener métricas almacenadas
  public getStoredMetrics(): PerformanceMetrics[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem('performance-metrics');
    return stored ? JSON.parse(stored) : [];
  }

  // Limpiar métricas almacenadas
  public clearStoredMetrics(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('performance-metrics');
    }
  }

  // Obtener resumen de rendimiento
  public getPerformanceSummary(): Record<string, any> {
    const metrics = this.getStoredMetrics();
    const summary: Record<string, any> = {};

    metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          total: 0,
          good: 0,
          needsImprovement: 0,
          poor: 0,
        };
      }

      summary[metric.name].count++;
      summary[metric.name].total += metric.value;
      summary[metric.name][metric.rating === 'good' ? 'good' : 
                           metric.rating === 'needs-improvement' ? 'needsImprovement' : 'poor']++;
    });

    // Calcular promedios
    Object.keys(summary).forEach(key => {
      summary[key].average = summary[key].total / summary[key].count;
    });

    return summary;
  }
}

// Instancia global del monitor
export const performanceMonitor = new PerformanceMonitor({
  debug: import.meta.env.DEV,
  sampleRate: import.meta.env.PROD ? 0.1 : 1, // 10% en producción, 100% en desarrollo
});

// Hook para usar el monitor de rendimiento
export const usePerformanceMonitor = () => {
  return {
    monitor: performanceMonitor,
    getMetrics: () => performanceMonitor.getStoredMetrics(),
    getSummary: () => performanceMonitor.getPerformanceSummary(),
    clearMetrics: () => performanceMonitor.clearStoredMetrics(),
  };
};

// Inicializar automáticamente en el cliente
if (typeof window !== 'undefined') {
  performanceMonitor.initWebVitals();
  performanceMonitor.monitorResources();
  performanceMonitor.monitorErrors();
}
