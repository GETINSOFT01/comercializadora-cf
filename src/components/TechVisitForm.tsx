import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from '@mui/material';
import FileUpload, { type FileUploadResult } from './FileUpload';

interface TechVisitData {
  visitDate: string; // ISO date
  technicianName: string;
  location: string;
  findings: string;
  recommendations: string;
  requiresProposal: boolean;
  photos?: string[]; // URLs
}

interface TechVisitFormProps {
  serviceId: string;
  initialData?: Partial<TechVisitData>;
  onSaved?: () => void;
}

export default function TechVisitForm({ serviceId, initialData, onSaved }: TechVisitFormProps) {
  const [form, setForm] = useState<TechVisitData>({
    visitDate: initialData?.visitDate || new Date().toISOString().slice(0, 10),
    technicianName: initialData?.technicianName || '',
    location: initialData?.location || '',
    findings: initialData?.findings || '',
    recommendations: initialData?.recommendations || '',
    requiresProposal: initialData?.requiresProposal ?? true,
    photos: initialData?.photos || [],
  });
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleUpload = (files: FileUploadResult[]) => {
    const urls = files.map((f) => f.url);
    setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, requiresProposal: e.target.checked }));
  };

  const handleSave = async () => {
    if (!serviceId) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, 'services', serviceId), {
        fscf002_data: {
          ...form,
        },
        updatedAt: serverTimestamp(),
      });
      setSnack({ open: true, message: 'Visita técnica guardada', severity: 'success' });
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      setSnack({ open: true, message: err?.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Visita Técnica (FSCF002)" subheader="Optimizado para móviles" />
      <CardContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <TextField
              fullWidth
              label="Fecha de visita"
              type="date"
              name="visitDate"
              value={form.visitDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box>
            <TextField
              fullWidth
              label="Técnico"
              name="technicianName"
              value={form.technicianName}
              onChange={handleChange}
            />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              fullWidth
              label="Ubicación"
              name="location"
              value={form.location}
              onChange={handleChange}
            />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              fullWidth
              label="Hallazgos"
              name="findings"
              value={form.findings}
              onChange={handleChange}
              multiline
              minRows={3}
            />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <TextField
              fullWidth
              label="Recomendaciones"
              name="recommendations"
              value={form.recommendations}
              onChange={handleChange}
              multiline
              minRows={3}
            />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormControlLabel
              control={<Checkbox checked={form.requiresProposal} onChange={handleCheckbox} />}
              label="Requiere generar propuesta"
            />
          </Box>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography variant="subtitle1" gutterBottom>
              Evidencia fotográfica
            </Typography>
            <FileUpload path={`services/${serviceId}/tech_visit`} accept="image/*" multiple onUploaded={handleUpload} />
            {form.photos && form.photos.length > 0 && (
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1 }}>
                {form.photos.map((url, idx) => (
                  <Box key={idx} component="img" src={url} alt={`evidence-${idx}`} sx={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 1 }} />
                ))}
              </Box>
            )}
          </Box>
          <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </Box>
        </Box>
      </CardContent>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}
