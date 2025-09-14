import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Service } from '../../types';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
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
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useServiceForm } from '../../hooks/useServiceForm';
import { useFolioGenerator } from '../../hooks/useFolioGenerator';
import { useServiceTypes } from '../../hooks/useServiceTypes';
import { FormErrorBoundary } from '../../components/error/ErrorBoundary';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NewServicePageValidated() {
  const [activeStep, setActiveStep] = useState(0);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Load service types from catalog
  const { activeServiceTypes, loading: serviceTypesLoading } = useServiceTypes();

  // Use our new form validation hook
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    isSubmitting,
    getFieldError,
    hasFieldError,
    isValid,
  } = useServiceForm();

  const formValues = watch();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsRef = collection(db, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Sin nombre',
        }));
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const { generateNewFolio } = useFolioGenerator();

  const onSubmit = handleSubmit(async (values) => {
    // Generate unique folio using transactional counter
    const folio = await generateNewFolio();
    
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
        additionalNotes: values.additionalNotes || '',
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
    navigate('/services');
  });

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
              {hasFieldError('clientId') && (
                <FormHelperText error>{getFieldError('clientId')}</FormHelperText>
              )}
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <FormControl 
                fullWidth 
                margin="normal" 
                error={hasFieldError('serviceType')}
              >
                <InputLabel id="service-type-label">Tipo de Servicio *</InputLabel>
                <Select
                  labelId="service-type-label"
                  {...register('serviceType')}
                  label="Tipo de Servicio *"
                  value={formValues.serviceType || ''}
                  onChange={(e) => setValue('serviceType', e.target.value)}
                  disabled={serviceTypesLoading}
                >
                  {serviceTypesLoading ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Cargando tipos de servicio...
                    </MenuItem>
                  ) : activeServiceTypes.length === 0 ? (
                    <MenuItem disabled>
                      No hay tipos de servicio disponibles
                    </MenuItem>
                  ) : (
                    activeServiceTypes.map((type) => (
                      <MenuItem key={type.id} value={type.name}>
                        {type.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {hasFieldError('serviceType') && (
                  <FormHelperText>{getFieldError('serviceType')}</FormHelperText>
                )}
              </FormControl>

              <TextField
                fullWidth
                margin="normal"
                label="Descripción del Servicio *"
                multiline
                rows={4}
                {...register('description')}
                error={hasFieldError('description')}
                helperText={getFieldError('description')}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel id="priority-label">Prioridad *</InputLabel>
                <Select
                  labelId="priority-label"
                  {...register('priority')}
                  label="Prioridad *"
                  value={formValues.priority || 'media'}
                  onChange={(e) => setValue('priority', e.target.value as any)}
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
                label="Duración Estimada (horas) *"
                type="number"
                {...register('estimatedDuration')}
                error={hasFieldError('estimatedDuration')}
                helperText={getFieldError('estimatedDuration')}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Fecha Estimada de Inicio *"
                type="date"
                InputLabelProps={{
                  shrink: true,
                }}
                {...register('estimatedStartDate')}
                error={hasFieldError('estimatedStartDate')}
                helperText={getFieldError('estimatedStartDate')}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Ubicación *"
                {...register('location')}
                error={hasFieldError('location')}
                helperText={getFieldError('location')}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Nombre del Contacto *"
                {...register('contactName')}
                error={hasFieldError('contactName')}
                helperText={getFieldError('contactName')}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Teléfono de Contacto *"
                {...register('contactPhone')}
                error={hasFieldError('contactPhone')}
                helperText={getFieldError('contactPhone')}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Notas Adicionales"
                multiline
                rows={2}
                {...register('additionalNotes')}
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
                error={hasFieldError('termsAccepted')}
                component="fieldset"
                sx={{ mt: 2 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      {...register('termsAccepted')}
                      checked={formValues.termsAccepted || false}
                      onChange={(e) => setValue('termsAccepted', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Acepto los términos y condiciones del servicio"
                />
                {hasFieldError('termsAccepted') && (
                  <FormHelperText>{getFieldError('termsAccepted')}</FormHelperText>
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
          formValues.estimatedDuration !== '' &&
          formValues.estimatedStartDate !== '' &&
          formValues.location !== '' &&
          formValues.contactName !== '' &&
          formValues.contactPhone !== ''
        );
      case 2:
        return isValid;
      default:
        return false;
    }
  };

  return (
    <FormErrorBoundary>
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
            <form onSubmit={onSubmit}>
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
                    disabled={!isValid || isSubmitting}
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
    </FormErrorBoundary>
  );
}
