import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  Stack,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Client } from '../../types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) {
        navigate('/clients');
        return;
      }

      try {
        setLoading(true);
        const clientDoc = await getDoc(doc(db, 'clients', id));
        
        if (clientDoc.exists()) {
          setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
        } else {
          enqueueSnackbar('Cliente no encontrado', { variant: 'error' });
          navigate('/clients');
        }
      } catch (error) {
        console.error('Error fetching client:', error);
        enqueueSnackbar('Error al cargar el cliente', { variant: 'error' });
        navigate('/clients');
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id, navigate, enqueueSnackbar]);

  const handleDelete = async () => {
    if (!id || !client) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'clients', id));
      enqueueSnackbar('Cliente eliminado exitosamente', { variant: 'success' });
      navigate('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      enqueueSnackbar('Error al eliminar el cliente', { variant: 'error' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={() => navigate('/clients')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {client.name}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/clients/${id}/edit`)}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Eliminar
          </Button>
        </Box>
      </Box>

      <Stack spacing={3}>
        {/* Información básica */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <BusinessIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Información Básica</Typography>
            </Box>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Nombre del Cliente
                </Typography>
                <Typography variant="body1">{client.name}</Typography>
              </Box>
              {client.businessName && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Razón Social
                  </Typography>
                  <Typography variant="body1">{client.businessName}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  RFC
                </Typography>
                <Typography variant="body1">{client.taxId || 'No especificado'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Estado
                </Typography>
                <Chip
                  label={client.isActive ? 'Activo' : 'Inactivo'}
                  color={client.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Dirección */}
        {client.address && (
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <LocationIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Dirección</Typography>
              </Box>
              <Typography variant="body1">
                {[
                  client.address.street,
                  client.address.city,
                  client.address.state,
                  client.address.zipCode,
                  client.address.country,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Contactos */}
        {client.contacts && client.contacts.length > 0 && (
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Contactos</Typography>
              </Box>
              <Stack spacing={2}>
                {client.contacts.map((contact, index) => (
                  <Box key={index}>
                    {index > 0 && <Divider sx={{ my: 2 }} />}
                    <Stack spacing={1}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {contact.name || 'Sin nombre'}
                      </Typography>
                      {contact.role && (
                        <Typography variant="body2" color="textSecondary">
                          {contact.role}
                        </Typography>
                      )}
                      {contact.email && (
                        <Box display="flex" alignItems="center">
                          <EmailIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2">{contact.email}</Typography>
                        </Box>
                      )}
                      {contact.phone && (
                        <Box display="flex" alignItems="center">
                          <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2">{contact.phone}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Términos de pago */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <PaymentIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Términos de Pago</Typography>
            </Box>
            <Typography variant="body1">
              {client.paymentTerms ? `${client.paymentTerms} días` : 'No especificado'}
            </Typography>
          </CardContent>
        </Card>

        {/* Notas */}
        {client.notes && (
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <NotesIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Notas</Typography>
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {client.notes}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Dialog de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar el cliente "{client.name}"? 
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
