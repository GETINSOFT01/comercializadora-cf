import { useState } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Typography,
  Stack,
  Button,
  LinearProgress,
  Snackbar,
  Alert,
} from '@mui/material';

interface DailyReportFormProps {
  serviceId: string;
  supervisorUid: string;
  onCreated?: () => void;
}

export default function DailyReportForm({ serviceId, supervisorUid, onCreated }: DailyReportFormProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [hectares, setHectares] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [fuel, setFuel] = useState<string>('');
  const [fertilizer, setFertilizer] = useState<string>('');
  const [incidents, setIncidents] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async () => {
    if (!serviceId || !supervisorUid) return;
    try {
      setUploading(true);
      setProgress(0);
      // 1) Create RAD doc without evidenceURLs to get radId
      const radRef = await addDoc(collection(db, 'daily_reports'), {
        serviceId,
        date: new Date(date),
        progress: {
          hectares: Number(hectares || 0),
          hours: Number(hours || 0),
        },
        consumables: {
          fuel: Number(fuel || 0),
          fertilizer: Number(fertilizer || 0),
        },
        incidents: incidents || '',
        evidenceURLs: [],
        reportedBy: supervisorUid,
        createdAt: serverTimestamp(),
      });

      const radId = radRef.id;
      const urls: string[] = [];

      // 2) Upload evidence files if any
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const path = `services/${serviceId}/rad/${radId}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, path);
          const task = uploadBytesResumable(storageRef, file);
          await new Promise<void>((resolve, reject) => {
            task.on('state_changed', (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setProgress(pct);
            }, reject, async () => {
              const url = await getDownloadURL(task.snapshot.ref);
              urls.push(url);
              resolve();
            });
          });
        }
      }

      // 3) Update doc with evidence URLs
      if (urls.length > 0) {
        await updateDoc(doc(db, 'daily_reports', radId), {
          evidenceURLs: urls,
          updatedAt: serverTimestamp(),
        });
      }

      setSnack({ open: true, message: 'RAD creado con éxito', severity: 'success' });
      setHectares('');
      setHours('');
      setFuel('');
      setFertilizer('');
      setIncidents('');
      setFiles(null);
      setProgress(0);
      onCreated?.();
    } catch (err: any) {
      console.error(err);
      setSnack({ open: true, message: err?.message || 'Error al crear RAD', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Reporte de Avance Diario (RAD)" />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Fecha"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField label="Hectáreas" type="number" value={hectares} onChange={(e) => setHectares(e.target.value)} fullWidth />
            <TextField label="Horas" type="number" value={hours} onChange={(e) => setHours(e.target.value)} fullWidth />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Combustible (L)" type="number" value={fuel} onChange={(e) => setFuel(e.target.value)} fullWidth />
            <TextField label="Fertilizante (kg)" type="number" value={fertilizer} onChange={(e) => setFertilizer(e.target.value)} fullWidth />
          </Stack>

          <TextField label="Incidentes" multiline minRows={3} value={incidents} onChange={(e) => setIncidents(e.target.value)} fullWidth />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Evidencias fotográficas
            </Typography>
            <Button variant="outlined" component="label" disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Seleccionar fotos'}
              <input type="file" hidden accept="image/*" multiple onChange={onFileChange} />
            </Button>
            {uploading && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption">Progreso: {progress}%</Typography>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            )}
            {files && files.length > 0 && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                {files.length} archivo(s) seleccionado(s)
              </Typography>
            )}
          </Box>

          <Box display="flex" justifyContent="flex-end">
            <Button variant="contained" onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Guardando...' : 'Guardar RAD'}
            </Button>
          </Box>
        </Stack>
      </CardContent>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}
