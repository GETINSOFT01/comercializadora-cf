import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Service } from '../types';

interface TechnicalVisitData {
  visitDate: string;
  technician: string;
  findings: string;
  recommendations: string;
  estimatedCost: number;
  estimatedDuration: string;
  priority: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  status: 'Completada' | 'Pendiente' | 'Requiere Seguimiento';
  notes: string;
  nextSteps: string[];
}

interface TechnicalVisitModalProps {
  open: boolean;
  onClose: () => void;
  service: Service;
  onVisitSaved: (visitData: TechnicalVisitData) => void;
}

const TechnicalVisitModal: React.FC<TechnicalVisitModalProps> = ({
  open,
  onClose,
  service,
  onVisitSaved,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [visitData, setVisitData] = useState<TechnicalVisitData>({
    visitDate: new Date().toISOString().slice(0, 16),
    technician: '',
    findings: '',
    recommendations: '',
    estimatedCost: 0,
    estimatedDuration: '',
    priority: 'Media',
    status: 'Completada',
    notes: '',
    nextSteps: [],
  });
  const [newStep, setNewStep] = useState('');

  const handleAddStep = () => {
    if (newStep.trim()) {
      setVisitData(prev => ({
        ...prev,
        nextSteps: [...prev.nextSteps, newStep.trim()]
      }));
      setNewStep('');
    }
  };

  const handleRemoveStep = (index: number) => {
    setVisitData(prev => ({
      ...prev,
      nextSteps: prev.nextSteps.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!visitData.technician.trim()) {
      enqueueSnackbar('El campo Técnico es obligatorio', { variant: 'error' });
      return;
    }

    if (!visitData.findings.trim()) {
      enqueueSnackbar('El campo Hallazgos es obligatorio', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const visitDate = new Date(visitData.visitDate);
      
      // Save technical visit data to Firestore
      const technicalVisitRef = collection(db, 'technical_visits');
      await addDoc(technicalVisitRef, {
        serviceId: service.id,
        folio: service.folio,
        clientId: service.clientId,
        visitDate,
        technician: visitData.technician,
        findings: visitData.findings,
        recommendations: visitData.recommendations,
        estimatedCost: visitData.estimatedCost,
        estimatedDuration: visitData.estimatedDuration,
        priority: visitData.priority,
        status: visitData.status,
        notes: visitData.notes,
        nextSteps: visitData.nextSteps,
        createdAt: new Date(),
        createdBy: 'current-user', // Replace with actual user ID
      });

      // Update service with technical visit data
      const serviceRef = doc(db, 'services', service.id);
      await updateDoc(serviceRef, {
        technicalVisit: {
          ...visitData,
          visitDate,
        },
        updatedAt: new Date(),
        // Optionally update status to next phase
        ...(visitData.status === 'Completada' && {
          status: 'Cotización Aprobada',
          statusHistory: [
            ...(service.statusHistory || []),
            {
              status: 'Cotización Aprobada',
              changedAt: new Date(),
              notes: 'Visita técnica completada',
              changedBy: 'current-user',
            },
          ],
        }),
      });

      // Create audit log
      await addDoc(collection(db, 'audit_logs'), {
        serviceId: service.id,
        type: 'technical_visit_completed',
        oldStatus: service.status,
        newStatus: visitData.status === 'Completada' ? 'Cotización Aprobada' : service.status,
        notes: `Visita técnica registrada por ${visitData.technician}`,
        changedBy: 'current-user',
        changedAt: new Date(),
        metadata: {
          technician: visitData.technician,
          estimatedCost: visitData.estimatedCost,
          priority: visitData.priority,
        },
      });

      enqueueSnackbar('Visita técnica guardada exitosamente', { variant: 'success' });
      onVisitSaved(visitData);
      onClose();
    } catch (error) {
      console.error('Error saving technical visit:', error);
      enqueueSnackbar('Error al guardar la visita técnica', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        Registrar Visita Técnica
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Información Básica
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Fecha y Hora de Visita"
                value={visitData.visitDate}
                onChange={(e) => setVisitData(prev => ({ ...prev, visitDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                required
                label="Técnico Responsable"
                value={visitData.technician}
                onChange={(e) => setVisitData(prev => ({ ...prev, technician: e.target.value }))}
              />
            </Box>
          </Box>

          {/* Findings and Recommendations */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Hallazgos y Recomendaciones
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                required
                multiline
                rows={4}
                label="Hallazgos de la Visita"
                value={visitData.findings}
                onChange={(e) => setVisitData(prev => ({ ...prev, findings: e.target.value }))}
                placeholder="Describe los hallazgos encontrados durante la visita técnica..."
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Recomendaciones"
                value={visitData.recommendations}
                onChange={(e) => setVisitData(prev => ({ ...prev, recommendations: e.target.value }))}
                placeholder="Recomendaciones basadas en los hallazgos..."
              />
            </Box>
          </Box>

          {/* Cost and Duration */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Estimaciones
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Costo Estimado (MXN)"
                value={visitData.estimatedCost}
                onChange={(e) => setVisitData(prev => ({ ...prev, estimatedCost: Number(e.target.value) }))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
              <TextField
                fullWidth
                label="Duración Estimada"
                value={visitData.estimatedDuration}
                onChange={(e) => setVisitData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                placeholder="ej. 2-3 días, 1 semana"
              />
            </Box>
          </Box>

          {/* Priority and Status */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Estado y Prioridad
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={visitData.priority}
                  label="Prioridad"
                  onChange={(e) => setVisitData(prev => ({ ...prev, priority: e.target.value as TechnicalVisitData['priority'] }))}
                >
                  <MenuItem value="Baja">Baja</MenuItem>
                  <MenuItem value="Media">Media</MenuItem>
                  <MenuItem value="Alta">Alta</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Estado de la Visita</InputLabel>
                <Select
                  value={visitData.status}
                  label="Estado de la Visita"
                  onChange={(e) => setVisitData(prev => ({ ...prev, status: e.target.value as TechnicalVisitData['status'] }))}
                >
                  <MenuItem value="Completada">Completada</MenuItem>
                  <MenuItem value="Pendiente">Pendiente</MenuItem>
                  <MenuItem value="Requiere Seguimiento">Requiere Seguimiento</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Next Steps */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Próximos Pasos
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Agregar paso"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStep();
                  }
                }}
              />
              <Button variant="outlined" onClick={handleAddStep} disabled={!newStep.trim()}>
                Agregar
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {visitData.nextSteps.map((step, index) => (
                <Chip
                  key={index}
                  label={step}
                  onDelete={() => handleRemoveStep(index)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          {/* Additional Notes */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Notas Adicionales
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notas Adicionales"
              value={visitData.notes}
              onChange={(e) => setVisitData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Cualquier información adicional relevante..."
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !visitData.technician.trim() || !visitData.findings.trim()}
        >
          {loading ? 'Guardando...' : 'Guardar Visita Técnica'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TechnicalVisitModal;
