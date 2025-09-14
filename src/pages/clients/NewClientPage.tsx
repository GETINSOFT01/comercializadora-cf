import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Stack,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useClientForm } from '../../hooks/useClientForm';

export default function NewClientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const isEditing = !!id;

  const {
    register,
    handleSubmit,
    isSubmitting,
    watch,
    reset,
    isValid,
    getFieldError,
    hasFieldError,
    addContact,
    removeContact,
  } = useClientForm();

  const formValues = watch();

  useEffect(() => {
    if (isEditing && id) {
      const fetchClient = async () => {
        try {
          setInitialLoading(true);
          const clientDoc = await getDoc(doc(db, 'clients', id));
          
          if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            reset({
              name: clientData.name || '',
              taxId: clientData.taxId || '',
              address: {
                street: clientData.address?.street || '',
                city: clientData.address?.city || '',
                state: clientData.address?.state || '',
                zipCode: clientData.address?.zipCode || '',
                country: clientData.address?.country || 'México',
              },
              contacts: clientData.contacts || [
                {
                  name: '',
                  role: '',
                  email: '',
                  phone: '',
                },
              ],
              paymentTerms: clientData.paymentTerms || 30,
              notes: clientData.notes || '',
            });
          } else {
            enqueueSnackbar('Cliente no encontrado', { variant: 'error' });
            navigate('/clients');
          }
        } catch (error) {
          console.error('Error fetching client:', error);
          enqueueSnackbar('Error al cargar el cliente', { variant: 'error' });
          navigate('/clients');
        } finally {
          setInitialLoading(false);
        }
      };

      fetchClient();
    }
  }, [id, isEditing, reset, enqueueSnackbar, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);

      const clientData = {
        ...values,
        updatedAt: serverTimestamp(),
        ...(isEditing ? {} : { createdAt: serverTimestamp() }),
      };

      if (isEditing && id) {
        await updateDoc(doc(db, 'clients', id), clientData);
        enqueueSnackbar('Cliente actualizado exitosamente', { variant: 'success' });
      } else {
        await addDoc(collection(db, 'clients'), clientData);
        enqueueSnackbar('Cliente creado exitosamente', { variant: 'success' });
      }

      navigate('/clients');
    } catch (error) {
      console.error('Error saving client:', error);
      enqueueSnackbar('Error al guardar el cliente', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  });

  if (initialLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <form onSubmit={onSubmit}>
            <Stack spacing={3}>
              {/* Información básica */}
              <Typography variant="h6">
                Información Básica
              </Typography>
              
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Nombre del Cliente"
                  {...register('name')}
                  error={hasFieldError('name')}
                  helperText={getFieldError('name')}
                />

                <TextField
                  fullWidth
                  label="RFC"
                  {...register('taxId')}
                  error={hasFieldError('taxId')}
                  helperText={getFieldError('taxId')}
                />
              </Stack>

              {/* Dirección */}
              <Typography variant="h6" sx={{ mt: 2 }}>
                Dirección
              </Typography>

              <TextField
                fullWidth
                label="Calle y Número"
                {...register('address.street')}
                error={hasFieldError('address.street')}
                helperText={getFieldError('address.street')}
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  {...register('address.city')}
                  error={hasFieldError('address.city')}
                  helperText={getFieldError('address.city')}
                />

                <TextField
                  fullWidth
                  label="Estado"
                  {...register('address.state')}
                  error={hasFieldError('address.state')}
                  helperText={getFieldError('address.state')}
                />

                <TextField
                  fullWidth
                  label="Código Postal"
                  {...register('address.zipCode')}
                  error={hasFieldError('address.zipCode')}
                  helperText={getFieldError('address.zipCode')}
                />
              </Stack>

              {/* Contactos */}
              <Typography variant="h6" sx={{ mt: 2 }}>
                Contactos
              </Typography>

              {formValues.contacts?.map((_, index) => (
                <Box key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Nombre del Contacto"
                        {...register(`contacts.${index}.name`)}
                        error={hasFieldError(`contacts.${index}.name`)}
                        helperText={getFieldError(`contacts.${index}.name`)}
                      />

                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        {...register(`contacts.${index}.email`)}
                        error={hasFieldError(`contacts.${index}.email`)}
                        helperText={getFieldError(`contacts.${index}.email`)}
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Teléfono"
                        {...register(`contacts.${index}.phone`)}
                        error={hasFieldError(`contacts.${index}.phone`)}
                        helperText={getFieldError(`contacts.${index}.phone`)}
                      />

                      <TextField
                        fullWidth
                        label="Rol"
                        {...register(`contacts.${index}.role`)}
                        error={hasFieldError(`contacts.${index}.role`)}
                        helperText={getFieldError(`contacts.${index}.role`)}
                      />
                    </Stack>

                    {formValues.contacts && formValues.contacts.length > 1 && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => removeContact(index)}
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Eliminar Contacto
                      </Button>
                    )}
                  </Stack>
                </Box>
              ))}

              <Button
                variant="outlined"
                onClick={addContact}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Agregar Contacto
              </Button>

              {/* Términos de pago */}
              <TextField
                label="Términos de Pago (días)"
                type="number"
                {...register('paymentTerms')}
                error={hasFieldError('paymentTerms')}
                helperText={getFieldError('paymentTerms')}
                sx={{ maxWidth: 300 }}
              />

              {/* Notas */}
              <TextField
                fullWidth
                label="Notas"
                multiline
                rows={3}
                {...register('notes')}
                error={hasFieldError('notes')}
                helperText={getFieldError('notes')}
              />

              {/* Botones */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/clients')}
                  disabled={loading || isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isValid || isSubmitting || loading}
                  startIcon={isSubmitting || loading ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {isSubmitting || loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
