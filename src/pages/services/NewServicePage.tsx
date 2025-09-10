import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Service } from '../../types';
import type { ServiceRequestFormData } from '../../schemas/serviceValidation';
import {
  Box,
  Button,
  Divider,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useServiceForm } from '../../hooks/useServiceForm';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const serviceTypes = [
  'Mantenimiento Agrícola',
  'Fumigación',
  'Cosecha',
  'Siembra',
  'Preparación de Terreno',
  'Riego',
  'Otro',
];

// Form validation and state management now handled by useServiceForm hook

export default function NewServicePage() {
  const [activeStep, setActiveStep] = useState(0);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Use our new form validation hook
  const {
    handleSubmit,
    isSubmitting,
    errors,
    register,
    watch,
    setValue,
  } = useServiceForm();

  const formValues = watch();

  const onSubmit = async (values: ServiceRequestFormData) => {
    try {
      // setIsSubmitting(true); // This is handled by the form hook
        
        // Generate folio (CF + YYYY + WW + 3 digits)
        const now = new Date();
        const year = now.getFullYear();
        const weekNumber = Math.ceil(
          ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
        )
          .toString()
          .padStart(2, '0');
        
        // Get the latest service number for this week
        const servicesRef = collection(db, 'services');
        const q = query(
          servicesRef,
          where('createdAt', '>=', new Date(now.setDate(now.getDate() - 7)))
        );
        const querySnapshot = await getDocs(q);
        const serviceNumber = (querySnapshot.size + 1).toString().padStart(3, '0');
        
        const folio = `CF${year}${weekNumber}${serviceNumber}`;
        
        // Create service document
        const serviceData: Omit<Service, 'id'> = {
          folio,
          clientId: values.clientId,
          status: 'Solicitado',
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
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          statusHistory: [
            {
              status: 'Solicitado',
              changedAt: serverTimestamp(),
              changedBy: 'currentUser', // Replace with actual user ID
              notes: 'Solicitud de servicio creada',
            },
          ],
        };
        
        await addDoc(collection(db, 'services'), serviceData);
        
        enqueueSnackbar('Solicitud de servicio creada exitosamente', { variant: 'success' });
        navigate('/services');
      } catch (error) {
        console.error('Error creating service:', error);
        enqueueSnackbar('Error al crear la solicitud de servicio', { variant: 'error' });
      } finally {
        // setIsSubmitting is handled by the form hook
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
        })) as Array<{ id: string; name: string }>;
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

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const steps = ['Información del Cliente', 'Detalles del Servicio', 'Confirmación'];

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Seleccione un Cliente
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Buscar cliente..."
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
                <Paper variant="outlined">
                  <List>
                    {filteredClients.map((client) => (
                      <ListItem key={client.id} disablePadding>
                        <ListItemButton
                          selected={formValues.clientId === client.id}
                          onClick={() => setValue('clientId', client.id)}
                        >
                          <ListItemText primary={client.name} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
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
                  value={formValues.serviceType}
                  label="Tipo de Servicio *"
                >
                  {serviceTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
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
            </Box>

            <Box>
              <TextField
                fullWidth
                margin="normal"
                id="estimatedDuration"
                label="Duración Estimada (horas) *"
                type="number"
                {...register('estimatedDuration')}
                value={formValues.estimatedDuration}
                error={Boolean(errors.estimatedDuration)}
                helperText={errors.estimatedDuration?.message}
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
                    <strong>Duración Estimada:</strong> {formValues.estimatedDuration} horas
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
                required
                error={Boolean(errors.termsAccepted)}
                component="fieldset"
                sx={{ mt: 2 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox 
                      {...register('termsAccepted')} 
                      checked={formValues.termsAccepted} 
                    />
                  }
                  label="Acepto los términos y condiciones del servicio"
                />
                {errors.termsAccepted && (
                  <FormHelperText>{errors.termsAccepted.message}</FormHelperText>
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
          formValues.serviceType !== '' &&
          formValues.description !== '' &&
          formValues.priority &&
          formValues.estimatedDuration !== '' &&
          formValues.estimatedStartDate !== '' &&
          formValues.location !== '' &&
          formValues.contactName !== '' &&
          formValues.contactPhone !== ''
        );
      case 2:
        return Object.keys(errors).length === 0;
      default:
        return false;
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Nueva Solicitud de Servicio
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
                  disabled={Object.keys(errors).length > 0 || isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Solicitud'}
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
    </Box>
  );
}
