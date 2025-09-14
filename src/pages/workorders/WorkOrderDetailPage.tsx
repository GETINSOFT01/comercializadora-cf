import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Paper, Typography, CircularProgress, Chip, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Select, MenuItem, FormControl, InputLabel, Tooltip, Divider 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc, where, addDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../../firebase/config';
import { useSnackbar } from 'notistack';

interface WorkOrderData {
  id: string;
  serviceId: string;
  serviceFolio?: string;
  status?: string;
  scope?: string;
  responsible?: string;
  targetDates?: { start?: any; end?: any };
  proposalRef?: string | null;
  proposalTotal?: number | null;
}

export default function WorkOrderDetailPage() {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [wo, setWo] = useState<WorkOrderData | null>(null);
  const [resources, setResources] = useState<any | null>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskStartDate, setTaskStartDate] = useState<Date | null>(null);
  const [taskDueDate, setTaskDueDateLocal] = useState<Date | null>(null);
  const [taskPriority, setTaskPriority] = useState<'alta' | 'media' | 'baja'>('media');
  const invalidNewRange = useMemo(() => Boolean(taskStartDate && taskDueDate && (taskStartDate as any) > (taskDueDate as any)), [taskStartDate, taskDueDate]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [catalogPersonnel, setCatalogPersonnel] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendiente' | 'en_progreso' | 'completada'>('todos');
  const [filterPriority, setFilterPriority] = useState<'todas' | 'alta' | 'media' | 'baja'>('todas');
  const [sortBy, setSortBy] = useState<'createdAt_desc' | 'name_asc' | 'status_asc' | 'priority_desc'>('createdAt_desc');
  // removed inline edit state in favor of dedicated modal
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);
  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const invalidEditRange = useMemo(() => Boolean(editStartDate && editDueDate && (editStartDate as any) > (editDueDate as any)), [editStartDate, editDueDate]);

  const statusColor = useMemo(() => {
    switch (wo?.status) {
      case 'Abierta': return 'warning';
      case 'En Progreso': return 'primary';
      case 'Cerrada': return 'success';
      default: return 'default';
    }
  }, [wo?.status]);

  useEffect(() => {
    const load = async () => {
      if (!workOrderId) return;
      setLoading(true);
      try {
        const ref = doc(db, 'work_orders', workOrderId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = { id: snap.id, ...(snap.data() as any) } as WorkOrderData;
          setWo(data);
          // resources by serviceId
          if (data.serviceId) {
            const rQ = query(collection(db, 'service_resources'), where('serviceId', '==', data.serviceId));
            const rS = await getDocs(rQ);
            setResources(rS.empty ? null : { id: rS.docs[0].id, ...(rS.docs[0].data() as any) });
            const aQ = query(collection(db, 'audit_logs'), where('serviceId', '==', data.serviceId));
            const aS = await getDocs(aQ);
            const list: any[] = []; aS.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
            list.sort((a, b) => {
              const at = a.happenedAt?.toDate?.() || a.changedAt?.toDate?.() || new Date(a.happenedAt || a.changedAt || 0);
              const bt = b.happenedAt?.toDate?.() || b.changedAt?.toDate?.() || new Date(b.happenedAt || b.changedAt || 0);
              return (bt as any) - (at as any);
            });
            setAudit(list);
            // load personnel catalog
            try {
              const pSnap = await getDocs(collection(db, 'catalog_personnel'));
              const p = pSnap.docs.map(d => (d.data() as any).name).filter(Boolean) as string[];
              setCatalogPersonnel(p);
            } catch (_) {}
          }
          // Load tasks realtime
          setTasksLoading(true);
          const tQ = query(collection(db, 'work_orders', snap.id, 'tasks'), orderBy('createdAt', 'desc'));
          onSnapshot(tQ, (s) => {
            const arr: any[] = [];
            s.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
            setTasks(arr);
            setTasksLoading(false);
          }, () => setTasksLoading(false));
        } else {
          navigate('/services');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workOrderId, navigate]);

  const deleteTask = async (taskId: string) => {
    if (!wo) return;
    try {
      setUpdating(true);
      await deleteDoc(doc(db, 'work_orders', wo.id, 'tasks', taskId));
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_task_deleted', serviceId: wo.serviceId, happenedAt: serverTimestamp(), taskId });
    } finally {
      setUpdating(false);
    }
  };

  const confirmDeleteTask = (t: any) => {
    setTaskToDelete({ id: t.id, name: t.name || '' });
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    await deleteTask(taskToDelete.id);
    setDeleteOpen(false);
    setTaskToDelete(null);
  };

  const startEditTask = (t: any) => {
    // open dedicated edit modal
    setEditTaskId(t.id);
    setEditTaskName(t.name || '');
    const s = t.startDate?.toDate?.() ? new Date(t.startDate.toDate()) : (t.startDate ? new Date(t.startDate) : null);
    const d = t.dueDate?.toDate?.() ? new Date(t.dueDate.toDate()) : (t.dueDate ? new Date(t.dueDate) : null);
    setEditStartDate(s);
    setEditDueDate(d);
    setEditDialogOpen(true);
  };

  const saveEditTask = async () => {
    if (!wo || !editTaskId || invalidEditRange) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'work_orders', wo.id, 'tasks', editTaskId), { 
        name: editTaskName.trim(), 
        startDate: editStartDate || null,
        dueDate: editDueDate || null,
        updatedAt: new Date() 
      });
      await addDoc(collection(db, 'audit_logs'), { 
        type: 'work_order_task_edited', 
        serviceId: wo.serviceId, 
        happenedAt: serverTimestamp(), 
        taskId: editTaskId,
        fields: {
          name: editTaskName.trim(),
          startDate: editStartDate ? editStartDate.toISOString() : null,
          dueDate: editDueDate ? editDueDate.toISOString() : null,
        }
      });
    } finally {
      setUpdating(false);
      setEditDialogOpen(false);
      setEditTaskId(null);
      setEditTaskName('');
      setEditStartDate(null);
      setEditDueDate(null);
    }
  };

  const tasksFilteredSorted = useMemo(() => {
    let arr = [...tasks];
    if (filterStatus !== 'todos') arr = arr.filter(t => t.status === filterStatus);
    if (filterPriority !== 'todas') arr = arr.filter(t => (t.priority || 'media') === filterPriority);
    const prioRank = (p?: string) => p === 'alta' ? 0 : (p === 'media' ? 1 : (p === 'baja' ? 2 : 1));
    if (sortBy === 'priority_desc') arr.sort((a,b) => prioRank(a.priority) - prioRank(b.priority));
    if (sortBy === 'name_asc') arr.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    if (sortBy === 'status_asc') arr.sort((a,b) => (a.status || '').localeCompare(b.status || ''));
    // createdAt_desc is default due to query order; if changed, we can re-sort
    return arr;
  }, [tasks, filterStatus, filterPriority, sortBy]);

  const progressPct = useMemo(() => {
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.status === 'completada').length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  // --- Lightweight Gantt calculations (no external deps)
  const gantt = useMemo(() => {
    if (!tasks.length) {
      const today = new Date(); today.setHours(0,0,0,0);
      const end = new Date(today); end.setDate(end.getDate() + 7);
      return { start: today, end, days: 8 };
    }
    const dates: Date[] = [];
    for (const t of tasks) {
      const created = t.createdAt?.toDate?.() ? new Date(t.createdAt.toDate()) : (t.createdAt ? new Date(t.createdAt) : new Date());
      created.setHours(0,0,0,0);
      dates.push(created);
      const due = t.dueDate?.toDate?.() ? new Date(t.dueDate.toDate()) : (t.dueDate ? new Date(t.dueDate) : null);
      if (due) { due.setHours(0,0,0,0); dates.push(due); }
    }
    const minD = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...dates.map(d => d.getTime())));
    // Add padding on both sides
    const start = new Date(minD); start.setDate(start.getDate() - 2);
    const end = new Date(maxD); end.setDate(end.getDate() + 5);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1);
    return { start, end, days };
  }, [tasks]);

  const dayWidth = 32; // px per day (more space for labels)
  function dateToX(d: Date | null) {
    if (!d) return 0;
    const day = new Date(d); day.setHours(0,0,0,0);
    const diff = Math.round((day.getTime() - gantt.start.getTime()) / (1000*60*60*24));
    return Math.max(0, Math.min(diff, gantt.days)) * dayWidth;
  }
  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);
  const todayX = dateToX(today);
  const todayInRange = todayX >= 0 && todayX <= gantt.days * dayWidth;

  const exportCSV = () => {
    const headers = ['Nombre','Estado','Responsable','Prioridad','Inicio','Vence','D-counter','Creado'];
    const rows = tasksFilteredSorted.map(t => {
      const startDate = t.startDate?.toDate?.() ? new Date(t.startDate.toDate()) : (t.startDate ? new Date(t.startDate) : null);
      const due = t.dueDate?.toDate?.() ? new Date(t.dueDate.toDate()) : (t.dueDate ? new Date(t.dueDate) : null);
      let dCounter = '';
      if (due) {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(due); end.setHours(0,0,0,0);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000*60*60*24));
        dCounter = diff === 0 ? 'D0' : (diff > 0 ? `D+${diff}` : `D-${Math.abs(diff)}`);
      }
      return [
        t.name || '',
        t.status || '',
        t.responsible || '',
        t.priority || '',
        startDate ? startDate.toISOString().slice(0,10) : '',
        due ? due.toISOString().slice(0,10) : '',
        dCounter,
        t.createdAt?.toDate?.() ? new Date(t.createdAt.toDate()).toISOString() : (t.createdAt ? new Date(t.createdAt).toISOString() : '')
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OT_${wo?.serviceFolio || wo?.id}_tareas.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const docPdf = new jsPDF();
    const title = `Tareas OT ${wo?.serviceFolio || wo?.id}`;
    docPdf.text(title, 14, 14);
    const body = tasksFilteredSorted.map(t => {
      const startDate = t.startDate?.toDate?.() ? new Date(t.startDate.toDate()) : (t.startDate ? new Date(t.startDate) : null);
      const due = t.dueDate?.toDate?.() ? new Date(t.dueDate.toDate()) : (t.dueDate ? new Date(t.dueDate) : null);
      let dCounter = '';
      if (due) {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(due); end.setHours(0,0,0,0);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000*60*60*24));
        dCounter = diff === 0 ? 'D0' : (diff > 0 ? `D+${diff}` : `D-${Math.abs(diff)}`);
      }
      return [
        t.name || '',
        t.status || '',
        t.responsible || '',
        (t.priority || '') as string,
        startDate ? startDate.toLocaleDateString() : '',
        due ? due.toLocaleDateString() : '',
        dCounter,
        t.createdAt?.toDate?.() ? new Date(t.createdAt.toDate()).toLocaleString() : (t.createdAt ? new Date(t.createdAt).toLocaleString() : '')
      ];
    });
    autoTable(docPdf, {
      head: [['Nombre','Estado','Responsable','Prioridad','Inicio','Vence','D-counter','Creado']],
      body,
      startY: 20,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [25, 118, 210] },
    });
    docPdf.save(`OT_${wo?.serviceFolio || wo?.id}_tareas.pdf`);
  };

  const setTaskDueDate = async (taskId: string, date: Date | null) => {
    if (!wo) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'work_orders', wo.id, 'tasks', taskId), { dueDate: date || null, updatedAt: new Date() });
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_task_due_set', serviceId: wo.serviceId, happenedAt: serverTimestamp(), taskId, due: date ? date.toISOString() : null });
    } finally {
      setUpdating(false);
    }
  };

  const updateTaskStartDate = async (taskId: string, date: Date | null) => {
    if (!wo) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'work_orders', wo.id, 'tasks', taskId), { startDate: date || null, updatedAt: new Date() });
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_task_start_set', serviceId: wo.serviceId, happenedAt: serverTimestamp(), taskId, start: date ? date.toISOString() : null });
    } finally {
      setUpdating(false);
    }
  };

  const changeStatus = async (to: 'Abierta' | 'En Progreso' | 'Cerrada') => {
    if (!wo) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'work_orders', wo.id), { status: to, updatedAt: new Date() });
      setWo({ ...wo, status: to });
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_status_changed', serviceId: wo.serviceId, happenedAt: serverTimestamp(), to });
    } finally {
      setUpdating(false);
    }
  };

  const addTask = async () => {
    if (!wo || !taskName.trim()) return;
    try {
      setUpdating(true);
      // autocorrect range if invalid
      let startToSave = taskStartDate;
      let dueToSave = taskDueDate;
      if (startToSave && dueToSave && startToSave > dueToSave) {
        // prefer aligning due to start
        dueToSave = startToSave;
      }
      await addDoc(collection(db, 'work_orders', wo.id, 'tasks'), {
        name: taskName.trim(),
        status: 'pendiente',
        responsible: '',
        startDate: startToSave || null,
        dueDate: dueToSave || null,
        priority: taskPriority,
        createdAt: serverTimestamp(),
      });
      setTaskDialog(false);
      setTaskName('');
      setTaskStartDate(null);
      setTaskDueDateLocal(null);
      setTaskPriority('media');
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_task_created', serviceId: wo.serviceId, happenedAt: serverTimestamp(), taskName: taskName.trim() });
    } finally {
      setUpdating(false);
    }
  };

  const setTaskStatus = async (taskId: string, to: 'pendiente' | 'en_progreso' | 'completada') => {
    if (!wo) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'work_orders', wo.id, 'tasks', taskId), { status: to, updatedAt: new Date() });
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_task_status_changed', serviceId: wo.serviceId, happenedAt: serverTimestamp(), taskId, to });
    } finally {
      setUpdating(false);
    }
  };

  const setTaskResponsible = async (taskId: string, responsible: string) => {
    if (!wo) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'work_orders', wo.id, 'tasks', taskId), { responsible, updatedAt: new Date() });
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_task_assigned', serviceId: wo.serviceId, happenedAt: serverTimestamp(), taskId, responsible });
    } finally {
      setUpdating(false);
    }
  };

  const updateTaskPriority = async (taskId: string, priority: 'alta' | 'media' | 'baja') => {
    if (!wo) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'work_orders', wo.id, 'tasks', taskId), { priority, updatedAt: new Date() });
      await addDoc(collection(db, 'audit_logs'), { type: 'work_order_task_priority_set', serviceId: wo.serviceId, happenedAt: serverTimestamp(), taskId, priority });
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !wo) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4">OT {wo.serviceFolio}</Typography>
        <Chip label={wo.status || '—'} color={statusColor as any} />
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" disabled={updating || wo.status === 'Abierta'} onClick={() => changeStatus('Abierta')}>Abierta</Button>
          <Button size="small" variant="outlined" disabled={updating || wo.status === 'En Progreso'} onClick={() => changeStatus('En Progreso')}>En Progreso</Button>
          <Button size="small" variant="outlined" disabled={updating || wo.status === 'Cerrada'} onClick={() => changeStatus('Cerrada')}>Cerrada</Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Resumen</Typography>
        <Typography><strong>Servicio:</strong> {wo.serviceFolio}</Typography>
        <Typography><strong>Responsable:</strong> {wo.responsible || '—'}</Typography>
        <Typography><strong>Inicio:</strong> {wo.targetDates?.start ? new Date(wo.targetDates.start).toLocaleString() : '—'}</Typography>
        <Typography><strong>Fin objetivo:</strong> {wo.targetDates?.end ? new Date(wo.targetDates.end).toLocaleString() : '—'}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}><strong>Alcance:</strong> {wo.scope || '—'}</Typography>
        <Typography><strong>Cotización:</strong> {wo.proposalRef || '—'} • {wo.proposalTotal ?? '—'}</Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Checklist de Tareas</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Filtro</InputLabel>
              <Select label="Filtro" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="en_progreso">En Progreso</MenuItem>
                <MenuItem value="completada">Completada</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Orden</InputLabel>
              <Select label="Orden" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <MenuItem value="createdAt_desc">Recientes primero</MenuItem>
                <MenuItem value="name_asc">Nombre (A-Z)</MenuItem>
                <MenuItem value="status_asc">Estado (A-Z)</MenuItem>
              </Select>
            </FormControl>
            <Button size="small" onClick={exportCSV}>Exportar CSV</Button>
            <Button size="small" onClick={exportPDF}>Exportar PDF</Button>
            <Button size="small" variant="contained" onClick={() => setTaskDialog(true)}>Agregar Tarea</Button>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Progreso: {progressPct}% ({tasks.filter(t => t.status === 'completada').length}/{tasks.length} completadas)
        </Typography>
        {tasksLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={22} />
          </Box>
        ) : tasksFilteredSorted.length ? (
          <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
            {tasksFilteredSorted.map(t => {
              const now = new Date();
              const todayStr = now.toISOString().slice(0,10);
              const startDateObj = t.startDate?.toDate?.() ? new Date(t.startDate.toDate()) : (t.startDate ? new Date(t.startDate) : null);
              const dueDateObj = t.dueDate?.toDate?.() ? new Date(t.dueDate.toDate()) : (t.dueDate ? new Date(t.dueDate) : null);
              const dueStr = dueDateObj ? dueDateObj.toISOString().slice(0,10) : '';
              const isCompleted = t.status === 'completada';
              let dueChip: { label: string; color: 'default' | 'warning' | 'error' | 'success' } = { label: 'Sin fecha', color: 'default' };
              if (dueStr) {
                if (isCompleted) {
                  dueChip = { label: 'Completada', color: 'success' };
                } else if (dueStr < todayStr) {
                  dueChip = { label: 'Vencida', color: 'error' };
                } else if (dueStr === todayStr) {
                  dueChip = { label: 'Hoy', color: 'warning' };
                } else {
                  dueChip = { label: 'Próxima', color: 'success' };
                }
              }
              let rel = '';
              let dCounter = '';
              if (dueDateObj) {
                const start = new Date(); start.setHours(0,0,0,0);
                const end = new Date(dueDateObj); end.setHours(0,0,0,0);
                const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > 0) rel = `en ${diffDays} día${diffDays === 1 ? '' : 's'}`;
                if (diffDays === 0) rel = 'hoy';
                if (diffDays < 0) rel = `hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`;
                dCounter = diffDays === 0 ? 'D0' : (diffDays > 0 ? `D+${diffDays}` : `D-${Math.abs(diffDays)}`);
              }
              const rowBg = dueChip.label === 'Vencida' ? 'rgba(244, 67, 54, 0.08)' 
                            : dueChip.label === 'Hoy' ? 'rgba(255, 167, 38, 0.12)'
                            : dueChip.label === 'Próxima' ? 'rgba(76, 175, 80, 0.06)'
                            : 'transparent';
              return (
              <Box key={t.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1fr 1.5fr 1fr 120px' }, gap: 1, alignItems: 'center', bgcolor: rowBg, px: 1, py: 0.75, borderRadius: 1 }}>
                <Typography variant="body2" onDoubleClick={() => startEditTask(t)} sx={{ cursor: 'text' }}>{t.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" label="Pendiente" variant={t.status === 'pendiente' ? 'filled' : 'outlined'} onClick={() => setTaskStatus(t.id, 'pendiente')} />
                  <Chip size="small" label="En Progreso" variant={t.status === 'en_progreso' ? 'filled' : 'outlined'} onClick={() => setTaskStatus(t.id, 'en_progreso')} />
                  <Chip size="small" label="Completada" color="success" variant={t.status === 'completada' ? 'filled' : 'outlined'} onClick={() => setTaskStatus(t.id, 'completada')} />
                  {/* Priority chip */}
                  <Chip size="small" label={(t.priority || 'media').toUpperCase()} color={(t.priority === 'alta' ? 'error' : (t.priority === 'media' ? 'warning' : 'default')) as any} variant="outlined" />
                  {/* Inline priority editor */}
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>Prioridad</InputLabel>
                    <Select
                      label="Prioridad"
                      value={t.priority || 'media'}
                      onChange={(e) => updateTaskPriority(t.id, e.target.value as any)}
                    >
                      <MenuItem value="alta">Alta</MenuItem>
                      <MenuItem value="media">Media</MenuItem>
                      <MenuItem value="baja">Baja</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {(() => {
                    const invalidInline = Boolean(startDateObj && dueDateObj && (startDateObj as any) > (dueDateObj as any));
                    return (
                      <>
                        <DatePicker
                          label="Inicio"
                          value={startDateObj}
                          onChange={(v) => {
                            const ns = (v as Date) || null;
                            if (ns && dueDateObj && ns > dueDateObj) {
                              // autocorrect: move dueDate to ns
                              updateTaskStartDate(t.id, ns);
                              setTaskDueDate(t.id, ns);
                              enqueueSnackbar('Rango ajustado automáticamente: Vence = Inicio', { variant: 'info' });
                              return;
                            }
                            updateTaskStartDate(t.id, ns);
                          }}
                          slotProps={{ textField: { error: invalidInline } }}
                        />
                        <DatePicker
                          label="Vence"
                          value={dueDateObj}
                          onChange={(v) => {
                            const nd = (v as Date) || null;
                            if (nd && startDateObj && startDateObj > nd) {
                              // autocorrect: move startDate to nd
                              updateTaskStartDate(t.id, nd);
                              setTaskDueDate(t.id, nd);
                              enqueueSnackbar('Rango ajustado automáticamente: Inicio = Vence', { variant: 'info' });
                              return;
                            }
                            setTaskDueDate(t.id, nd);
                          }}
                          slotProps={{ textField: { error: invalidInline } }}
                        />
                        {invalidInline && (
                          <Typography variant="caption" color="error">Inicio no puede ser posterior a Vence.</Typography>
                        )}
                      </>
                    );
                  })()}
                  {startDateObj && (
                    <Button size="small" variant="text" onClick={() => updateTaskStartDate(t.id, null)}>Quitar inicio</Button>
                  )}
                  {dueDateObj && (
                    <Button size="small" variant="text" onClick={() => setTaskDueDate(t.id, null)}>Quitar vencimiento</Button>
                  )}
                  <Tooltip title={`${dueChip.label}${dueDateObj ? ` • ${dueDateObj.toLocaleDateString()} • ${rel}` : ''}`}>
                    <Chip size="small" label={dueChip.label} color={dueChip.color} />
                  </Tooltip>
                  {dCounter && (
                    <Chip size="small" variant="outlined" label={dCounter} />
                  )}
                  {rel && (
                    <Typography variant="caption" color="text.secondary">{rel}</Typography>
                  )}
                </Box>
                <Autocomplete
                  freeSolo
                  options={catalogPersonnel}
                  value={t.responsible || ''}
                  onChange={(_, v) => setTaskResponsible(t.id, (v as string) || '')}
                  renderInput={(params) => <TextField {...params} label="Responsable" size="small" />}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={() => startEditTask(t)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => confirmDeleteTask(t)} disabled={updating}>Eliminar</Button>
                </Box>
              </Box>
            )})}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">Sin tareas aún.</Typography>
        )}
      </Paper>

      {/* Edit Task dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Editar Tarea</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, minWidth: 360, mt: 0.5 }}>
            <TextField
              fullWidth
              label="Nombre de la tarea"
              value={editTaskName}
              onChange={(e) => setEditTaskName(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker label="Inicio" value={editStartDate} onChange={(v) => setEditStartDate((v as Date) || null)} slotProps={{ textField: { error: invalidEditRange } }} />
              <DatePicker label="Vence" value={editDueDate} onChange={(v) => setEditDueDate((v as Date) || null)} slotProps={{ textField: { error: invalidEditRange } }} />
            </Box>
            {invalidEditRange && (
              <Typography variant="caption" color="error">La fecha de inicio no puede ser posterior a la fecha de vencimiento.</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveEditTask} disabled={updating || !editTaskId || !editTaskName.trim() || invalidEditRange}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete task */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Eliminar tarea</DialogTitle>
        <DialogContent>
          <Typography>¿Seguro que deseas eliminar la tarea?</Typography>
          {taskToDelete && (
            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">{taskToDelete.name}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={handleConfirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Gantt timeline for tasks */}
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Typography variant="h6" gutterBottom>Gantt de Tareas</Typography>
        <Box sx={{ display: 'flex', mb: 1, minWidth: 240 + gantt.days * dayWidth }}>
          <Box sx={{ width: 240, flexShrink: 0 }} />
          <Box sx={{ position: 'relative', display: 'flex', gap: 0, flexGrow: 1 }}>
            {Array.from({ length: gantt.days }).map((_, i) => {
              const d = new Date(gantt.start); d.setDate(d.getDate() + i);
              const showMonth = d.getDate() === 1 || i % 7 === 0;
              return (
                <Box key={i} sx={{ width: dayWidth, textAlign: 'center', borderRight: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                    {d.getDate().toString().padStart(2, '0')}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, lineHeight: 1 }}>
                    {showMonth ? d.toLocaleDateString(undefined, { month: 'short' }) : '\u00A0'}
                  </Typography>
                </Box>
              );
            })}
            {todayInRange && (
              <Box sx={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, bgcolor: 'error.light', opacity: 0.6 }} />
            )}
          </Box>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <Box>
          {tasksFilteredSorted.map((t) => {
            const created = t.startDate?.toDate?.() ? new Date(t.startDate.toDate()) : (t.startDate ? new Date(t.startDate) : (t.createdAt?.toDate?.() ? new Date(t.createdAt.toDate()) : (t.createdAt ? new Date(t.createdAt) : new Date())));
            const due = t.dueDate?.toDate?.() ? new Date(t.dueDate.toDate()) : (t.dueDate ? new Date(t.dueDate) : null);
            const isDone = t.status === 'completada';
            // Base color by priority (requested scheme)
            let baseColor = t.priority === 'alta' ? '#d32f2f' : (t.priority === 'media' ? '#ffa000' : '#9e9e9e');
            if (due && !isDone) {
              const today0 = new Date(); today0.setHours(0,0,0,0);
              const diffDays = Math.round((due.setHours(0,0,0,0), due.getTime() - today0.getTime()) / (1000*60*60*24));
              if (diffDays < 0) baseColor = '#d32f2f'; // overdue
            }
            const left = dateToX(created);
            const right = dateToX(due || new Date(created.getTime() + 24*60*60*1000));
            const width = Math.max(16, Math.max(0, right - left));
            const startStr = created.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
            const endStr = (due || created).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
            // Urgency highlight via border color
            let borderColor = 'transparent';
            if (!isDone && due) {
              const today0b = new Date(); today0b.setHours(0,0,0,0);
              const dLeft = Math.round(((new Date(due)).setHours(0,0,0,0), (new Date(due)).getTime() - today0b.getTime()) / (1000*60*60*24));
              if (dLeft < 0) borderColor = '#d32f2f';
              else if (dLeft <= 2) borderColor = '#ffa000';
            }
            const invalidRange = Boolean(due && created > (due as Date));
            return (
              <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', minWidth: 240 + gantt.days * dayWidth, mb: 1 }}>
                <Box sx={{ width: 240, pr: 1, flexShrink: 0 }}>
                  <Typography variant="body2" noWrap title={t.name || ''}>{t.name || 'Tarea'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {t.responsible || '—'}
                  </Typography>
                </Box>
                <Box sx={{ position: 'relative', height: 28, flexGrow: 1 }}>
                  {/* baseline grid */}
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    {Array.from({ length: gantt.days }).map((_, i) => (
                      <Box key={i} sx={{ width: dayWidth, borderRight: '1px dashed', borderColor: 'divider', opacity: 0.7 }} />
                    ))}
                  </Box>
                  {todayInRange && (
                    <Box sx={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, bgcolor: 'error.light', opacity: 0.6 }} />
                  )}
                  {/* bar */}
                  <Tooltip title={`Inicio: ${startStr}${due ? ` • Vence: ${endStr}` : ''}${invalidRange ? ' • Rango inválido (Inicio > Vence)' : ''}`}>
                    <Box sx={{ 
                      position: 'absolute', 
                      left, 
                      top: 6, 
                      height: 16, 
                      width, 
                      backgroundColor: baseColor, 
                      borderRadius: 1, 
                      border: `1px solid ${invalidRange ? '#d32f2f' : borderColor}`, 
                      boxShadow: (invalidRange || borderColor !== 'transparent') ? `0 0 0 1px ${invalidRange ? '#d32f2f' : borderColor}` : 'none',
                      backgroundImage: invalidRange ? 'repeating-linear-gradient(45deg, rgba(211,47,47,0.7) 0 4px, rgba(211,47,47,0.0) 4px 8px)' : 'none'
                    }} />
                  </Tooltip>
                  {invalidRange && (
                    <Tooltip title="Rango inválido">
                      <Box sx={{ position: 'absolute', left: Math.max(0, left - 6), top: 3, width: 6, height: 6, bgcolor: '#d32f2f', borderRadius: '50%' }} />
                    </Tooltip>
                  )}
                  {/* date label on bar */}
                  <Typography variant="caption" sx={{ position: 'absolute', left: left + 4, top: 6, color: '#fff', fontSize: 10, maxWidth: Math.max(0, width - 8), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    {startStr} • {endStr}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Recursos Asignados</Typography>
        {resources ? (
          <Box>
            <Typography variant="body2" color="text.secondary">{(resources.personnel || []).join(', ') || '—'}</Typography>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Equipo</Typography>
            <Typography variant="body2" color="text.secondary">{(resources.equipment || []).join(', ') || '—'}</Typography>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Materiales</Typography>
            <Typography variant="body2" color="text.secondary">{(resources.materials || []).join(', ') || '—'}</Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">Sin recursos registrados</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Bitácora</Typography>
        {audit.length ? (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {audit.map(ev => {
              const when = ev.happenedAt?.toDate?.() || ev.changedAt?.toDate?.() || new Date(ev.happenedAt || ev.changedAt || 0);
              return (
                <Box key={ev.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Chip size="small" label={ev.type || 'evento'} />
                  <Typography variant="body2">{new Date(when).toLocaleString()}</Typography>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">Sin eventos</Typography>
        )}
      </Paper>

      <Dialog open={taskDialog} onClose={() => setTaskDialog(false)}>
        <DialogTitle>Nueva Tarea</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Nombre de la tarea" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
          <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker 
                label="Inicio" 
                value={taskStartDate} 
                onChange={(v) => {
                  const ns = (v as Date) || null;
                  if (ns && taskDueDate && ns > taskDueDate) {
                    // autocorrect: align due to start
                    setTaskStartDate(ns);
                    setTaskDueDateLocal(ns);
                    return;
                  }
                  setTaskStartDate(ns);
                }} 
                slotProps={{ textField: { error: invalidNewRange } }}
              />
              <DatePicker 
                label="Fin" 
                value={taskDueDate} 
                onChange={(v) => {
                  const nd = (v as Date) || null;
                  if (nd && taskStartDate && taskStartDate > nd) {
                    // autocorrect: align start to due
                    setTaskStartDate(nd);
                    setTaskDueDateLocal(nd);
                    return;
                  }
                  setTaskDueDateLocal(nd);
                }} 
                slotProps={{ textField: { error: invalidNewRange } }}
              />
            </Box>
            {invalidNewRange && (
              <Typography variant="caption" color="error">La fecha de inicio no puede ser posterior a la fecha de fin.</Typography>
            )}
            <FormControl fullWidth>
              <InputLabel id="task-priority-label">Prioridad</InputLabel>
              <Select
                labelId="task-priority-label"
                label="Prioridad"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
              >
                <MenuItem value="alta">Alta</MenuItem>
                <MenuItem value="media">Media</MenuItem>
                <MenuItem value="baja">Baja</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={addTask} disabled={!taskName.trim() || updating || invalidNewRange}>Agregar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
