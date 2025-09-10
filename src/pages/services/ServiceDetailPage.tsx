import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, onSnapshot, collection, query, where, orderBy, getDocs, startAfter, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Service, ServiceStatus } from '../../types';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  TextField,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import DailyReportForm from '../../components/DailyReportForm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      id={`service-tabpanel-${index}`}
      aria-labelledby={`service-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}



export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ServiceStatus>();
  const [statusChangeNotes, setStatusChangeNotes] = useState('');
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [radViewerOpen, setRadViewerOpen] = useState(false);
  const [selectedRad, setSelectedRad] = useState<any | null>(null);
  const [radFrom, setRadFrom] = useState<string>('');
  const [radTo, setRadTo] = useState<string>('');
  const [radPage, setRadPage] = useState<number>(0);
  const [radRowsPerPage, setRadRowsPerPage] = useState<number>(5);
  const [useServerPaging, setUseServerPaging] = useState<boolean>(false);
  const [radLimit, setRadLimit] = useState<number>(10);
  const [radHasNext, setRadHasNext] = useState<boolean>(false);
  const [radHasPrev, setRadHasPrev] = useState<boolean>(false);
  const [radPrevCursors, setRadPrevCursors] = useState<any[]>([]);
  const [radCurrentCursor, setRadCurrentCursor] = useState<any | null>(null);
  const [serverDailyReports, setServerDailyReports] = useState<any[]>([]);

  // Export RADs (filtered)
  const handleExportRADs = () => {
    const headers = ['Fecha','Hectareas','Horas','Combustible','Fertilizante','Incidentes','Evidencias'];
    const rows = dailyReports.map((rad) => {
      const d = rad.date?.toDate ? new Date(rad.date.toDate()) : new Date(rad.date);
      const dateStr = isNaN(d.getTime()) ? '' : d.toISOString();
      const hect = rad.progress?.hectares ?? '';
      const hrs = rad.progress?.hours ?? '';
      const fuel = rad.consumables?.fuel ?? '';
      const fert = rad.consumables?.fertilizer ?? '';
      const inc = (rad.incidents || '').toString().replace(/\n/g,' ').replace(/\r/g,' ');
      const evid = Array.isArray(rad.evidenceURLs) ? rad.evidenceURLs.length : 0;
      return [dateStr, hect, hrs, fuel, fert, `"${inc}"`, evid].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const folio = service?.folio || id || 'servicio';
    link.href = url;
    link.setAttribute('download', `RADs_${folio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openRadViewer = (rad: any) => {
    setSelectedRad(rad);
    setRadViewerOpen(true);
  };

  const closeRadViewer = () => {
    setRadViewerOpen(false);
    setSelectedRad(null);
  };

  const invalidRange = radFrom && radTo && new Date(radTo) < new Date(radFrom);

  // Export filtered RADs to PDF (range)
  const handleExportRADsPDF = () => {
    const rows = (useServerPaging ? serverDailyReports : dailyReports);
    const doc = new jsPDF();
    const title = `RADs ${service?.folio || id || ''}`;
    doc.text(title, 14, 14);
    const body = rows.map((rad) => {
      const d = rad.date?.toDate ? new Date(rad.date.toDate()) : new Date(rad.date);
      return [
        isNaN(d.getTime()) ? '' : d.toLocaleDateString(),
        rad.progress?.hectares ?? '',
        rad.progress?.hours ?? '',
        rad.consumables?.fuel ?? '',
        rad.consumables?.fertilizer ?? '',
        (rad.incidents || '').toString(),
        Array.isArray(rad.evidenceURLs) ? rad.evidenceURLs.length : 0,
      ];
    });
    autoTable(doc, {
      head: [['Fecha','Hectáreas','Horas','Combustible','Fertilizante','Incidentes','Evidencias']],
      body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210] },
    });
    doc.save(`RADs_${service?.folio || id || 'servicio'}.pdf`);
  };

  // Export single RAD as PDF
  const handleExportSingleRadPDF = (rad: any) => {
    const doc = new jsPDF();
    const d = rad.date?.toDate ? new Date(rad.date.toDate()) : new Date(rad.date);
    const title = `RAD ${service?.folio || id || ''} - ${isNaN(d.getTime()) ? '' : d.toLocaleDateString()}`;
    doc.text(title, 14, 14);
    autoTable(doc, {
      body: [
        ['Fecha', isNaN(d.getTime()) ? '' : d.toLocaleString()],
        ['Hectáreas', rad.progress?.hectares ?? ''],
        ['Horas', rad.progress?.hours ?? ''],
        ['Combustible (L)', rad.consumables?.fuel ?? ''],
        ['Fertilizante (kg)', rad.consumables?.fertilizer ?? ''],
        ['Incidentes', (rad.incidents || '').toString()],
        ['Evidencias', Array.isArray(rad.evidenceURLs) ? rad.evidenceURLs.length : 0],
      ],
      startY: 20,
      theme: 'plain',
      styles: { fontSize: 10 },
    });
    doc.save(`RAD_${service?.folio || id || 'servicio'}_${isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)}.pdf`);
  };

  // Server-side pagination with cursors
  const fetchServerPage = useCallback(async (direction: 'reset' | 'next' | 'prev' = 'reset') => {
    if (!id) return;
    setLoadingDaily(true);
    try {
      const constraints: any[] = [where('serviceId', '==', id)];
      if (radFrom) constraints.push(where('date', '>=', new Date(radFrom)));
      if (radTo) {
        const to = new Date(radTo);
        to.setHours(23, 59, 59, 999);
        constraints.push(where('date', '<=', to));
      }
      constraints.push(orderBy('date', 'desc'));

      let qRef: any;
      if (direction === 'next' && radCurrentCursor) {
        qRef = query(collection(db, 'daily_reports'), ...constraints, startAfter(radCurrentCursor), limit(radLimit + 1));
      } else if (direction === 'prev' && radPrevCursors.length > 0) {
        const prevCursor = radPrevCursors[radPrevCursors.length - 1];
        qRef = query(collection(db, 'daily_reports'), ...constraints, startAfter(prevCursor), limit(radLimit + 1));
        setRadPrevCursors(prev => prev.slice(0, -1));
      } else {
        qRef = query(collection(db, 'daily_reports'), ...constraints, limit(radLimit + 1));
        if (direction === 'reset') {
          setRadPrevCursors([]);
        }
      }

      const snap = await getDocs(qRef);
      const docs = snap.docs;
      const hasMore = docs.length > radLimit;
      const pageDocs = hasMore ? docs.slice(0, radLimit) : docs;
      
      setServerDailyReports(pageDocs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setRadHasNext(hasMore);
      setRadHasPrev(direction === 'next' || radPrevCursors.length > 0);
      
      if (pageDocs.length > 0) {
        const lastDoc = pageDocs[pageDocs.length - 1];
        setRadCurrentCursor(lastDoc);
        if (direction === 'next' && serverDailyReports.length > 0) {
          setRadPrevCursors(prev => [...prev, serverDailyReports[0]]);
        }
      } else {
        setRadCurrentCursor(null);
      }
    } catch (error) {
      console.error('Error fetching server page:', error);
      enqueueSnackbar('Error al paginar RADs', { variant: 'error' });
    } finally {
      setLoadingDaily(false);
    }
  }, [id, radFrom, radTo, radLimit, radCurrentCursor, radPrevCursors, serverDailyReports, enqueueSnackbar]);

  // Effect to fetch server page when switching to server mode or changing filters
  useEffect(() => {
    if (useServerPaging && id) {
      fetchServerPage('reset');
    }
  }, [useServerPaging, radFrom, radTo, fetchServerPage, id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const ref = doc(db, 'services', id);
    const unsub = onSnapshot(ref, (serviceDoc) => {
      if (serviceDoc.exists()) {
        const serviceData = serviceDoc.data() as Omit<Service, 'id'>;
        setService({ id: serviceDoc.id, ...serviceData });
        setNewStatus(serviceData.status);
        setLoading(false);
      } else {
        setLoading(false);
        enqueueSnackbar('Servicio no encontrado', { variant: 'error' });
        navigate('/services');
      }
    }, (error) => {
      console.error('Error listening service:', error);
      setLoading(false);
      enqueueSnackbar('Error al cargar el servicio', { variant: 'error' });
    });

    return () => unsub();
  }, [id, enqueueSnackbar, navigate]);

  // RADs data source: server paging or realtime local fallback
  useEffect(() => {
    if (!id) return;
    if (useServerPaging) {
      fetchServerPage('reset');
      return () => {};
    }
    setLoadingDaily(true);
    const constraints: any[] = [where('serviceId', '==', id)];
    if (radFrom) constraints.push(where('date', '>=', new Date(radFrom)));
    if (radTo) { const to = new Date(radTo); to.setHours(23,59,59,999); constraints.push(where('date','<=', to)); }
    constraints.push(orderBy('date','desc'));
    const q = query(collection(db,'daily_reports'), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setDailyReports(list);
      setLoadingDaily(false);
    }, () => setLoadingDaily(false));
    return () => unsub();
  }, [id, useServerPaging, fetchServerPage, radFrom, radTo]);

  // Realtime audit logs for this service
  useEffect(() => {
    if (!id) return;
    setLoadingAudit(true);
    const q = query(
      collection(db, 'audit_logs'),
      where('serviceId', '==', id),
      orderBy('changedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setAuditLogs(list);
      setLoadingAudit(false);
    }, (err) => {
      console.error(err);
      setLoadingAudit(false);
      enqueueSnackbar('Error cargando seguimiento', { variant: 'error' });
    });
    return () => unsub();
  }, [id, enqueueSnackbar]);

  const handleStatusUpdate = async () => {
    if (!service || !newStatus) return;
    
    try {
      await updateDoc(doc(db, 'services', service.id), {
        status: newStatus,
        updatedAt: new Date(),
        statusHistory: [
          ...(service.statusHistory || []),
          {
            status: newStatus,
            changedAt: new Date(),
            notes: statusChangeNotes,
            changedBy: 'currentUser', // Replace with actual user ID
          },
        ],
      });
      
      setService({
        ...service,
        status: newStatus,
        statusHistory: [
          ...(service.statusHistory || []),
          {
            status: newStatus,
            changedAt: new Date() as any,
            notes: statusChangeNotes,
            changedBy: 'currentUser',
          },
        ],
      });
      
      enqueueSnackbar('Estado actualizado correctamente', { variant: 'success' });
      setStatusDialogOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
      enqueueSnackbar('Error al actualizar el estado', { variant: 'error' });
    }
  };


  const handleStatusChange = (event: SelectChangeEvent<ServiceStatus>) => {
    setNewStatus(event.target.value as ServiceStatus);
  };


  if (loading || !service) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Servicio {service.folio}
        </Typography>
        <Chip 
          label={service.status} 
          color={service.status === 'Finalizado' ? 'success' : service.status === 'En Ejecución' ? 'primary' : 'default'}
        />
      </Box>

      {/* Service Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>Información del Servicio</Typography>
            <Typography><strong>Cliente:</strong> {service.client?.name || 'N/A'}</Typography>
            <Typography><strong>Descripción:</strong> {service.fscf001_data?.description || 'N/A'}</Typography>
            <Typography><strong>Ubicación:</strong> {service.fscf001_data?.location || 'N/A'}</Typography>
            <Typography><strong>Fecha de Solicitud:</strong> {service.createdAt?.toDate?.() ? new Date(service.createdAt.toDate()).toLocaleDateString() : new Date(service.createdAt).toLocaleDateString()}</Typography>
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom>Estado y Acciones</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Typography><strong>Estado Actual:</strong> {service.status}</Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => setStatusDialogOpen(true)}
              >
                Cambiar Estado
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_: React.SyntheticEvent, newValue: number) => setActiveTab(newValue)}>
          <Tab label="Información General" />
          <Tab label="Visita Técnica" />
          <Tab label="RADs" />
          <Tab label="Documentos" />
          <Tab label="Actividades" />
          <Tab label="Facturación" />
          <Tab label="Seguimiento" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Detalles del Servicio</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography paragraph><strong>Folio:</strong> {service.folio}</Typography>
              <Typography paragraph><strong>Cliente:</strong> {service.client?.name || 'N/A'}</Typography>
              <Typography paragraph><strong>Descripción:</strong> {service.fscf001_data?.description || 'N/A'}</Typography>
              <Typography paragraph><strong>Ubicación:</strong> {service.fscf001_data?.location || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography paragraph><strong>Fecha de Solicitud:</strong> {service.createdAt?.toDate?.() ? new Date(service.createdAt.toDate()).toLocaleDateString() : new Date(service.createdAt).toLocaleDateString()}</Typography>
              <Typography paragraph><strong>Estado:</strong> {service.status}</Typography>
              <Typography paragraph><strong>Prioridad:</strong> {service.fscf001_data?.priority || 'Normal'}</Typography>
            </Box>
          </Box>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Visita Técnica</Typography>
          <Typography color="textSecondary" paragraph>
            Información sobre la visita técnica realizada para este servicio.
          </Typography>
        </Paper>
      </TabPanel>

    <TabPanel value={activeTab} index={2}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          RADs del Servicio
        </Typography>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, alignItems: 'end', mb: 1 }}>
          <TextField
            label="Desde"
            type="date"
            value={radFrom}
            onChange={(e) => setRadFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(invalidRange)}
          />
          <TextField
            label="Hasta"
            type="date"
            value={radTo}
            onChange={(e) => setRadTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(invalidRange)}
          />
          <FormControl>
            <InputLabel id="paging-mode">Paginación</InputLabel>
            <Select
              labelId="paging-mode"
              label="Paginación"
              value={useServerPaging ? 'server' : 'local'}
              onChange={(e) => {
                const v = e.target.value as string;
                setUseServerPaging(v === 'server');
                setRadPage(0);
              }}
            >
              <MenuItem value="local">Local</MenuItem>
              <MenuItem value="server">Servidor</MenuItem>
            </Select>
          </FormControl>
          <FormControl disabled={!useServerPaging}>
            <InputLabel id="page-size">Líneas</InputLabel>
            <Select
              labelId="page-size"
              label="Líneas"
              value={String(radLimit)}
              onChange={(e) => setRadLimit(Number(e.target.value))}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {invalidRange && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
            El campo "Hasta" debe ser mayor o igual que "Desde".
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" mb={1} gap={1} flexWrap="wrap">
          <Box>
            {useServerPaging && (
              <>
                <Button size="small" variant="outlined" disabled={!radHasPrev || loadingDaily || Boolean(invalidRange)} onClick={() => fetchServerPage('prev')} sx={{ mr: 1 }}>
                  Anterior
                </Button>
                <Button size="small" variant="outlined" disabled={!radHasNext || loadingDaily || Boolean(invalidRange)} onClick={() => fetchServerPage('next')}>
                  Siguiente
                </Button>
              </>
            )}
          </Box>
          <Box>
            <Button variant="outlined" onClick={handleExportRADs} disabled={loadingDaily || Boolean(invalidRange) || (useServerPaging ? serverDailyReports.length === 0 : dailyReports.length === 0)} sx={{ mr: 1 }}>
              Exportar CSV
            </Button>
            <Button variant="outlined" onClick={handleExportRADsPDF} disabled={loadingDaily || Boolean(invalidRange) || (useServerPaging ? serverDailyReports.length === 0 : dailyReports.length === 0)}>
              Exportar PDF
            </Button>
          </Box>
        </Box>
        {loadingDaily ? (
          <Box display="flex" justifyContent="center" py={2}><Typography>Cargando...</Typography></Box>
        ) : (useServerPaging ? serverDailyReports.length === 0 : dailyReports.length === 0) ? (
          <Typography color="text.secondary">No hay reportes diarios</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {(useServerPaging ? serverDailyReports : dailyReports.slice(radPage * radRowsPerPage, radPage * radRowsPerPage + radRowsPerPage)).map((rad) => (
              <Card key={rad.id} onClick={() => openRadViewer(rad)} sx={{ cursor: 'pointer' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{rad.date?.toDate ? new Date(rad.date.toDate()).toLocaleDateString() : new Date(rad.date).toLocaleDateString()}</Typography>
                      <Typography variant="body2" color="text.secondary">Hectáreas: {rad.progress?.hectares || 0} | Horas: {rad.progress?.hours || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">Combustible: {rad.consumables?.fuel || 0} L | Fertilizante: {rad.consumables?.fertilizer || 0}</Typography>
                      {rad.incidents && <Typography variant="body2">Incidentes: {rad.incidents}</Typography>}
                    </Box>
                    <Typography variant="caption" color="text.secondary">Evidencias: {rad.evidenceURLs?.length || 0}</Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
        {!useServerPaging && !loadingDaily && (dailyReports.length > 0) && (
          <TablePagination
            component="div"
            count={dailyReports.length}
            page={radPage}
            onPageChange={(_, p) => setRadPage(p)}
            rowsPerPage={radRowsPerPage}
            onRowsPerPageChange={(e) => { setRadRowsPerPage(parseInt(e.target.value,10)); setRadPage(0); }}
            rowsPerPageOptions={[5,10,25]}
            labelRowsPerPage="Filas por página"
          />
        )}
      </Box>
      {(currentUser && (['admin','manager','supervisor'] as const).includes((service as any)?.role || ''))}
      <DailyReportForm serviceId={service.id} supervisorUid={currentUser?.uid || ''} onCreated={() => { /* realtime updates list */ }} />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documentos del Servicio
          </Typography>
          <Typography color="textSecondary" paragraph>
            Aquí se mostrarán los documentos relacionados con este servicio.
          </Typography>
          <Button variant="outlined" startIcon={<AttachFileIcon />}>
            Subir Documento
          </Button>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Actividades
          </Typography>
          <Typography color="textSecondary" paragraph>
            Aquí se mostrarán las actividades relacionadas con este servicio.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Facturación
          </Typography>
          <Typography color="textSecondary" paragraph>
            Aquí se mostrará la información de facturación relacionada con este servicio.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Seguimiento (Audit Logs)
          </Typography>
        </Box>
        {loadingAudit ? (
          <Box display="flex" justifyContent="center" py={2}><Typography>Cargando...</Typography></Box>
        ) : auditLogs.length === 0 ? (
          <Typography color="text.secondary">Sin eventos de auditoría</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {auditLogs.map((log) => (
              <Card key={log.id}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" gap={2}>
                    <Box>
                      <Typography variant="subtitle1">
                        {log.type === 'service_status_change' ? 'Cambio de estado' : (log.type || 'Evento')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {log.oldStatus} → {log.newStatus}
                      </Typography>
                      {log.notes && (
                        <Typography variant="body2">Notas: {log.notes}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Por: {log.changedBy || 'system'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {log.changedAt?.toDate ? new Date(log.changedAt.toDate()).toLocaleString() : (log.changedAt ? new Date(log.changedAt).toLocaleString() : '')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </TabPanel>

      {/* RAD Viewer Dialog */}
      <Dialog
        open={radViewerOpen}
        onClose={closeRadViewer}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalle del RAD
          {selectedRad && (
            <Typography variant="subtitle2" color="text.secondary">
              {selectedRad.date?.toDate ? new Date(selectedRad.date.toDate()).toLocaleDateString() : new Date(selectedRad.date).toLocaleDateString()}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedRad && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Hectáreas</Typography>
                  <Typography variant="h6">{selectedRad.progress?.hectares || 0}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Horas</Typography>
                  <Typography variant="h6">{selectedRad.progress?.hours || 0}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Combustible (L)</Typography>
                  <Typography variant="h6">{selectedRad.consumables?.fuel || 0}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Fertilizante (kg)</Typography>
                  <Typography variant="h6">{selectedRad.consumables?.fertilizer || 0}</Typography>
                </Box>
              </Box>
              {selectedRad.incidents && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Incidentes</Typography>
                  <Typography>{selectedRad.incidents}</Typography>
                </Box>
              )}
              {selectedRad.evidenceURLs && selectedRad.evidenceURLs.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Evidencias ({selectedRad.evidenceURLs.length})
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1 }}>
                    {selectedRad.evidenceURLs.map((url: string, idx: number) => (
                      <Box key={idx} component="img" src={url} sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 1 }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRadViewer}>Cerrar</Button>
          {selectedRad && (
            <Button
              variant="contained"
              onClick={() => handleExportSingleRadPDF(selectedRad)}
            >
              Exportar PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cambiar Estado del Servicio</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="status-select-label">Nuevo Estado</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              value={newStatus || ''}
              label="Nuevo Estado"
              onChange={handleStatusChange}
            >
              {Object.values(serviceStatuses).map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            fullWidth
            multiline
            rows={4}
            label="Notas del Cambio"
            value={statusChangeNotes}
            onChange={(e) => setStatusChangeNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            color="primary"
            disabled={!newStatus}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Helper object for service statuses
const serviceStatuses: Record<ServiceStatus, string> = {
  'Solicitado': 'Solicitado',
  'En Visita Técnica': 'En Visita Técnica',
  'Cotización Aprobada': 'Cotización Aprobada',
  'En Planificación': 'En Planificación',
  'En Ejecución': 'En Ejecución',
  'Finalizado': 'Finalizado',
  'Facturado': 'Facturado',
  'Pagado': 'Pagado',
};
