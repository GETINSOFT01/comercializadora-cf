import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { usePerformanceMonitor } from '../../utils/performance';

interface MetricSummary {
  count: number;
  total: number;
  average: number;
  good: number;
  needsImprovement: number;
  poor: number;
}

const PerformanceMetrics: React.FC = () => {
  const { getMetrics, getSummary, clearMetrics } = usePerformanceMonitor();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, MetricSummary>>({});
  const [loading, setLoading] = useState(false);

  const loadMetrics = () => {
    setLoading(true);
    try {
      const metricsData = getMetrics();
      const summaryData = getSummary();
      setMetrics(metricsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleClearMetrics = () => {
    clearMetrics();
    loadMetrics();
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'success';
      case 'needs-improvement':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatValue = (name: string, value: number) => {
    if (name.includes('CLS')) {
      return value.toFixed(3);
    }
    if (name.includes('time') || name.includes('FCP') || name.includes('LCP') || name.includes('TTFB')) {
      return `${Math.round(value)}ms`;
    }
    return value.toString();
  };

  const getScorePercentage = (good: number, needsImprovement: number, poor: number) => {
    const total = good + needsImprovement + poor;
    if (total === 0) return 0;
    return Math.round((good / total) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Cargando métricas de rendimiento...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Métricas de Rendimiento"
          subheader={`${metrics.length} métricas registradas`}
          avatar={<SpeedIcon />}
          action={
            <Box>
              <Button
                startIcon={<RefreshIcon />}
                onClick={loadMetrics}
                sx={{ mr: 1 }}
              >
                Actualizar
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                onClick={handleClearMetrics}
                color="error"
                variant="outlined"
              >
                Limpiar
              </Button>
            </Box>
          }
        />
        <CardContent>
          {Object.keys(summary).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay métricas disponibles. Las métricas se recopilarán automáticamente mientras usas la aplicación.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {Object.entries(summary).map(([metricName, data]) => (
                <Grid key={metricName} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {metricName.toUpperCase()}
                      </Typography>
                      <Typography variant="h4" color="primary" gutterBottom>
                        {formatValue(metricName, data.average)}
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Score: {getScorePercentage(data.good, data.needsImprovement, data.poor)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={getScorePercentage(data.good, data.needsImprovement, data.poor)}
                          color={
                            getScorePercentage(data.good, data.needsImprovement, data.poor) >= 75
                              ? 'success'
                              : getScorePercentage(data.good, data.needsImprovement, data.poor) >= 50
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Bueno: ${data.good}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                        <Chip
                          label={`Regular: ${data.needsImprovement}`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                        <Chip
                          label={`Malo: ${data.poor}`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {data.count} mediciones
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {metrics.length > 0 && (
        <Card>
          <CardHeader
            title="Historial de Métricas"
            avatar={<TimelineIcon />}
          />
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Métrica</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>URL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.slice(-20).reverse().map((metric, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {metric.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatValue(metric.name, metric.value)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={metric.rating}
                          size="small"
                          color={getRatingColor(metric.rating) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" noWrap>
                          {metric.url.split('/').pop() || metric.url}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PerformanceMetrics;
