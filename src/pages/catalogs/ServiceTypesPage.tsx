import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useServiceTypes } from '../../hooks/useServiceTypes';
import { serviceTypeSchema, type ServiceTypeFormData } from '../../schemas/catalogValidation';
import type { ServiceType } from '../../types/catalog';

export default function ServiceTypesPage() {
  const {
    serviceTypes,
    loading,
    saving,
    createServiceType,
    updateServiceType,
    deleteServiceType,
  } = useServiceTypes();

  // Debug logs
  console.log('🔍 ServiceTypesPage - loading:', loading);
  console.log('🔍 ServiceTypesPage - serviceTypes:', serviceTypes);
  console.log('🔍 ServiceTypesPage - saving:', saving);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ServiceType | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ServiceTypeFormData>({
    resolver: zodResolver(serviceTypeSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      active: true,
      order: 0,
    },
  });

  const handleOpenDialog = (type?: ServiceType) => {
    if (type) {
      setEditingType(type);
      reset({
        name: type.name,
        description: type.description || '',
        active: type.active,
        order: type.order || 0,
      });
    } else {
      setEditingType(null);
      reset({
        name: '',
        description: '',
        active: true,
        order: serviceTypes.length,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingType(null);
    reset();
  };

  const handleSave = async (data: ServiceTypeFormData) => {
    let success = false;
    
    if (editingType) {
      success = await updateServiceType(editingType.id, data);
    } else {
      const id = await createServiceType(data);
      success = !!id;
    }

    if (success) {
      handleCloseDialog();
    }
  };

  const handleDeleteClick = (type: ServiceType) => {
    setTypeToDelete(type);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (typeToDelete) {
      const success = await deleteServiceType(typeToDelete.id);
      if (success) {
        setDeleteConfirmOpen(false);
        setTypeToDelete(null);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setTypeToDelete(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Catálogo de Tipos de Servicio
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={saving}
        >
          Nuevo Tipo de Servicio
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}>Orden</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell width={100}>Estado</TableCell>
              <TableCell width={120}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="textSecondary">
                    No hay tipos de servicio registrados
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              serviceTypes.map((type) => (
                <TableRow key={type.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
                      {type.order ?? 0}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {type.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {type.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={type.active ? 'Activo' : 'Inactivo'}
                      color={type.active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(type)}
                          disabled={saving}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(type)}
                          disabled={saving}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(handleSave)}>
          <DialogTitle>
            {editingType ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                {...register('name')}
                label="Nombre *"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={saving}
              />
              
              <TextField
                {...register('description')}
                label="Descripción"
                fullWidth
                multiline
                rows={3}
                error={!!errors.description}
                helperText={errors.description?.message}
                disabled={saving}
              />

              <TextField
                {...register('order', { valueAsNumber: true })}
                label="Orden"
                type="number"
                fullWidth
                error={!!errors.order}
                helperText={errors.order?.message || 'Orden de aparición en las listas'}
                disabled={saving}
              />

              <FormControlLabel
                control={
                  <Switch
                    {...register('active')}
                    defaultChecked={true}
                    disabled={saving}
                  />
                }
                label="Activo"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!isValid || saving}
            >
              {saving ? <CircularProgress size={20} /> : (editingType ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el tipo de servicio "{typeToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Esta acción desactivará el tipo de servicio para evitar problemas con servicios existentes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
