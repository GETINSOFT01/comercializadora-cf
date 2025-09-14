import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDocs, query, where, limit } from 'firebase/firestore';
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Autocomplete, Switch, FormControlLabel, Chip, Tooltip } from '@mui/material';

interface DailyReportFormProps {
  serviceId: string;
  supervisorUid: string;
  onCreated?: () => void;
}

export default function DailyReportForm({ serviceId, supervisorUid, onCreated }: DailyReportFormProps) {
  const [date, setDate] = useState<Date | null>(new Date());
  const [hectares, setHectares] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [fuel, setFuel] = useState<string>('');
  const [fertilizer, setFertilizer] = useState<string>('');
  const [incidents, setIncidents] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  // Optional association to Work Order task
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [woTasks, setWoTasks] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState<boolean>(false);
  const [showOnlyInProgress, setShowOnlyInProgress] = useState<boolean>(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  // Load Work Order and tasks for this service (optional association)
  useEffect(() => {
    const loadWO = async () => {
      try {
        const woQ = query(collection(db, 'work_orders'), where('serviceId', '==', serviceId), limit(1));
        const woSnap = await getDocs(woQ);
        if (!woSnap.empty) {
          const woId = woSnap.docs[0].id;
          setWorkOrderId(woId);
          const tasksSnap = await getDocs(collection(db, 'work_orders', woId, 'tasks'));
          const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          // Save tasks (we'll filter/sort in UI)
          setWoTasks(tasks.map(t => ({ id: t.id, name: t.name || 'Tarea', status: t.status || 'pendiente', dueDate: (t as any).dueDate || null } as any)) as any);
        } else {
          setWorkOrderId(null);
          setWoTasks([]);
        }
      } catch (_) {
        setWorkOrderId(null);
        setWoTasks([]);
      }
    };
    if (serviceId) loadWO();
  }, [serviceId]);

  // Upload helper with retry & exponential backoff
  async function uploadWithRetry(path: string, file: File, maxAttempts = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const storageReference = ref(storage, path);
        const task = uploadBytesResumable(storageReference, file);
        await new Promise<void>((resolve, reject) => {
          task.on('state_changed', (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          }, reject, () => resolve());
        });
        return await getDownloadURL(ref(storage, path));
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        // 500/503 or network: wait and retry
        const backoff = 500 * Math.pow(2, attempt - 1); // 500ms, 1s, 2s
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    throw new Error('Upload failed');
  }

  function classifyUploadError(err: any): string {
    const code = err?.code || err?.name || 'unknown';
    const msg = err?.message || String(err);
    const lower = (msg || '').toLowerCase();
    const isNetwork = lower.includes('network') || lower.includes('failed to fetch');
    const isCors = lower.includes('cors') || lower.includes('preflight') || lower.includes('access-control');
    const is503 = lower.includes('503') || lower.includes('service unavailable');
    const status = err?.status || err?.response?.status;
    const base = `Error al subir evidencia (${code}${status ? `, ${status}` : ''}).`;

    // Specific mappings
    if (code === 'storage/unauthorized' || code === 'auth/unauthorized' || status === 401 || status === 403) {
      return `${base} Permisos insuficientes. Inicia sesión nuevamente y verifica las reglas de Storage/Firestore para permitir escritura en la ruta del servicio.`;
    }
    if (code === 'storage/canceled') {
      return `${base} Subida cancelada por el usuario.`;
    }
    if (code === 'storage/retry-limit-exceeded') {
      return `${base} Se alcanzó el límite de reintentos. Reintenta en unos segundos.`;
    }
    if (isCors) {
      return `${base} Preflight/CORS falló. Recarga la página (actualiza el Service Worker), prueba sin extensiones (incógnito) y verifica tu conexión/VPN.`;
    }
    if (is503 || status === 503) {
      return `${base} Servicio temporalmente no disponible (503). Intentaremos reintentar automáticamente; si persiste, reintenta más tarde.`;
    }
    if (isNetwork) {
      return `${base} Problema de red. Verifica tu conexión e inténtalo de nuevo.`;
    }
    return `${base} ${msg}`;
  }

  async function logUploadError(fileName: string, err: any) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        type: 'upload_error',
        serviceId,
        fileName,
        context: 'RAD evidence',
        errorCode: err?.code || err?.name || 'unknown',
        message: err?.message || String(err),
        happenedAt: serverTimestamp(),
        userId: supervisorUid || null,
      });
    } catch (_) {
      // ignore audit log failures
    }
  }

  const handleSubmit = async () => {
    if (!serviceId || !supervisorUid) return;
    try {
      setUploading(true);
      setProgress(0);
      const selectedDate = date ? new Date(date) : new Date();
      // 1) Create RAD doc without evidenceURLs to get radId
      const radRef = await addDoc(collection(db, 'daily_reports'), {
        serviceId,
        date: selectedDate,
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

      // 2) Upload evidence files if any (with retry)
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const path = `services/${serviceId}/rad/${radId}/${Date.now()}_${file.name}`;
          try {
            const url = await uploadWithRetry(path, file, 3);
            urls.push(url);
            // Audit success
            try {
              await addDoc(collection(db, 'audit_logs'), {
                type: 'rad_evidence_upload_success',
                serviceId,
                radId,
                fileName: file.name,
                storagePath: path,
                url,
                contentType: file.type || null,
                size: file.size,
                happenedAt: serverTimestamp(),
                userId: supervisorUid || null,
              });
            } catch (_) {}
          } catch (e) {
            await logUploadError(file.name, e);
            throw e;
          }
        }
      }

      // 3) Update doc with evidence URLs
      if (urls.length > 0) {
        await updateDoc(doc(db, 'daily_reports', radId), {
          evidenceURLs: urls,
          updatedAt: serverTimestamp(),
        });
      }

      // 4) If a task was selected and there is a Work Order, mark it as completed via RAD
      if (workOrderId && selectedTaskId) {
        try {
          await updateDoc(doc(db, 'work_orders', workOrderId, 'tasks', selectedTaskId), {
            status: 'completada',
            completedViaRAD: radId,
            updatedAt: serverTimestamp(),
          });
          await addDoc(collection(db, 'audit_logs'), {
            type: 'work_order_task_completed_via_rad',
            serviceId,
            workOrderId,
            taskId: selectedTaskId,
            radId,
            happenedAt: serverTimestamp(),
            userId: supervisorUid || null,
          });
        } catch (_) {}
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
      setSnack({ open: true, message: classifyUploadError(err) || 'Error al crear RAD', severity: 'error' });
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
            <DatePicker
              label="Fecha"
              value={date}
              onChange={(val) => setDate(val)}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <TextField label="Hectáreas" type="number" value={hectares} onChange={(e) => setHectares(e.target.value)} fullWidth />
            <TextField label="Horas" type="number" value={hours} onChange={(e) => setHours(e.target.value)} fullWidth />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Combustible (L)" type="number" value={fuel} onChange={(e) => setFuel(e.target.value)} fullWidth />
            <TextField label="Fertilizante (kg)" type="number" value={fertilizer} onChange={(e) => setFertilizer(e.target.value)} fullWidth />
          </Stack>

          <TextField label="Incidentes" multiline minRows={3} value={incidents} onChange={(e) => setIncidents(e.target.value)} fullWidth />

          {workOrderId && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Switch size="small" checked={showAllTasks} onChange={(e) => setShowAllTasks(e.target.checked)} />}
                  label="Mostrar todas"
                />
                <FormControlLabel
                  control={<Switch size="small" checked={showOnlyInProgress} onChange={(e) => setShowOnlyInProgress(e.target.checked)} />}
                  label="Solo en progreso"
                />
                <Chip
                  size="small"
                  label={`Pendientes: ${woTasks.filter((t: any) => t.status !== 'completada').length}/${woTasks.length}`}
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, alignItems: 'center', gap: 1 }}>
              <Autocomplete
                options={[...woTasks]
                  .filter((t: any) => {
                    if (showOnlyInProgress) return t.status === 'en_progreso';
                    return showAllTasks ? true : t.status !== 'completada';
                  })
                  .sort((a: any, b: any) => {
                    const rank: Record<string, number> = { en_progreso: 0, pendiente: 1, completada: 2 };
                    const ra = rank[a.status] ?? 99;
                    const rb = rank[b.status] ?? 99;
                    if (ra !== rb) return ra - rb;
                    const ad = a.dueDate?.toDate?.() ? new Date(a.dueDate.toDate()) : (a.dueDate ? new Date(a.dueDate) : null);
                    const bd = b.dueDate?.toDate?.() ? new Date(b.dueDate.toDate()) : (b.dueDate ? new Date(b.dueDate) : null);
                    if (ad && bd) return ad.getTime() - bd.getTime();
                    if (ad && !bd) return -1;
                    if (!ad && bd) return 1;
                    return (a.name || '').localeCompare(b.name || '');
                  })}
                getOptionLabel={(opt) => `${opt.name}${opt.status ? ` (${opt.status})` : ''}`}
                renderOption={(props, option: any) => {
                  const due = option.dueDate?.toDate?.() ? new Date(option.dueDate.toDate()) : (option.dueDate ? new Date(option.dueDate) : null);
                  const todayStr = new Date().toISOString().slice(0,10);
                  const dueStr = due ? due.toISOString().slice(0,10) : '';
                  const isOverdue = !!dueStr && dueStr < todayStr && option.status !== 'completada';
                  const isFuture = !!dueStr && dueStr > todayStr;
                  let rel = '';
                  let dCounter = '';
                  if (due) {
                    const start = new Date(); start.setHours(0,0,0,0);
                    const end = new Date(due); end.setHours(0,0,0,0);
                    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) rel = `en ${diffDays} día${diffDays === 1 ? '' : 's'}`;
                    if (diffDays === 0) rel = 'hoy';
                    if (diffDays < 0) rel = `hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`;
                    dCounter = diffDays === 0 ? 'D0' : (diffDays > 0 ? `D+${diffDays}` : `D-${Math.abs(diffDays)}`);
                  }
                  return (
                    <li {...props} key={option.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">{option.name}{option.status ? ` (${option.status})` : ''}</Typography>
                        {isOverdue && (
                          <Tooltip title={`Vence: ${due?.toLocaleDateString()} • ${rel}`}>
                            <Chip size="small" color="error" label="Vencida" />
                          </Tooltip>
                        )}
                        {option.status === 'en_progreso' && (
                          <Tooltip title={`En progreso • ${due ? `vence: ${due.toLocaleDateString()} • ${rel}` : '—'}`}>
                            <Chip size="small" color="info" label="En progreso" />
                          </Tooltip>
                        )}
                        {isFuture && option.status !== 'completada' && (
                          <Tooltip title={`${rel} • vence: ${due?.toLocaleDateString()}`}>
                            <Chip size="small" color="success" label="Próxima" />
                          </Tooltip>
                        )}
                        {option.status === 'pendiente' && (
                          <Chip size="small" color="warning" label="Pendiente" />
                        )}
                        {dCounter && (
                          <Chip size="small" variant="outlined" label={dCounter} />
                        )}
                        {showAllTasks && option.status === 'completada' && (
                          <Chip size="small" color="default" label="Completada" />
                        )}
                      </Box>
                    </li>
                  );
                }}
                onChange={(_, value: any) => {
                  if (value && value.status === 'completada') {
                    setSnack({ open: true, message: 'La tarea seleccionada ya está completada. Selecciona una pendiente o en progreso.', severity: 'error' });
                    setSelectedTaskId(null);
                    return;
                  }
                  setSelectedTaskId(value ? value.id : null);
                }}
                renderInput={(params) => <TextField {...params} label="Asociar a tarea de OT (opcional)" />} 
              />
              <Button variant="text" onClick={() => setSelectedTaskId(null)} disabled={!selectedTaskId}>Limpiar</Button>
              </Box>
            </Box>
          )}

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
