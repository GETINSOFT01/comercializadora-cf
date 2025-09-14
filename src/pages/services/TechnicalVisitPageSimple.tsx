import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
  Checkbox
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { technicalVisitFormSchema, technicalVisitResultsSchema, type TechnicalVisitFormData, type TechnicalVisitResultsData } from '../../schemas/technicalVisitValidation';

interface Service {
  id: string;
  folio: string;
  status: string;
  fscf001_data: {
    clientName: string;
    serviceType: string;
    description: string;
    location: string;
    contactName: string;
    contactPhone: string;
    priority: string;
  };
  createdAt: any;
}

interface TechnicalVisit {
  id: string;
  serviceId: string;
  visitDate: string;
  visitTime: string;
  technicianName: string;
  technicianId: string;
  visitPurpose: string;
  status: 'programada' | 'en_progreso' | 'completada' | 'cancelada';
  results?: TechnicalVisitResultsData;
  createdAt: any;
}

const TechnicalVisitPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [visits, setVisits] = useState<TechnicalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [viewResultsDialogOpen, setViewResultsDialogOpen] = useState(false);
  const [, setSelectedService] = useState<Service | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<TechnicalVisit | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const scheduleForm = useForm<TechnicalVisitFormData>({
    resolver: zodResolver(technicalVisitFormSchema),
    defaultValues: {
      clientContactConfirmed: false,
      estimatedDuration: 2
    }
  });

  const resultsForm = useForm<TechnicalVisitResultsData>({
    resolver: zodResolver(technicalVisitResultsSchema) as any,
    defaultValues: {
      visitStatus: 'completada',
      problemsFound: [''],
      solutionsProposed: [''],
      clientSatisfaction: 'satisfecho',
      followUpRequired: false,
      recommendedAction: 'aprobar'
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Cargar servicios que requieren visita técnica
      const servicesQuery = query(
        collection(db, 'services'),
        where('status', '==', 'Visita Técnica')
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];

      // Cargar visitas técnicas
      const visitsSnapshot = await getDocs(collection(db, 'technicalVisits'));
      const visitsData = visitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TechnicalVisit[];

      setServices(servicesData);
      setVisits(visitsData);
    } catch (error) {
      console.error('Error loading data:', error);
      enqueueSnackbar('Error al cargar datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleVisit = (service: Service) => {
    setSelectedService(service);
    scheduleForm.reset({
      serviceId: service.id,
      visitDate: '',
      visitTime: '',
      technicianName: '',
      technicianId: '',
      visitPurpose: '',
      estimatedDuration: 2,
      specialRequirements: '',
      clientContactConfirmed: false
    });
    setScheduleDialogOpen(true);
  };

  const handleRecordResults = (visit: TechnicalVisit) => {
    setSelectedVisit(visit);
    resultsForm.reset({
      visitId: visit.id,
      actualStartTime: '',
      actualEndTime: '',
      visitStatus: 'completada',
      problemsFound: [''],
      solutionsProposed: [''],
      workCompleted: '',
      clientSatisfaction: 'satisfecho',
      technicianNotes: '',
      followUpRequired: false,
      recommendedAction: 'aprobar',
      estimatedCompletionDate: ''
    });
    setResultsDialogOpen(true);
  };

  const onScheduleSubmit = async (data: TechnicalVisitFormData) => {
    try {
      const visitData = {
        ...data,
        status: 'programada',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'technicalVisits'), visitData);
      
      enqueueSnackbar('Visita técnica programada exitosamente', { variant: 'success' });
      setScheduleDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error scheduling visit:', error);
      enqueueSnackbar('Error al programar visita técnica', { variant: 'error' });
    }
  };

  const onResultsSubmit = async (data: TechnicalVisitResultsData) => {
    try {
      if (!selectedVisit) return;

      // Actualizar la visita con los resultados
      await updateDoc(doc(db, 'technicalVisits', selectedVisit.id), {
        results: data,
        status: 'completada',
        updatedAt: serverTimestamp()
      });

      // Actualizar el estado del servicio basado en la recomendación
      const newServiceStatus = data.recommendedAction === 'aprobar' ? 'En Proceso' : 
                              data.recommendedAction === 'rechazar' ? 'Rechazado' :
                              'Visita Técnica'; // Para casos que requieren más trabajo

      await updateDoc(doc(db, 'services', selectedVisit.serviceId), {
        status: newServiceStatus,
        updatedAt: serverTimestamp()
      });

      enqueueSnackbar('Resultados de visita técnica guardados exitosamente', { variant: 'success' });
      setResultsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving results:', error);
      enqueueSnackbar('Error al guardar resultados', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Cargando visitas técnicas...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Visitas Técnicas
      </Typography>

      {/* Servicios pendientes de visita técnica */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Servicios Pendientes de Visita Técnica ({services.length})
        </Typography>
        
        {services.length === 0 ? (
          <Alert severity="info">No hay servicios pendientes de visita técnica</Alert>
        ) : (
          <Stack spacing={2}>
            {services.map((service) => (
              <Card key={service.id}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Folio: {service.folio}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Cliente: {service.fscf001_data.clientName}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Servicio: {service.fscf001_data.serviceType}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Ubicación: {service.fscf001_data.location}
                      </Typography>
                      <Chip 
                        label={service.fscf001_data.priority} 
                        color={service.fscf001_data.priority === 'alta' ? 'error' : 
                               service.fscf001_data.priority === 'media' ? 'warning' : 'default'}
                        size="small"
                        sx={{ mb: 2 }}
                      />
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<ScheduleIcon />}
                      onClick={() => handleScheduleVisit(service)}
                    >
                      Programar Visita
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Visitas programadas/completadas */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Visitas Técnicas ({visits.length})
        </Typography>
        
        {visits.length === 0 ? (
          <Alert severity="info">No hay visitas técnicas registradas</Alert>
        ) : (
          <List>
            {visits.map((visit) => (
              <ListItem key={visit.id} divider>
                <ListItemIcon>
                  {visit.status === 'completada' ? <CheckCircleIcon color="success" /> :
                   visit.status === 'cancelada' ? <CancelIcon color="error" /> :
                   <ScheduleIcon color="primary" />}
                </ListItemIcon>
                <ListItemText
                  primary={`Visita - ${visit.visitDate} ${visit.visitTime}`}
                  secondary={`Técnico: ${visit.technicianName} | Estado: ${visit.status}`}
                />
                {visit.status === 'programada' && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleRecordResults(visit)}
                  >
                    Registrar Resultados
                  </Button>
                )}
                {visit.status === 'completada' && (
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      setSelectedVisit(visit);
                      setViewResultsDialogOpen(true);
                    }}
                  >
                    Ver Resultados
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Dialog para programar visita */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)}>
          <DialogTitle>Programar Visita Técnica</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box display="flex" gap={2}>
                <Controller
                  name="visitDate"
                  control={scheduleForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Fecha de Visita"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="visitTime"
                  control={scheduleForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Hora de Visita"
                      type="time"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Box>
              <Box display="flex" gap={2}>
                <Controller
                  name="technicianName"
                  control={scheduleForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Nombre del Técnico"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="technicianId"
                  control={scheduleForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="ID del Técnico"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Box>
              <Controller
                name="visitPurpose"
                control={scheduleForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Propósito de la Visita"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Box display="flex" gap={2}>
                <Controller
                  name="estimatedDuration"
                  control={scheduleForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Duración Estimada (horas)"
                      type="number"
                      fullWidth
                      inputProps={{ min: 0.5, max: 24, step: 0.5 }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </Box>
              <Controller
                name="specialRequirements"
                control={scheduleForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Requerimientos Especiales (opcional)"
                    multiline
                    rows={2}
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="clientContactConfirmed"
                control={scheduleForm.control}
                render={({ field, fieldState }) => (
                  <FormControl error={!!fieldState.error}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label="Confirmo que he contactado al cliente y acordado la fecha/hora"
                    />
                    {fieldState.error && (
                      <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setScheduleDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">Programar Visita</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para registrar resultados */}
      <Dialog open={resultsDialogOpen} onClose={() => setResultsDialogOpen(false)} maxWidth="lg" fullWidth>
        <form onSubmit={resultsForm.handleSubmit(onResultsSubmit as any)}>
          <DialogTitle>Registrar Resultados de Visita Técnica</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box display="flex" gap={2}>
                <Controller
                  name="actualStartTime"
                  control={resultsForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Hora de Inicio Real"
                      type="time"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name="actualEndTime"
                  control={resultsForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Hora de Finalización Real"
                      type="time"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Box>
              <Controller
                name="workCompleted"
                control={resultsForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Trabajo Completado"
                    multiline
                    rows={4}
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="technicianNotes"
                control={resultsForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Notas del Técnico"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Box display="flex" gap={2}>
                <Controller
                  name="recommendedAction"
                  control={resultsForm.control}
                  render={({ field, fieldState }) => (
                    <FormControl fullWidth error={!!fieldState.error}>
                      <InputLabel>Acción Recomendada</InputLabel>
                      <Select {...field} label="Acción Recomendada">
                        <MenuItem value="aprobar">Aprobar Servicio</MenuItem>
                        <MenuItem value="rechazar">Rechazar Servicio</MenuItem>
                        <MenuItem value="requiere_mas_trabajo">Requiere Más Trabajo</MenuItem>
                        <MenuItem value="requiere_cotizacion">Requiere Cotización</MenuItem>
                      </Select>
                      {fieldState.error && (
                        <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                          {fieldState.error.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
                <Controller
                  name="estimatedCompletionDate"
                  control={resultsForm.control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Fecha Estimada de Finalización"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResultsDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">Guardar Resultados</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para ver resultados */}
      <Dialog open={viewResultsDialogOpen} onClose={() => setViewResultsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Resultados de Visita Técnica</DialogTitle>
        <DialogContent>
          {selectedVisit && selectedVisit.results ? (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Información básica de la visita */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Información de la Visita</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Fecha:</Typography>
                      <Typography variant="body1">{selectedVisit.visitDate}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Hora:</Typography>
                      <Typography variant="body1">{selectedVisit.visitTime}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Técnico:</Typography>
                      <Typography variant="body1">{selectedVisit.technicianName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Estado:</Typography>
                      <Chip 
                        label={selectedVisit.status} 
                        color={selectedVisit.status === 'completada' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Resultados de la visita */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Resultados</Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Estado de la Visita:</Typography>
                    <Chip 
                      label={selectedVisit.results.visitStatus} 
                      color={selectedVisit.results.visitStatus === 'completada' ? 'success' : 'warning'}
                    />
                  </Box>

                  {selectedVisit.results.problemsFound && selectedVisit.results.problemsFound.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Problemas Encontrados:</Typography>
                      <List dense>
                        {selectedVisit.results.problemsFound.map((problem, index) => (
                          <ListItem key={index} sx={{ pl: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <Typography variant="body2">•</Typography>
                            </ListItemIcon>
                            <ListItemText primary={problem} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {selectedVisit.results.solutionsProposed && selectedVisit.results.solutionsProposed.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Soluciones Propuestas:</Typography>
                      <List dense>
                        {selectedVisit.results.solutionsProposed.map((solution, index) => (
                          <ListItem key={index} sx={{ pl: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <Typography variant="body2">•</Typography>
                            </ListItemIcon>
                            <ListItemText primary={solution} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Satisfacción del Cliente:</Typography>
                      <Chip 
                        label={selectedVisit.results.clientSatisfaction} 
                        color={
                          selectedVisit.results.clientSatisfaction === 'muy_satisfecho' ? 'success' :
                          selectedVisit.results.clientSatisfaction === 'satisfecho' ? 'primary' :
                          selectedVisit.results.clientSatisfaction === 'neutral' ? 'default' : 'error'
                        }
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Seguimiento Requerido:</Typography>
                      <Chip 
                        label={selectedVisit.results.followUpRequired ? 'Sí' : 'No'} 
                        color={selectedVisit.results.followUpRequired ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Acción Recomendada:</Typography>
                    <Chip 
                      label={selectedVisit.results.recommendedAction} 
                      color={
                        selectedVisit.results.recommendedAction === 'aprobar' ? 'success' :
                        selectedVisit.results.recommendedAction === 'rechazar' ? 'error' : 'warning'
                      }
                    />
                  </Box>

                  {selectedVisit.results.technicianNotes && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Notas del Técnico:</Typography>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">{selectedVisit.results.technicianNotes}</Typography>
                      </Paper>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Stack>
          ) : (
            <Alert severity="warning">
              No se encontraron resultados para esta visita técnica.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewResultsDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechnicalVisitPage;
