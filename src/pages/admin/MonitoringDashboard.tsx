import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Button,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { usePerformanceMonitor } from '../../utils/performance';
import { 
  getStoredAlerts, 
  acknowledgeAlert, 
  getAlertSummary,
  clearAlerts 
} from '../../utils/alerts';
import { 
  getMonitoringSummary,
  clearStoredData 
} from '../../utils/monitoring';
import PerformanceMetrics from '../../components/performance/PerformanceMetrics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MonitoringDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [monitoringData, setMonitoringData] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertSummary, setAlertSummary] = useState<any>({});

  const { getSummary: getPerformanceSummary } = usePerformanceMonitor();

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      const summary = getMonitoringSummary();
      const storedAlerts = getStoredAlerts();
      const alertSum = getAlertSummary();
      const performanceSummary = getPerformanceSummary();

      setMonitoringData({
        ...summary,
        performance: performanceSummary,
      });
      setAlerts(storedAlerts);
      setAlertSummary(alertSum);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoringData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    acknowledgeAlert(alertId);
    loadMonitoringData();
  };

  const handleClearAllAlerts = () => {
    clearAlerts();
    loadMonitoringData();
  };

  const handleClearAllData = () => {
    clearStoredData();
    clearAlerts();
    loadMonitoringData();
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'success';
    if (percentage >= 90) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  if (loading && Object.keys(monitoringData).length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando dashboard de monitoreo...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard de Monitoreo
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadMonitoringData}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleClearAllData}
          >
            Limpiar Datos
          </Button>
        </Box>
      </Box>

      {/* Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Errores</Typography>
              </Box>
              <Typography variant="h4" color="error">
                {monitoringData.errors?.recent || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Últimas 24 horas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TimelineIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Uptime</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {Math.round(monitoringData.uptime?.up_percentage || 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Disponibilidad
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <NotificationsIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Alertas</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {alertSummary.active || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Activas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SpeedIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Performance</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {Object.keys(monitoringData.performance || {}).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Métricas activas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Alerts */}
      {alertSummary.active > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleClearAllAlerts}>
              Limpiar Todas
            </Button>
          }
        >
          Hay {alertSummary.active} alertas activas que requieren atención.
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Resumen" />
          <Tab label="Alertas" />
          <Tab label="Errores" />
          <Tab label="Performance" />
          <Tab label="Uptime" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardHeader title="Estado del Sistema" />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Errores recientes: {monitoringData.errors?.recent || 0}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, 100 - (monitoringData.errors?.recent || 0) * 10)}
                    color={monitoringData.errors?.recent > 5 ? 'error' : 'success'}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Uptime: {Math.round(monitoringData.uptime?.up_percentage || 100)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={monitoringData.uptime?.up_percentage || 100}
                    color={getStatusColor(monitoringData.uptime?.up_percentage || 100)}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardHeader title="Alertas por Severidad" />
              <CardContent>
                {alertSummary.bySeverity ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      label={`Críticas: ${alertSummary.bySeverity.critical || 0}`}
                      color="error"
                      variant={alertSummary.bySeverity.critical > 0 ? 'filled' : 'outlined'}
                    />
                    <Chip
                      label={`Altas: ${alertSummary.bySeverity.high || 0}`}
                      color="warning"
                      variant={alertSummary.bySeverity.high > 0 ? 'filled' : 'outlined'}
                    />
                    <Chip
                      label={`Medias: ${alertSummary.bySeverity.medium || 0}`}
                      color="info"
                      variant={alertSummary.bySeverity.medium > 0 ? 'filled' : 'outlined'}
                    />
                    <Chip
                      label={`Bajas: ${alertSummary.bySeverity.low || 0}`}
                      color="default"
                      variant={alertSummary.bySeverity.low > 0 ? 'filled' : 'outlined'}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay alertas configuradas
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardHeader 
            title="Alertas del Sistema"
            action={
              <Button onClick={handleClearAllAlerts} color="error">
                Limpiar Todas
              </Button>
            }
          />
          <CardContent>
            {alerts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay alertas registradas
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Severidad</TableCell>
                      <TableCell>Mensaje</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alerts.slice(-20).reverse().map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{alert.type}</TableCell>
                        <TableCell>
                          <Chip
                            label={alert.severity}
                            color={getSeverityColor(alert.severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>
                          {new Date(alert.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {alert.acknowledged ? (
                            <Chip label="Reconocida" color="success" size="small" />
                          ) : (
                            <Chip label="Activa" color="warning" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {!alert.acknowledged && (
                            <Tooltip title="Reconocer alerta">
                              <IconButton
                                size="small"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardHeader title="Registro de Errores" />
          <CardContent>
            {monitoringData.errors?.total === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay errores registrados
              </Typography>
            ) : (
              <Typography variant="body1">
                Total de errores: {monitoringData.errors?.total || 0}
                <br />
                Errores recientes (24h): {monitoringData.errors?.recent || 0}
              </Typography>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <PerformanceMetrics />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Card>
          <CardHeader title="Historial de Uptime" />
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Estadísticas de Disponibilidad
            </Typography>
            <Typography variant="body1">
              Checks totales: {monitoringData.uptime?.total_checks || 0}
              <br />
              Porcentaje de uptime: {Math.round(monitoringData.uptime?.up_percentage || 100)}%
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
};

export default MonitoringDashboard;
