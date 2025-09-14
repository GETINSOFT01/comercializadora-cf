import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useFolioGenerator } from '../../hooks/useFolioGenerator';
import type { Service, ServiceStatus, Client } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TechVisitForm from '../../components/TechVisitForm';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useServiceForm } from '../../hooks/useServiceForm';
import { useServiceTypes } from '../../hooks/useServiceTypes';
import type { ServiceRequestFormData } from '../../schemas/serviceValidation';
import { useSnackbar } from 'notistack';

// Form validation and state management now handled by useServiceForm hook

export default function NewServicePage() {
  const [activeStep, setActiveStep] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [techVisitModalOpen, setTechVisitModalOpen] = useState(false);
  const [tempServiceId, setTempServiceId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingService, setExistingService] = useState<Service | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { activeServiceTypes, loading: serviceTypesLoading } = useServiceTypes();
  const { id } = useParams();

  // Use our new form validation hook
  const {
    handleSubmit,
    isSubmitting,
    errors,
    register,
    watch,
    setValue,
    reset,
    getValues,
  } = useServiceForm();

  // Use folio generator hook
  const { generateNewFolio, isGenerating, error: folioError } = useFolioGenerator();

  const formValues = watch();

  // Check if we're in edit mode
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      loadExistingService(id);
    }
  }, [id]);

  // Load existing service data for editing
  const loadExistingService = async (serviceId: string) => {
    try {
      const serviceDoc = await getDoc(doc(db, 'services', serviceId));
      if (serviceDoc.exists()) {
        const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as Service;
        setExistingService(serviceData);
        
        // Populate form with existing data
        const formData = {
          clientId: serviceData.clientId,
          serviceType: serviceData.fscf001_data?.serviceType || '',
          description: serviceData.fscf001_data?.description || '',
          priority: serviceData.fscf001_data?.priority || 'media',
          estimatedDuration: serviceData.fscf001_data?.estimatedDuration?.toString() || '',
          estimatedStartDate: serviceData.fscf001_data?.estimatedStartDate ? 
            (serviceData.fscf001_data.estimatedStartDate.toDate ? 
              format(serviceData.fscf001_data.estimatedStartDate.toDate(), 'yyyy-MM-dd') :
              format(new Date(serviceData.fscf001_data.estimatedStartDate), 'yyyy-MM-dd')
            ) : '',
          location: serviceData.fscf001_data?.location || '',
          contactName: serviceData.fscf001_data?.contactName || '',
          contactPhone: serviceData.fscf001_data?.contactPhone || '',
          additionalNotes: serviceData.fscf001_data?.additionalNotes || '',
          requiresVisit: serviceData.fscf001_data?.requiresVisit || 'no',
          termsAccepted: true, // Set to true for existing services
        };
        
        reset(formData);
        
        // In edit mode, skip to step 2 (Service Details) since client is already selected
        setActiveStep(1);
      } else {
        enqueueSnackbar('Servicio no encontrado', { variant: 'error' });
        navigate('/services');
      }
    } catch (error) {
      console.error('Error loading service:', error);
      enqueueSnackbar('Error al cargar el servicio', { variant: 'error' });
      navigate('/services');
    }
  };

  const onSubmit = async (values: ServiceRequestFormData) => {
    try {
      if (isEditMode && existingService) {
        // Update existing service
        const serviceData = {
          clientId: values.clientId,
          fscf001_data: {
            ...existingService.fscf001_data,
            clientName: clients.find(c => c.id === values.clientId)?.name || '',
            serviceType: values.serviceType,
            description: values.description,
            priority: values.priority,
            estimatedDuration: Number(values.estimatedDuration),
            estimatedStartDate: new Date(values.estimatedStartDate),
            location: values.location,
            contactName: values.contactName,
            contactPhone: values.contactPhone,
            additionalNotes: values.additionalNotes,
            requiresVisit: values.requiresVisit,
          },
          updatedAt: serverTimestamp(),
        };
        
        await updateDoc(doc(db, 'services', existingService.id), serviceData);
        enqueueSnackbar('Servicio actualizado exitosamente', { variant: 'success' });
        navigate('/services');
      } else {
        // Create new service
        const folio = await generateNewFolio();
          
          // Show folio error if generation failed
          if (folioError) {
            enqueueSnackbar(`Error al generar folio: ${folioError}`, { variant: 'error' });
            return;
          }
          
          // Create service document
          const serviceData: Omit<Service, 'id'> = {
            folio,
            clientId: values.clientId,
            status: 'En Proceso',
            fscf001_data: {
              clientName: clients.find(c => c.id === values.clientId)?.name || '',
              serviceType: values.serviceType,
              description: values.description,
              priority: values.priority,
              estimatedDuration: Number(values.estimatedDuration),
              estimatedStartDate: new Date(values.estimatedStartDate),
              location: values.location,
              contactName: values.contactName,
              contactPhone: values.contactPhone,
              additionalNotes: values.additionalNotes,
              requiresVisit: values.requiresVisit,
              requiresTechnicalVisit: values.requiresVisit === 'si',
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            statusHistory: [
              {
                status: 'Solicitado',
                changedAt: new Date(),
                changedBy: 'currentUser', // Replace with actual user ID
                notes: 'Solicitud de servicio creada',
              },
              {
                status: 'En Proceso',
                changedAt: new Date(),
                changedBy: 'currentUser', // Replace with actual user ID
                notes: values.requiresVisit === 'si' 
                  ? 'Servicio en proceso - Requiere visita técnica'
                  : 'Servicio en proceso - Evaluación administrativa',
              },
            ],
          };
        
        const docRef = await addDoc(collection(db, 'services'), serviceData);
        
        // Si requiere visita técnica, abrir modal
        if (values.requiresVisit === 'si') {
          setTempServiceId(docRef.id);
          setTechVisitModalOpen(true);
        } else {
          enqueueSnackbar('Solicitud de servicio creada exitosamente', { variant: 'success' });
          navigate('/services');
        }
      }
    } catch (error) {
      console.error('Error creating/updating service:', error);
      enqueueSnackbar(isEditMode ? 'Error al actualizar el servicio' : 'Error al crear la solicitud de servicio', { variant: 'error' });
    }
  };

  // Handle rejection of service
  const handleRejection = async () => {
    try {
      if (isEditMode && existingService) {
        // Update service status to rejected with reason
        const serviceData = {
          status: 'Rechazado' as ServiceStatus,
          rejectionReason: rejectionReason,
          updatedAt: serverTimestamp(),
        };
        
        await updateDoc(doc(db, 'services', existingService.id), serviceData);
        
        // Add to status history
        const statusHistoryEntry = {
          status: 'Rechazado' as ServiceStatus,
          changedAt: new Date(),
          changedBy: 'currentUser', // Replace with actual user ID
          notes: `Servicio rechazado. Motivo: ${rejectionReason}`,
        };
        
        // Update status history
        await updateDoc(doc(db, 'services', existingService.id), {
          statusHistory: [...(existingService.statusHistory || []), statusHistoryEntry]
        });
        
        enqueueSnackbar('Servicio rechazado correctamente', { variant: 'warning' });
        setRejectionModalOpen(false);
        setRejectionReason('');
        navigate('/services');
      }
    } catch (error) {
      console.error('Error rejecting service:', error);
      enqueueSnackbar('Error al rechazar el servicio', { variant: 'error' });
    }
  };

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsRef = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];
        console.log('Clients data:', clientsData); // Debug: ver qué datos llegan
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
        enqueueSnackbar('Error al cargar la lista de clientes', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [enqueueSnackbar]);

  const handleNext = async () => {
    // Si estamos en el paso 1 (Detalles del Servicio), guardar el servicio
    if (activeStep === 1 && !isEditMode) {
      const currentValues = getValues();
      
      // Validar que todos los campos requeridos estén completos
      if (!isStepValid(1)) {
        enqueueSnackbar('Por favor complete todos los campos requeridos', { variant: 'error' });
        return;
      }

      try {
        const folio = await generateNewFolio();
        
        if (folioError) {
          enqueueSnackbar(`Error al generar folio: ${folioError}`, { variant: 'error' });
          return;
        }
        
        // Crear el servicio con el estado inicial correcto
        const initialStatus = currentValues.requiresVisit === 'si' ? 'Visita Técnica' : 'En Proceso';
        
        const serviceData: Omit<Service, 'id'> = {
          folio,
          clientId: currentValues.clientId,
          status: initialStatus,
          fscf001_data: {
            clientName: clients.find(c => c.id === currentValues.clientId)?.name || '',
            serviceType: currentValues.serviceType,
            description: currentValues.description,
            priority: currentValues.priority,
            estimatedDuration: Number(currentValues.estimatedDuration),
            estimatedStartDate: new Date(currentValues.estimatedStartDate),
            location: currentValues.location,
            contactName: currentValues.contactName,
            contactPhone: currentValues.contactPhone,
            additionalNotes: currentValues.additionalNotes,
            requiresVisit: currentValues.requiresVisit,
            requiresTechnicalVisit: currentValues.requiresVisit === 'si',
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          statusHistory: [
            {
              status: 'Solicitado',
              changedAt: new Date(),
              changedBy: 'currentUser',
              notes: 'Solicitud de servicio creada',
            },
            {
              status: initialStatus,
              changedAt: new Date(),
              changedBy: 'currentUser',
              notes: currentValues.requiresVisit === 'si' 
                ? 'Servicio programado para visita técnica'
                : 'Servicio en proceso - Evaluación administrativa',
            },
          ],
        };

        await addDoc(collection(db, 'services'), serviceData);
        
        enqueueSnackbar('Servicio guardado exitosamente', { variant: 'success' });
        
        // Avanzar al paso de confirmación
        setActiveStep((prevStep) => prevStep + 1);
        
        // Opcional: redirigir a la vista de servicios después de un breve delay
        setTimeout(() => {
          navigate('/services');
        }, 2000);
        
      } catch (error) {
        console.error('Error al guardar servicio:', error);
        enqueueSnackbar('Error al guardar el servicio', { variant: 'error' });
      }
    } else {
      // Para otros pasos, solo avanzar
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.fiscalData?.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const steps = ['Información del Cliente', 'Detalles del Servicio', 'Confirmación'];

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Seleccione un Cliente
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/clients/new')}
                  size="small"
                >
                  Nuevo Cliente
                </Button>
              </Box>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Buscar por nombre, RFC, teléfono o contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : filteredClients.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="textSecondary">
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/clients/new')}
                    sx={{ mt: 2 }}
                  >
                    Agregar Cliente
                  </Button>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                  {/* Header */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr',
                    gap: 1,
                    p: 2,
                    backgroundColor: 'grey.100',
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Nombre / Razón Social</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>RFC</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Teléfono</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Contacto</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Email</Typography>
                  </Box>
                  
                  {/* Client rows */}
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {filteredClients.map((client) => (
                      <Box
                        key={client.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr',
                          gap: 1,
                          p: 2,
                          borderBottom: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          backgroundColor: formValues.clientId === client.id ? 'action.selected' : 'transparent',
                          '&:hover': {
                            backgroundColor: formValues.clientId === client.id ? 'action.selected' : 'action.hover',
                          },
                          '&:last-child': {
                            borderBottom: 0,
                          },
                        }}
                        onClick={() => {
                          setValue('clientId', client.id);
                          // Auto-completar campos de contacto
                          const contactName = client.contactPerson || client.contacts?.[0]?.name || '';
                          const contactPhone = client.phone || client.contacts?.[0]?.phone || '';
                          
                          if (contactName) {
                            setValue('contactName', contactName);
                          }
                          if (contactPhone) {
                            setValue('contactPhone', contactPhone);
                          }
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                            {client.name}
                          </Typography>
                          {client.businessName && client.businessName !== client.name && (
                            <Typography variant="body2" color="text.secondary">
                              {client.businessName}
                            </Typography>
                          )}
                        </Box>
                        
                        <Typography variant="body2">
                          {client.fiscalData?.rfc || client.taxId || '-'}
                        </Typography>
                        
                        <Typography variant="body2">
                          {client.phone || client.contacts?.[0]?.phone || '-'}
                        </Typography>
                        
                        <Typography variant="body2">
                          {client.contactPerson || client.contacts?.[0]?.name || '-'}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {client.email || client.contacts?.[0]?.email || '-'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              )}
              {errors.clientId && (
                <FormHelperText error>{errors.clientId.message}</FormHelperText>
              )}
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <FormControl fullWidth margin="normal" error={Boolean(errors.serviceType)}>
                <InputLabel id="service-type-label">Tipo de Servicio *</InputLabel>
                <Select
                  labelId="service-type-label"
                  id="serviceType"
                  {...register('serviceType')}
                  value={serviceTypesLoading ? '' : (activeServiceTypes.find(type => type.name === formValues.serviceType) ? formValues.serviceType : '')}
                  label="Tipo de Servicio *"
                  disabled={serviceTypesLoading}
                >
                  {serviceTypesLoading ? (
                    <MenuItem disabled>Cargando tipos de servicio...</MenuItem>
                  ) : activeServiceTypes.length === 0 ? (
                    <MenuItem disabled>No hay tipos de servicio disponibles</MenuItem>
                  ) : (
                    activeServiceTypes.map((type) => (
                      <MenuItem key={type.id} value={type.name}>
                        {type.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {errors.serviceType && (
                  <FormHelperText error>{errors.serviceType.message}</FormHelperText>
                )}
              </FormControl>

              <TextField
                fullWidth
                margin="normal"
                id="description"
                label="Descripción del Servicio *"
                multiline
                rows={4}
                {...register('description')}
                value={formValues.description}
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel id="priority-label">Prioridad *</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                    {...register('priority')}
                  value={formValues.priority}
                  label="Prioridad *"
                >
                  <MenuItem value="baja">Baja</MenuItem>
                  <MenuItem value="media">Media</MenuItem>
                  <MenuItem value="alta">Alta</MenuItem>
                  <MenuItem value="urgente">Urgente</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel id="requires-visit-label">¿Requiere Visita Técnica? *</InputLabel>
                <Select
                  labelId="requires-visit-label"
                  id="requiresVisit"
                  {...register('requiresVisit')}
                  value={formValues.requiresVisit || ''}
                  label="¿Requiere Visita Técnica? *"
                >
                  <MenuItem value="">Seleccionar...</MenuItem>
                  <MenuItem value="si">Sí</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
                {errors.requiresVisit && (
                  <FormHelperText error>{errors.requiresVisit.message}</FormHelperText>
                )}
              </FormControl>
            </Box>

            <Box>
              <TextField
                fullWidth
                margin="normal"
                id="estimatedDuration"
                label="Duración Estimada *"
                type="text"
                placeholder="Ej: 3 días, 2 semanas, 1 mes"
                {...register('estimatedDuration')}
                value={formValues.estimatedDuration}
                error={Boolean(errors.estimatedDuration)}
                helperText={errors.estimatedDuration?.message || "Especifique la duración en días, semanas o meses"}
              />

              <TextField
                fullWidth
                margin="normal"
                id="estimatedStartDate"
                label="Fecha Estimada de Inicio *"
                type="date"
                InputLabelProps={{
                  shrink: true,
                }}
                {...register('estimatedStartDate')}
                value={formValues.estimatedStartDate}
                error={Boolean(errors.estimatedStartDate)}
                helperText={errors.estimatedStartDate?.message}
              />

              <TextField
                fullWidth
                margin="normal"
                id="location"
                label="Ubicación *"
                {...register('location')}
                value={formValues.location}
                error={Boolean(errors.location)}
                helperText={errors.location?.message}
              />

              <TextField
                fullWidth
                margin="normal"
                id="contactName"
                label="Nombre del Contacto *"
                {...register('contactName')}
                value={formValues.contactName}
                error={Boolean(errors.contactName)}
                helperText={errors.contactName?.message}
              />

              <TextField
                fullWidth
                margin="normal"
                id="contactPhone"
                label="Teléfono de Contacto *"
                {...register('contactPhone')}
                value={formValues.contactPhone}
                error={Boolean(errors.contactPhone)}
                helperText={errors.contactPhone?.message}
              />

              <TextField
                fullWidth
                margin="normal"
                id="additionalNotes"
                label="Notas Adicionales"
                multiline
                rows={2}
                {...register('additionalNotes')}
                value={formValues.additionalNotes}
              />
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Resumen de la Solicitud
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Cliente:</strong> {clients.find(c => c.id === formValues.clientId)?.name || 'N/A'}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Tipo de Servicio:</strong> {formValues.serviceType || 'N/A'}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Prioridad:</strong> {formValues.priority?.charAt(0).toUpperCase() + formValues.priority?.slice(1) || 'N/A'}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Requiere Visita:</strong> {formValues.requiresVisit === 'si' ? 'Sí' : formValues.requiresVisit === 'no' ? 'No' : 'N/A'}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Duración Estimada:</strong> {formValues.estimatedDuration}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Fecha de Inicio:</strong> {formValues.estimatedStartDate ? format(new Date(formValues.estimatedStartDate), 'PPP', { locale: es }) : 'N/A'}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Ubicación:</strong> {formValues.location || 'N/A'}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Contacto:</strong> {formValues.contactName}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Teléfono:</strong> {formValues.contactPhone}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Descripción:</strong>
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography>{formValues.description || 'Sin descripción'}</Typography>
                  </Paper>
                </Box>
                {formValues.additionalNotes && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Notas Adicionales:</strong>
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography>{formValues.additionalNotes}</Typography>
                    </Paper>
                  </Box>
                )}
              </Box>

              <FormControl
                fullWidth
                required
                error={Boolean(errors.termsAccepted)}
                sx={{ mt: 2 }}
              >
                <InputLabel id="terms-status-label">Estado de Términos y Condiciones *</InputLabel>
                <Select
                  labelId="terms-status-label"
                  id="termsAccepted"
                  value={formValues.termsAccepted ? 'accepted' : formValues.termsAccepted === false ? 'rejected' : ''}
                  label="Estado de Términos y Condiciones *"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'rejected') {
                      setRejectionModalOpen(true);
                    } else {
                      setValue('termsAccepted', value === 'accepted');
                    }
                  }}
                  inputProps={{
                    'aria-hidden': false,
                    'aria-describedby': errors.termsAccepted ? 'terms-error' : undefined
                  }}
                >
                  <MenuItem value="">Seleccionar...</MenuItem>
                  <MenuItem value="accepted">Aceptar</MenuItem>
                  <MenuItem value="rejected">Rechazar</MenuItem>
                </Select>
                {errors.termsAccepted && (
                  <FormHelperText id="terms-error">{errors.termsAccepted.message}</FormHelperText>
                )}
              </FormControl>
            </Box>
          </Box>
        );
      default:
        return <div>Paso no válido</div>;
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return formValues.clientId !== '';
      case 1:
        return (
          formValues.serviceType &&
          formValues.description !== '' &&
          formValues.priority &&
          formValues.requiresVisit &&
          formValues.estimatedDuration !== '' &&
          formValues.estimatedStartDate !== '' &&
          formValues.location !== '' &&
          formValues.contactName !== '' &&
          formValues.contactPhone !== ''
        );
      case 2:
        return formValues.termsAccepted === true;
      default:
        return false;
    }
  };

  return (
    <Box>
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" gutterBottom>
            {isEditMode ? 'Editar Servicio' : 'Nueva Solicitud de Servicio'}
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStepContent(activeStep)}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                {activeStep !== 0 && (
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Atrás
                  </Button>
                )}
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!formValues.termsAccepted || isSubmitting || isGenerating}
                    startIcon={(isSubmitting || isGenerating) ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {isSubmitting || isGenerating ? 
                      (isEditMode ? 'Actualizando...' : 'Creando...') : 
                      (isEditMode ? 'Actualizar Servicio' : 'Crear Solicitud')
                    }
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!isStepValid(activeStep)}
                  >
                    Siguiente
                  </Button>
                )}
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Modal de Visita Técnica */}
        <Dialog 
          open={techVisitModalOpen} 
          onClose={() => setTechVisitModalOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Datos de Visita Técnica
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Complete los datos de la visita técnica para el servicio creado.
            </Typography>
            {tempServiceId && (
              <TechVisitForm 
                serviceId={tempServiceId}
                onSaved={() => {
                  setTechVisitModalOpen(false);
                  enqueueSnackbar('Solicitud de servicio y visita técnica creadas exitosamente', { variant: 'success' });
                  navigate('/services');
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setTechVisitModalOpen(false);
                enqueueSnackbar('Solicitud de servicio creada exitosamente', { variant: 'success' });
                navigate('/services');
              }}
            >
              Omitir por ahora
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Rechazo */}
        <Dialog 
          open={rejectionModalOpen} 
          onClose={() => setRejectionModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Rechazar Servicio
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Por favor, proporcione el motivo del rechazo del servicio.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Motivo del rechazo *"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Describa el motivo por el cual se rechaza este servicio..."
              variant="outlined"
              required
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setRejectionModalOpen(false);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRejection}
              variant="contained"
              color="error"
              disabled={!rejectionReason.trim()}
            >
              Confirmar Rechazo
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
