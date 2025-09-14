import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon, Send as SendIcon } from '@mui/icons-material';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useSnackbar } from 'notistack';
import type { Service, ProposalItem, ProposalStatus, Proposal, Client } from '../types';
import { emailService } from '../services/emailService';
import { pdfService } from '../services/pdfService';

interface QuotationModalProps {
  open: boolean;
  onClose: () => void;
  service: Service;
  onQuotationCreated?: () => void;
  existingProposal?: Proposal; // Para editar cotización existente
}

interface QuotationFormData {
  items: ProposalItem[];
  costDetails: {
    labor: number;
    equipment: number;
    materials: number;
    other: number;
  };
  notes?: string;
  validityDays: number;
}

const QuotationModal: React.FC<QuotationModalProps> = ({
  open,
  onClose,
  service,
  onQuotationCreated,
  existingProposal,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  // Function to handle sending quotation email
  const handleSendQuotationEmail = async (proposal: Proposal) => {
    try {
      // Get client data
      const clientDoc = await getDoc(doc(db, 'clients', service.clientId));
      if (!clientDoc.exists()) {
        throw new Error('Cliente no encontrado');
      }
      
      const client = { id: clientDoc.id, ...clientDoc.data() } as Client;

      // Generate PDF
      const pdfBase64 = await pdfService.generateQuotationPDF({
        proposal,
        service,
        client
      });

      // Send email with PDF attachment
      await emailService.sendQuotationEmail({
        proposal,
        service,
        client,
        pdfBase64
      });

    } catch (error) {
      console.error('Error in handleSendQuotationEmail:', error);
      throw error;
    }
  };
  const [formData, setFormData] = useState<QuotationFormData>({
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    costDetails: {
      labor: 0,
      equipment: 0,
      materials: 0,
      other: 0,
    },
    notes: '',
    validityDays: 30,
  });

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateCostDetailsTotal = () => {
    return formData.costDetails.labor + 
           formData.costDetails.equipment + 
           formData.costDetails.materials + 
           formData.costDetails.other;
  };

  const calculateTotalAmount = () => {
    return calculateSubtotal() + calculateCostDetailsTotal();
  };

  const handleItemChange = (index: number, field: keyof ProposalItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total for this item
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = calculateItemTotal(
        newItems[index].quantity,
        newItems[index].unitPrice
      );
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleCostDetailChange = (field: keyof typeof formData.costDetails, value: number) => {
    setFormData({
      ...formData,
      costDetails: { ...formData.costDetails, [field]: value },
    });
  };

  const handleSaveQuotation = async (status: ProposalStatus = 'Borrador') => {
    try {
      setLoading(true);

      const totalAmount = calculateTotalAmount();
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + formData.validityDays);

      const quotationData: Omit<Proposal, 'id'> = {
        serviceId: service.id,
        version: existingProposal ? existingProposal.version + 1 : 1,
        costDetails: formData.costDetails,
        items: formData.items,
        totalAmount,
        status,
        notes: formData.notes,
        validityDays: formData.validityDays,
        createdAt: existingProposal ? existingProposal.createdAt : new Date(),
        updatedAt: new Date(),
      };

      // Create quotation document
      const quotationRef = await addDoc(collection(db, 'proposals'), {
        ...quotationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update service status and add proposal reference
      const newServiceStatus = status === 'Enviada' ? 'Cotización Enviada' : 'Pendiente Cotización';
      await updateDoc(doc(db, 'services', service.id), {
        status: newServiceStatus,
        proposalId: quotationRef.id,
        updatedAt: serverTimestamp(),
      });

      // If status is 'Enviada', send email with PDF
      if (status === 'Enviada') {
        try {
          await handleSendQuotationEmail({
            ...quotationData,
            id: quotationRef.id
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          enqueueSnackbar('Cotización guardada pero falló el envío del email', { variant: 'warning' });
        }
      }

      enqueueSnackbar(
        status === 'Enviada' 
          ? 'Cotización enviada exitosamente' 
          : 'Cotización guardada como borrador',
        { variant: 'success' }
      );

      onQuotationCreated?.();
      onClose();
    } catch (error) {
      console.error('Error saving quotation:', error);
      enqueueSnackbar('Error al guardar la cotización', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
      costDetails: {
        labor: 0,
        equipment: 0,
        materials: 0,
        other: 0,
      },
      notes: '',
      validityDays: 30,
    });
  };

  const loadExistingProposal = () => {
    if (existingProposal) {
      setFormData({
        items: existingProposal.items || [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
        costDetails: existingProposal.costDetails || {
          labor: 0,
          equipment: 0,
          materials: 0,
          other: 0,
        },
        notes: existingProposal.notes || '',
        validityDays: existingProposal.validityDays || 30,
      });
    } else {
      resetForm();
    }
  };

  useEffect(() => {
    if (open) {
      loadExistingProposal();
    }
  }, [open, existingProposal]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box>
          <Typography variant="h6" component="div">
            Crear Cotización - Servicio {service.folio}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cliente: {service.client?.name}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ mt: 1 }}>
          {/* Items Section */}
          <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
            Conceptos y Servicios
          </Typography>
          
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 'auto' }}>Descripción</TableCell>
                  <TableCell sx={{ width: 110, whiteSpace: 'nowrap' }}>Cantidad</TableCell>
                  <TableCell sx={{ width: 140, whiteSpace: 'nowrap' }}>Precio Unitario</TableCell>
                  <TableCell sx={{ width: 140, whiteSpace: 'nowrap' }}>Total</TableCell>
                  <TableCell sx={{ width: 80, whiteSpace: 'nowrap' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Descripción del servicio..."
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        inputProps={{ min: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        ${item.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button
            startIcon={<AddIcon />}
            onClick={addItem}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Agregar Concepto
          </Button>

          {/* Cost Breakdown */}
          <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
            Desglose de Costos
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Mano de Obra"
              type="number"
              value={formData.costDetails.labor}
              onChange={(e) => handleCostDetailChange('labor', Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              fullWidth
              label="Equipo"
              type="number"
              value={formData.costDetails.equipment}
              onChange={(e) => handleCostDetailChange('equipment', Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              fullWidth
              label="Materiales"
              type="number"
              value={formData.costDetails.materials}
              onChange={(e) => handleCostDetailChange('materials', Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              fullWidth
              label="Otros"
              type="number"
              value={formData.costDetails.other}
              onChange={(e) => handleCostDetailChange('other', Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Box>

          {/* Additional Information */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Notas Adicionales"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Condiciones especiales, términos de pago, etc."
            />
            <FormControl fullWidth>
              <InputLabel>Vigencia (días)</InputLabel>
              <Select
                value={formData.validityDays}
                label="Vigencia (días)"
                onChange={(e) => setFormData({ ...formData, validityDays: Number(e.target.value) })}
              >
                <MenuItem value={15}>15 días</MenuItem>
                <MenuItem value={30}>30 días</MenuItem>
                <MenuItem value={45}>45 días</MenuItem>
                <MenuItem value={60}>60 días</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Resumen de Totales */}
          <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
            Resumen de Totales
          </Typography>
          
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Subtotal de Conceptos:</strong></TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      ${calculateSubtotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>• Mano de Obra:</TableCell>
                  <TableCell align="right">
                    ${formData.costDetails.labor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>• Equipo:</TableCell>
                  <TableCell align="right">
                    ${formData.costDetails.equipment.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>• Materiales:</TableCell>
                  <TableCell align="right">
                    ${formData.costDetails.materials.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>• Otros:</TableCell>
                  <TableCell align="right">
                    ${formData.costDetails.other.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Subtotal de Costos:</strong></TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      ${calculateCostDetailsTotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                  <TableCell><strong>GRAN TOTAL:</strong></TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" color="primary">
                      ${calculateTotalAmount().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={() => handleSaveQuotation('Borrador')}
          disabled={loading}
          startIcon={<SaveIcon />}
          variant="outlined"
        >
          Guardar Borrador
        </Button>
        <Button
          onClick={() => handleSaveQuotation('Enviada')}
          disabled={loading || formData.items.some(item => !item.description.trim())}
          startIcon={<SendIcon />}
          variant="contained"
        >
          Enviar Cotización
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuotationModal;
