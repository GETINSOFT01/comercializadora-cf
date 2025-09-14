import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import {
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Service } from '../types';

interface ServiceEvaluationModalProps {
  open: boolean;
  onClose: () => void;
  service: Service | null;
  onEvaluationComplete: () => void;
}

export default function ServiceEvaluationModal({
  open,
  onClose,
  service,
  onEvaluationComplete,
}: ServiceEvaluationModalProps) {
  const [decision, setDecision] = useState<'accept' | 'reject' | ''>('');
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [technicalObservations, setTechnicalObservations] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async () => {
    if (!service || !decision) {
      enqueueSnackbar('Por favor complete todos los campos requeridos', { variant: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const newStatus = decision === 'accept' ? 'Cotización Aprobada' : 'Rechazado';
      const evaluationData = {
        decision,
        evaluationNotes,
        technicalObservations,
        estimatedCost: decision === 'accept' ? estimatedCost : null,
        evaluatedAt: new Date(),
        evaluatedBy: 'currentUser', // Replace with actual user ID
      };

      await updateDoc(doc(db, 'services', service.id), {
        status: newStatus,
        evaluationData,
        updatedAt: serverTimestamp(),
        statusHistory: [
          ...(service.statusHistory || []),
          {
            status: newStatus,
            changedAt: new Date(),
            changedBy: 'currentUser', // Replace with actual user ID
            notes: decision === 'accept' 
              ? `Servicio aceptado para cotización: ${evaluationNotes}`
              : `Servicio rechazado: ${evaluationNotes}`,
          },
        ],
      });

      enqueueSnackbar(
        decision === 'accept' 
          ? 'Servicio aceptado y listo para cotización' 
          : 'Servicio rechazado exitosamente',
        { variant: 'success' }
      );

      onEvaluationComplete();
      handleClose();
    } catch (error) {
      console.error('Error al evaluar servicio:', error);
      enqueueSnackbar('Error al procesar la evaluación', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDecision('');
    setEvaluationNotes('');
    setTechnicalObservations('');
    setEstimatedCost('');
    onClose();
  };

  if (!service) return null;

  const requiresTechnicalVisit = service.fscf001_data?.requiresTechnicalVisit;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div">
            Evaluación del Servicio {service.folio}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {requiresTechnicalVisit 
              ? 'Este servicio requiere visita técnica. Evalúe los resultados para decidir si procede a cotización.'
              : 'Este servicio está en evaluación administrativa. Determine si procede a cotización.'
            }
          </Alert>

          <Typography variant="subtitle1" gutterBottom>
            <strong>Cliente:</strong> {service.fscf001_data?.clientName}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Tipo de Servicio:</strong> {service.fscf001_data?.serviceType}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Descripción:</strong> {service.fscf001_data?.description}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Ubicación:</strong> {service.fscf001_data?.location}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend">
            <Typography variant="h6" gutterBottom>
              Decisión de Evaluación *
            </Typography>
          </FormLabel>
          <RadioGroup
            value={decision}
            onChange={(e) => setDecision(e.target.value as 'accept' | 'reject')}
          >
            <FormControlLabel
              value="accept"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AcceptIcon color="success" />
                  <Typography>
                    Aceptar servicio y proceder a cotización
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="reject"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RejectIcon color="error" />
                  <Typography>
                    Rechazar servicio
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Notas de Evaluación *"
          value={evaluationNotes}
          onChange={(e) => setEvaluationNotes(e.target.value)}
          placeholder={
            decision === 'accept' 
              ? 'Describa por qué se acepta el servicio y cualquier consideración especial...'
              : decision === 'reject'
              ? 'Explique las razones del rechazo...'
              : 'Ingrese sus observaciones sobre la evaluación...'
          }
          sx={{ mb: 2 }}
        />

        {requiresTechnicalVisit && (
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Observaciones Técnicas"
            value={technicalObservations}
            onChange={(e) => setTechnicalObservations(e.target.value)}
            placeholder="Resultados de la visita técnica, condiciones del sitio, etc..."
            sx={{ mb: 2 }}
          />
        )}

        {decision === 'accept' && (
          <TextField
            fullWidth
            label="Costo Estimado (MXN)"
            type="number"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="Ingrese el costo estimado para la cotización"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!decision || !evaluationNotes || submitting}
          color={decision === 'accept' ? 'success' : decision === 'reject' ? 'error' : 'primary'}
          startIcon={
            decision === 'accept' ? <AcceptIcon /> : 
            decision === 'reject' ? <RejectIcon /> : null
          }
        >
          {submitting 
            ? 'Procesando...' 
            : decision === 'accept' 
            ? 'Aceptar y Proceder a Cotización'
            : decision === 'reject'
            ? 'Rechazar Servicio'
            : 'Evaluar'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}
