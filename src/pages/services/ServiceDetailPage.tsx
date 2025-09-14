import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, onSnapshot, collection, query, where, orderBy, getDocs, startAfter, limit, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase/config';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Service, ServiceStatus, Proposal } from '../../types';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  TextField,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Chip,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import DailyReportForm from '../../components/DailyReportForm';
import TechnicalVisitModal from '../../components/TechnicalVisitModal';
import ServiceEvaluationModal from '../../components/ServiceEvaluationModal';
import QuotationModal from '../../components/QuotationModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`service-tabpanel-${index}`}
      aria-labelledby={`service-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}



export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ServiceStatus | null>(null);
  const [statusChangeNotes, setStatusChangeNotes] = useState('');
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [radViewerOpen, setRadViewerOpen] = useState(false);
  const [selectedRad, setSelectedRad] = useState<any | null>(null);
  const [radFrom, setRadFrom] = useState<Date | null>(null);
  const [radTo, setRadTo] = useState<Date | null>(null);
  const [radPage, setRadPage] = useState<number>(0);
  const [radRowsPerPage, setRadRowsPerPage] = useState<number>(5);
  const [useServerPaging, setUseServerPaging] = useState<boolean>(false);
  const [radLimit, setRadLimit] = useState<number>(10);
  const [radHasNext, setRadHasNext] = useState<boolean>(false);
  const [radHasPrev, setRadHasPrev] = useState<boolean>(false);
  const [radPrevCursors, setRadPrevCursors] = useState<any[]>([]);
  const [radCurrentCursor, setRadCurrentCursor] = useState<any | null>(null);
  const [serverDailyReports, setServerDailyReports] = useState<any[]>([]);
  const [techVisitModalOpen, setTechVisitModalOpen] = useState(false);
  const [technicalVisits, setTechnicalVisits] = useState<any[]>([]);
  const [loadingTechnicalVisits, setLoadingTechnicalVisits] = useState(true);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [existingProposal, setExistingProposal] = useState<Proposal | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState<boolean>(true);
  // Documents (manual uploads) state
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(true);
  const [docFiles, setDocFiles] = useState<FileList | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [docProgress, setDocProgress] = useState<number>(0);
  const [uploadItems, setUploadItems] = useState<{ name: string; progress: number }[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  // Activities tab state (Work Order + Resources)
  const [resourcesLoading, setResourcesLoading] = useState<boolean>(false);
  const [resourcesSaved, setResourcesSaved] = useState<boolean>(false);
  // Resource selections (Autocomplete)
  const [resPersonnelArr, setResPersonnelArr] = useState<string[]>([]);
  const [resEquipmentArr, setResEquipmentArr] = useState<string[]>([]);
  const [resMaterialsArr, setResMaterialsArr] = useState<string[]>([]);
  // Catalogs
  const [catalogPersonnel, setCatalogPersonnel] = useState<string[]>([]);
  const [catalogEquipment, setCatalogEquipment] = useState<string[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<string[]>([]);
  const [workOrderLoading, setWorkOrderLoading] = useState<boolean>(false);
  const [workOrderExists, setWorkOrderExists] = useState<boolean>(false);
  // Work order confirmation modal
  const [woConfirmOpen, setWoConfirmOpen] = useState<boolean>(false);
  // Work order detail
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);
  const [workOrderData, setWorkOrderData] = useState<any | null>(null);
  const [woDetailOpen, setWoDetailOpen] = useState<boolean>(false);

  // Export RADs (filtered)
  const handleExportRADs = () => {
    const headers = ['Fecha','Hectareas','Horas','Combustible','Fertilizante','Incidentes','Evidencias'];
    const rows = dailyReports.map((rad) => {
      const d = rad.date?.toDate ? new Date(rad.date.toDate()) : new Date(rad.date);
      const dateStr = isNaN(d.getTime()) ? '' : d.toISOString();
      const hect = rad.progress?.hectares ?? '';
      const hrs = rad.progress?.hours ?? '';
      const fuel = rad.consumables?.fuel ?? '';
      const fert = rad.consumables?.fertilizer ?? '';
      const inc = (rad.incidents || '').toString().replace(/\n/g,' ').replace(/\r/g,' ');
      const evid = Array.isArray(rad.evidenceURLs) ? rad.evidenceURLs.length : 0;
      return [dateStr, hect, hrs, fuel, fert, `"${inc}"`, evid].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const folio = service?.folio || id || 'servicio';
    link.href = url;
    link.setAttribute('download', `RADs_${folio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openRadViewer = (rad: any) => {
    setSelectedRad(rad);
    setRadViewerOpen(true);
  };

  const closeRadViewer = () => {
    setRadViewerOpen(false);
    setSelectedRad(null);
  };

  const invalidRange = Boolean(radFrom && radTo && radTo! < radFrom!);

  // Export filtered RADs to PDF (range)
  const handleExportRADsPDF = () => {
    const rows = (useServerPaging ? serverDailyReports : dailyReports);
    const doc = new jsPDF();
    const title = `RADs ${service?.folio || id || ''}`;
    doc.text(title, 14, 14);
    const body = rows.map((rad) => {
      const d = rad.date?.toDate ? new Date(rad.date.toDate()) : new Date(rad.date);
      return [
        isNaN(d.getTime()) ? '' : d.toLocaleDateString(),
        rad.progress?.hectares ?? '',
        rad.progress?.hours ?? '',
        rad.consumables?.fuel ?? '',
        rad.consumables?.fertilizer ?? '',
        (rad.incidents || '').toString(),
        Array.isArray(rad.evidenceURLs) ? rad.evidenceURLs.length : 0,
      ];
    });
    autoTable(doc, {
      head: [['Fecha','Hectáreas','Horas','Combustible','Fertilizante','Incidentes','Evidencias']],
      body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25, 118, 210] },
    });
    doc.save(`RADs_${service?.folio || id || 'servicio'}.pdf`);
  };

  // Export single RAD as PDF
  const handleExportSingleRadPDF = (rad: any) => {
    const doc = new jsPDF();
    const d = rad.date?.toDate ? new Date(rad.date.toDate()) : new Date(rad.date);
    const title = `RAD ${service?.folio || id || ''} - ${isNaN(d.getTime()) ? '' : d.toLocaleDateString()}`;
    doc.text(title, 14, 14);
    autoTable(doc, {
      body: [
        ['Fecha', isNaN(d.getTime()) ? '' : d.toLocaleString()],
        ['Hectáreas', rad.progress?.hectares ?? ''],
        ['Horas', rad.progress?.hours ?? ''],
        ['Combustible (L)', rad.consumables?.fuel ?? ''],
        ['Fertilizante (kg)', rad.consumables?.fertilizer ?? ''],
        ['Incidentes', (rad.incidents || '').toString()],
        ['Evidencias', Array.isArray(rad.evidenceURLs) ? rad.evidenceURLs.length : 0],
      ],
      startY: 20,
      theme: 'plain',
      styles: { fontSize: 10 },
    });
    doc.save(`RAD_${service?.folio || id || 'servicio'}_${isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)}.pdf`);
  };

  // Server-side pagination with cursors
  const fetchServerPage = useCallback(async (direction: 'reset' | 'next' | 'prev' = 'reset') => {
    if (!id) return;
    setLoadingDaily(true);
    try {
      const constraints: any[] = [where('serviceId', '==', id)];
      if (radFrom) constraints.push(where('date', '>=', radFrom));
      if (radTo) constraints.push(where('date','<=', radTo));
      constraints.push(orderBy('date','desc'));

      let qRef: any;
      if (direction === 'next' && radCurrentCursor) {
        qRef = query(collection(db, 'daily_reports'), ...constraints, startAfter(radCurrentCursor), limit(radLimit + 1));
      } else if (direction === 'prev' && radPrevCursors.length > 0) {
        const prevCursor = radPrevCursors[radPrevCursors.length - 1];
        qRef = query(collection(db, 'daily_reports'), ...constraints, startAfter(prevCursor), limit(radLimit + 1));
        setRadPrevCursors(prev => prev.slice(0, -1));
      } else {
        qRef = query(collection(db, 'daily_reports'), ...constraints, limit(radLimit + 1));
        if (direction === 'reset') {
          setRadPrevCursors([]);
        }
      }
      const snap = await getDocs(qRef);
      const docs = snap.docs;
      const hasMore = docs.length > radLimit;
      const pageDocs = hasMore ? docs.slice(0, radLimit) : docs;
      
      setServerDailyReports(pageDocs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setRadHasNext(hasMore);
      setRadHasPrev(direction === 'next' || radPrevCursors.length > 0);
      
      if (pageDocs.length > 0) {
        const lastDoc = pageDocs[pageDocs.length - 1];
        setRadCurrentCursor(lastDoc);
        if (direction === 'next' && serverDailyReports.length > 0) {
          setRadPrevCursors(prev => [...prev, serverDailyReports[0]]);
        }
      } else {
        setRadCurrentCursor(null);
      }
    } catch (error) {
      console.error('Error fetching server page:', error);
      enqueueSnackbar('Error al paginar RADs', { variant: 'error' });
    } finally {
      setLoadingDaily(false);
    }
  }, [id, radFrom, radTo, radLimit, radCurrentCursor, radPrevCursors, serverDailyReports, enqueueSnackbar]);

  // Effect to fetch server page when switching to server mode or changing filters
  useEffect(() => {
    if (useServerPaging && id) {
      fetchServerPage('reset');
    }
  }, [useServerPaging, radFrom, radTo, fetchServerPage, id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const ref = doc(db, 'services', id);
    const unsub = onSnapshot(ref, (serviceDoc) => {
      if (serviceDoc.exists()) {
        const serviceData = serviceDoc.data() as Omit<Service, 'id'>;
        setService({ id: serviceDoc.id, ...serviceData });
        setNewStatus(serviceData.status);
        setLoading(false);
      } else {
        setLoading(false);
        enqueueSnackbar('Servicio no encontrado', { variant: 'error' });
        navigate('/services');
      }
    }, (error) => {
      console.error('Error listening service:', error);
      setLoading(false);
      enqueueSnackbar('Error al cargar el servicio', { variant: 'error' });
    });

    return () => unsub();
  }, [id, enqueueSnackbar, navigate]);

  // Load proposals for this service (real-time)
  useEffect(() => {
    if (!id) return;
    setLoadingProposals(true);
    const qRef = query(collection(db, 'proposals'), where('serviceId', '==', id));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Proposal[];
        // Sort by createdAt desc on client side
        (list as any[]).sort((a: any, b: any) => {
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return bDate.getTime() - aDate.getTime();
        });
        setProposals(list);
        setLoadingProposals(false);
      },
      () => setLoadingProposals(false)
    );
    return () => unsub();
  }, [id]);

  // Load existing resources (if any)
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setResourcesLoading(true);
        const qRef = query(collection(db, 'service_resources'), where('serviceId', '==', id), limit(1));
        const snap = await getDocs(qRef);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          setResPersonnelArr((data.personnel || []) as string[]);
          setResEquipmentArr((data.equipment || []) as string[]);
          setResMaterialsArr((data.materials || []) as string[]);
          setResourcesSaved(true);
        } else {
          setResourcesSaved(false);
        }
      } catch (_) {
        // ignore
      } finally {
        setResourcesLoading(false);
      }
    };
    load();
  }, [id]);

  // Load resource catalogs (simple collections). Fallback to current selections if empty
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [pSnap, eSnap, mSnap] = await Promise.all([
          getDocs(collection(db, 'catalog_personnel')),
          getDocs(collection(db, 'catalog_equipment')),
          getDocs(collection(db, 'catalog_materials')),
        ]);
        const p = pSnap.docs.map(d => (d.data() as any).name).filter(Boolean) as string[];
        const e = eSnap.docs.map(d => (d.data() as any).name).filter(Boolean) as string[];
        const m = mSnap.docs.map(d => (d.data() as any).name).filter(Boolean) as string[];
        setCatalogPersonnel(p.length ? p : resPersonnelArr);
        setCatalogEquipment(e.length ? e : resEquipmentArr);
        setCatalogMaterials(m.length ? m : resMaterialsArr);
      } catch (_) {
        setCatalogPersonnel(resPersonnelArr);
        setCatalogEquipment(resEquipmentArr);
        setCatalogMaterials(resMaterialsArr);
      }
    };
    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Check if Work Order exists
  useEffect(() => {
    if (!id) return;
    const check = async () => {
      try {
        setWorkOrderLoading(true);
        const qRef = query(collection(db, 'work_orders'), where('serviceId', '==', id), limit(1));
        const snap = await getDocs(qRef);
        if (!snap.empty) {
          setWorkOrderExists(true);
          setWorkOrderId(snap.docs[0].id);
          setWorkOrderData({ id: snap.docs[0].id, ...(snap.docs[0].data() as any) });
        } else {
          setWorkOrderExists(false);
          setWorkOrderId(null);
          setWorkOrderData(null);
        }
      } catch (_) {
        // ignore
      } finally {
        setWorkOrderLoading(false);
      }
    };
    check();
  }, [id]);

  const handleSaveResources = async () => {
    if (!id || !currentUser) return;
    try {
      setResourcesLoading(true);
      const payload = {
        serviceId: id,
        personnel: resPersonnelArr,
        equipment: resEquipmentArr,
        materials: resMaterialsArr,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      };
      // upsert: if exists, update; else add
      const qRef = query(collection(db, 'service_resources'), where('serviceId', '==', id), limit(1));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        await updateDoc(doc(db, 'service_resources', snap.docs[0].id), payload);
      } else {
        await addDoc(collection(db, 'service_resources'), { ...payload, createdAt: serverTimestamp() });
      }
      setResourcesSaved(true);
      enqueueSnackbar('Recursos guardados', { variant: 'success' });
      await addDoc(collection(db, 'audit_logs'), {
        type: 'resources_saved', serviceId: id, happenedAt: serverTimestamp(), userId: currentUser.uid,
        counts: {
          personnel: payload.personnel.length,
          equipment: payload.equipment.length,
          materials: payload.materials.length,
        }
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Error al guardar recursos', { variant: 'error' });
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleCreateWorkOrder = () => {
    setWoConfirmOpen(true);
  };

  const handleConfirmCreateWorkOrder = async () => {
    if (!id || !service || !currentUser) return;
    try {
      setWorkOrderLoading(true);
      const proposal = proposals?.[0] || existingProposal || null;
      const woRef = await addDoc(collection(db, 'work_orders'), {
        serviceId: id,
        serviceFolio: service.folio,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        status: 'Abierta',
        scope: service.fscf001_data?.description || '',
        targetDates: { start: new Date(), end: null },
        responsible: currentUser.uid,
        proposalRef: proposal ? proposal.id : null,
        proposalTotal: (proposal as any)?.total || null,
      });
      setWorkOrderExists(true);
      setWorkOrderId(woRef.id);
      setWorkOrderData({
        id: woRef.id,
        serviceId: id,
        serviceFolio: service.folio,
        createdAt: new Date(),
        createdBy: currentUser.uid,
        status: 'Abierta',
        scope: service.fscf001_data?.description || '',
        targetDates: { start: new Date(), end: null },
        responsible: currentUser.uid,
        proposalRef: proposal ? proposal.id : null,
        proposalTotal: (proposal as any)?.total || null,
      });
      // Auto-change service status to "En Ejecución"
      await updateDoc(doc(db, 'services', service.id), {
        status: 'En Ejecución',
        updatedAt: new Date(),
        statusHistory: [
          ...(service.statusHistory || []),
          { status: 'En Ejecución', changedAt: new Date(), notes: 'OT creada', changedBy: currentUser.uid },
        ],
      });
      setService({ ...service, status: 'En Ejecución' } as any);
      enqueueSnackbar('Orden de Trabajo creada y estado actualizado a En Ejecución', { variant: 'success' });
      await addDoc(collection(db, 'audit_logs'), {
        type: 'work_order_created', serviceId: id, happenedAt: serverTimestamp(), userId: currentUser.uid,
      });
      await addDoc(collection(db, 'audit_logs'), {
        type: 'service_status_changed', serviceId: id, happenedAt: serverTimestamp(), userId: currentUser.uid,
        to: 'En Ejecución', from: service.status,
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Error al crear Orden de Trabajo', { variant: 'error' });
    } finally {
      setWorkOrderLoading(false);
      setWoConfirmOpen(false);
    }
  };

  // Load documents linked to this service (manual uploads)
  useEffect(() => {
    if (!id) return;
    setLoadingDocuments(true);
    const qRef = query(collection(db, 'service_documents'), where('serviceId', '==', id), orderBy('uploadedAt', 'desc'));
    const unsub = onSnapshot(qRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setDocuments(list);
      setLoadingDocuments(false);
    }, () => setLoadingDocuments(false));
    return () => unsub();
  }, [id]);

  const onDocFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocFiles(e.target.files);
  };

  // Upload helper with retry & exponential backoff for Documents
  async function uploadWithRetry(path: string, file: File, maxAttempts = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const refUp = storageRef(storage, path);
        const task = uploadBytesResumable(refUp, file);
        await new Promise<void>((resolve, reject) => {
          task.on('state_changed', () => {}, reject, () => resolve());
        });
        return await getDownloadURL(storageRef(storage, path));
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        const backoff = 500 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    throw new Error('Upload failed');
  }

  // Build detailed, actionable error messages for document uploads
  function classifyUploadError(err: any): string {
    const code = err?.code || err?.name || 'unknown';
    const msg = err?.message || String(err);
    const lower = (msg || '').toLowerCase();
    const isNetwork = lower.includes('network') || lower.includes('failed to fetch');
    const isCors = lower.includes('cors') || lower.includes('preflight') || lower.includes('access-control');
    const is503 = lower.includes('503') || lower.includes('service unavailable');
    const status = err?.status || err?.response?.status;
    const base = `Error al subir documento (${code}${status ? `, ${status}` : ''}).`;

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
      return `${base} Servicio temporalmente no disponible (503). Se reintentará automáticamente; si persiste, reintenta más tarde.`;
    }
    if (isNetwork) {
      return `${base} Problema de red. Verifica tu conexión e inténtalo de nuevo.`;
    }
    return `${base} ${msg}`;
  }

  // Audit log helper for document actions
  async function logDocumentAudit(eventType: 'document_upload_success' | 'document_deleted', payload: any) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        type: eventType,
        serviceId: id,
        happenedAt: serverTimestamp(),
        userId: currentUser?.uid || null,
        ...payload,
      });
    } catch (_) {
      // ignore audit logging failures
    }
  }

  const handleUploadDocuments = async () => {
    if (!id || !docFiles || docFiles.length === 0 || !currentUser) return;
    try {
      setUploadingDoc(true);
      setDocProgress(0);
      const files = Array.from(docFiles);
      setUploadItems(files.map((f) => ({ name: f.name, progress: 0 })));
      const uploads = files.map((file, idx) => {
        const path = `services/${id}/documents/${Date.now()}_${file.name}`;
        const ref = storageRef(storage, path);
        const task = uploadBytesResumable(ref, file);
        return new Promise<void>((resolve, reject) => {
          task.on('state_changed', (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setUploadItems((items) => {
              const copy = [...items];
              if (copy[idx]) copy[idx] = { ...copy[idx], progress: pct };
              return copy;
            });
            const overall = Math.round(
              copySafeAvg(files.length, idx, pct, uploadItems)
            );
            setDocProgress(overall);
          }, async (e) => {
            // On error, try retry helper
            uploadWithRetry(path, file, 3)
              .then(async (url) => {
                await addDoc(collection(db, 'service_documents'), {
                  serviceId: id,
                  name: file.name,
                  url,
                  storagePath: path,
                  contentType: file.type || null,
                  size: file.size,
                  uploadedAt: serverTimestamp(),
                  uploadedBy: currentUser.uid,
                });
                await logDocumentAudit('document_upload_success', {
                  name: file.name,
                  url,
                  storagePath: path,
                  contentType: file.type || null,
                  size: file.size,
                });
                resolve();
              })
              .catch((e) => {
                enqueueSnackbar(classifyUploadError(e), { variant: 'error' });
                reject(e);
              });
          }, async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            await addDoc(collection(db, 'service_documents'), {
              serviceId: id,
              name: file.name,
              url,
              storagePath: path,
              contentType: file.type || null,
              size: file.size,
              uploadedAt: serverTimestamp(),
              uploadedBy: currentUser.uid,
            });
            await logDocumentAudit('document_upload_success', {
              name: file.name,
              url,
              storagePath: path,
              contentType: file.type || null,
              size: file.size,
            });
            resolve();
          });
        });
      });
      await Promise.all(uploads);
      setDocFiles(null);
      setDocProgress(0);
      setUploadItems([]);
      enqueueSnackbar('Documento(s) subido(s) correctamente', { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(classifyUploadError(err) || 'Error al subir documento(s)', { variant: 'error' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docu: any) => {
    try {
      if (!docu?.id || !docu?.storagePath) return;
      // Delete from Storage first
      await deleteObject(storageRef(storage, docu.storagePath));
      // Then delete metadata in Firestore
      await deleteDoc(doc(db, 'service_documents', docu.id));
      await logDocumentAudit('document_deleted', {
        name: docu.name,
        url: docu.url,
        storagePath: docu.storagePath,
        contentType: docu.contentType || null,
        size: docu.size || null,
      });
      enqueueSnackbar('Documento eliminado', { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Error al eliminar documento', { variant: 'error' });
    }
  };

  const confirmDeleteDocument = (docu: any) => {
    setDocToDelete(docu);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    const target = docToDelete;
    setDeleteDialogOpen(false);
    setDocToDelete(null);
    await handleDeleteDocument(target);
  };

  // Helper to compute overall progress safely
  function copySafeAvg(total: number, currentIdx: number, currentPct: number, items: { name: string; progress: number }[]) {
    const arr = items && items.length === total ? items.map(i => i.progress) : new Array(total).fill(0).map((_, i) => (i === currentIdx ? currentPct : 0));
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / total;
  }

  // RADs data source: server paging or realtime local fallback
  useEffect(() => {
    if (!id) return;
    if (useServerPaging) {
      fetchServerPage('reset');
      return () => {};
    }
    setLoadingDaily(true);
    const constraints: any[] = [where('serviceId', '==', id)];
    if (radFrom) { const from = new Date(radFrom); from.setHours(0,0,0,0); constraints.push(where('date', '>=', from)); }
    if (radTo) { const to = new Date(radTo); to.setHours(23,59,59,999); constraints.push(where('date','<=', to)); }
    constraints.push(orderBy('date','desc'));
    const q = query(collection(db,'daily_reports'), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setDailyReports(list);
      setLoadingDaily(false);
    }, () => setLoadingDaily(false));
    return () => unsub();
  }, [id, useServerPaging, fetchServerPage, radFrom, radTo]);

  // Realtime audit logs for this service
  useEffect(() => {
    if (!id) return;
    setLoadingAudit(true);
    
    // Use getDocs instead of onSnapshot to avoid index requirement
    const loadAuditLogs = async () => {
      try {
        const q = query(
          collection(db, 'audit_logs'),
          where('serviceId', '==', id)
        );
        const querySnapshot = await getDocs(q);
        const list: any[] = [];
        querySnapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        
        // Sort client-side to avoid composite index requirement
        list.sort((a, b) => {
          const aTime = a.changedAt?.toDate?.() || new Date(a.changedAt);
          const bTime = b.changedAt?.toDate?.() || new Date(b.changedAt);
          return bTime.getTime() - aTime.getTime();
        });
        
        setAuditLogs(list);
        setLoadingAudit(false);
      } catch (err) {
        console.error(err);
        setLoadingAudit(false);
        enqueueSnackbar('Error cargando seguimiento', { variant: 'error' });
      }
    };

    loadAuditLogs();
  }, [id, enqueueSnackbar]);

  // Función para verificar si hay visitas técnicas completadas
  const hasCompletedTechnicalVisit = useCallback(() => {
    return technicalVisits.some(visit => visit.status === 'completada');
  }, [technicalVisits]);

  // Función para verificar si el servicio requiere visita técnica
  const requiresTechnicalVisit = useCallback(() => {
    // Aquí puedes agregar la lógica para determinar si el servicio requiere visita técnica
    // Por ejemplo, basándote en el tipo de servicio, descripción, etc.
    return service?.requiresTechnicalVisit || false;
  }, [service]);

  // Función para verificar si se puede evaluar el servicio
  const canEvaluateService = useCallback(() => {
    if (!service) return false;
    
    // Si el servicio requiere visita técnica, debe tener al menos una completada
    if (requiresTechnicalVisit()) {
      return hasCompletedTechnicalVisit();
    }
    
    // Si no requiere visita técnica, se puede evaluar directamente cuando está "En Proceso"
    return service.status === 'En Proceso';
  }, [service, requiresTechnicalVisit, hasCompletedTechnicalVisit]);

  // Función para verificar si se puede crear cotización
  const canCreateQuotation = useCallback(() => {
    if (!service) return false;
    
    // Solo se puede crear cotización después de evaluar el servicio
    return service.status === 'Cotización Aprobada';
  }, [service]);

  // Auto-open technical visit modal when service is in "En Visita Técnica" status and no visit data exists
  useEffect(() => {
    if (service && service.status === 'En Visita Técnica' && !(service as any).technicalVisit && !techVisitModalOpen) {
      setTechVisitModalOpen(true);
    }
  }, [service, techVisitModalOpen]);

  // Load technical visits for this service
  useEffect(() => {
    if (!id) return;

    try {
      setLoadingTechnicalVisits(true);
      const visitsQ = query(
        collection(db, 'technicalVisits'),
        where('serviceId', '==', id)
      );
      const unsubscribe = onSnapshot(
        visitsQ,
        (snapshot) => {
          const visitsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Sort client-side by createdAt desc if present
          (visitsData as any[]).sort((a: any, b: any) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate.getTime() - aDate.getTime();
          });
          setTechnicalVisits(visitsData as any[]);
          setLoadingTechnicalVisits(false);
        },
        () => setLoadingTechnicalVisits(false)
      );
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading technical visits:', error);
      setLoadingTechnicalVisits(false);
    }
  }, [id]);

  const handleTechnicalVisitSaved = (visitData: any) => {
    // Update service data to show updated technical visit info
    if (service) {
      const updatedService = { 
        ...service, 
        technicalVisit: visitData,
        // Update status if visit is completed
        ...(visitData.status === 'Completada' && {
          status: 'Cotización Aprobada' as const
        })
      };
      setService(updatedService as any);
    }
    setTechVisitModalOpen(false);
    enqueueSnackbar('Visita técnica guardada exitosamente', { variant: 'success' });
  };

  const handleStatusUpdate = async () => {
    if (!service || !newStatus) return;
    
    try {
      await updateDoc(doc(db, 'services', service.id), {
        status: newStatus,
        updatedAt: new Date(),
        statusHistory: [
          ...(service.statusHistory || []),
          {
            status: newStatus,
            changedAt: new Date(),
            notes: statusChangeNotes,
            changedBy: 'currentUser', // Replace with actual user ID
          },
        ],
      });
      
      setService({
        ...service,
        status: newStatus,
        statusHistory: [
          ...(service.statusHistory || []),
          {
            status: newStatus,
            changedAt: new Date() as any,
            notes: statusChangeNotes,
            changedBy: 'currentUser',
          },
        ],
      });
      
      enqueueSnackbar('Estado actualizado correctamente', { variant: 'success' });
      setStatusDialogOpen(false);
      
      // Auto-open quotation modal when service is approved
      if (newStatus === 'Cotización Aprobada') {
        setTimeout(() => {
          setQuotationModalOpen(true);
        }, 500); // Small delay to allow the status dialog to close first
      }
    } catch (error) {
      console.error('Error updating status:', error);
      enqueueSnackbar('Error al actualizar el estado', { variant: 'error' });
    }
  };


  const handleStatusChange = (event: SelectChangeEvent<ServiceStatus>) => {
    setNewStatus(event.target.value as ServiceStatus);
  };


  if (loading || !service) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: 0, mx: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Servicio {service.folio}
        </Typography>
        <Chip 
          label={service.status} 
          color={service.status === 'Finalizado' ? 'success' : service.status === 'En Ejecución' ? 'primary' : 'default'}
        />
      </Box>

      {/* Service Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>Información del Servicio</Typography>
            <Typography><strong>Cliente:</strong> {service.client?.name || 'N/A'}</Typography>
            <Typography><strong>Descripción:</strong> {service.fscf001_data?.description || 'N/A'}</Typography>
            <Typography><strong>Ubicación:</strong> {service.fscf001_data?.location || 'N/A'}</Typography>
            <Typography><strong>Fecha de Solicitud:</strong> {service.createdAt?.toDate?.() ? new Date(service.createdAt.toDate()).toLocaleDateString() : new Date(service.createdAt).toLocaleDateString()}</Typography>
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom>Estado y Acciones</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Typography><strong>Estado Actual:</strong> {service.status}</Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => setStatusDialogOpen(true)}
              >
                Cambiar Estado
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                size="small"
                disabled={!canEvaluateService()}
                onClick={() => setEvaluationModalOpen(true)}
              >
                Evaluar Servicio
              </Button>
              <Button 
                variant="contained" 
                color="secondary"
                size="small"
                disabled={!canCreateQuotation()}
                onClick={() => setQuotationModalOpen(true)}
              >
                Crear Cotización
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_: React.SyntheticEvent, newValue: number) => setActiveTab(newValue)}>
          <Tab label="Información General" />
          <Tab label="Visita Técnica" />
          <Tab label="Cotización" />
          <Tab label="RADs" />
          <Tab label="Documentos" />
          <Tab label="Actividades" />
          <Tab label="Facturación" />
          <Tab label="Seguimiento" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Detalles del Servicio</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography paragraph><strong>Folio:</strong> {service.folio}</Typography>
              <Typography paragraph><strong>Cliente:</strong> {service.client?.name || 'N/A'}</Typography>
              <Typography paragraph><strong>Descripción:</strong> {service.fscf001_data?.description || 'N/A'}</Typography>
              <Typography paragraph><strong>Ubicación:</strong> {service.fscf001_data?.location || 'N/A'}</Typography>
            </Box>
            <Box>
              <Typography paragraph><strong>Fecha de Solicitud:</strong> {service.createdAt?.toDate?.() ? new Date(service.createdAt.toDate()).toLocaleDateString() : new Date(service.createdAt).toLocaleDateString()}</Typography>
              <Typography paragraph><strong>Estado:</strong> {service.status}</Typography>
              <Typography paragraph><strong>Prioridad:</strong> {service.fscf001_data?.priority || 'Normal'}</Typography>
            </Box>
          </Box>
        </Paper>
      </TabPanel>

      {/* Work Order confirmation modal */}
      <Dialog open={woConfirmOpen} onClose={() => setWoConfirmOpen(false)}>
        <DialogTitle>Confirmar Orden de Trabajo</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom>Servicio {service.folio}</Typography>
          <Typography variant="body2" gutterBottom><strong>Alcance:</strong> {service.fscf001_data?.description || 'N/A'}</Typography>
          <Typography variant="body2"><strong>Estado actual:</strong> {service.status}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>Recursos Seleccionados</strong></Typography>
          <Typography variant="body2" color="text.secondary">Personal: {resPersonnelArr.join(', ') || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">Equipo: {resEquipmentArr.join(', ') || '—'}</Typography>
          <Typography variant="body2" color="text.secondary">Materiales: {resMaterialsArr.join(', ') || '—'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Al confirmar, el estado del servicio cambiará a “En Ejecución”.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWoConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmCreateWorkOrder} disabled={workOrderLoading}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Work Order detail modal */}
      <Dialog open={woDetailOpen} onClose={() => setWoDetailOpen(false)}>
        <DialogTitle>Detalle de Orden de Trabajo</DialogTitle>
        <DialogContent>
          {workOrderData ? (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2"><strong>OT ID:</strong> {workOrderId}</Typography>
              <Typography variant="body2"><strong>Servicio:</strong> {workOrderData.serviceFolio}</Typography>
              <Typography variant="body2"><strong>Estado OT:</strong> {workOrderData.status}</Typography>
              <Typography variant="body2"><strong>Responsable:</strong> {workOrderData.responsible}</Typography>
              <Typography variant="body2"><strong>Inicio:</strong> {workOrderData.targetDates?.start ? new Date(workOrderData.targetDates.start).toLocaleString() : '—'}</Typography>
              <Typography variant="body2"><strong>Fin objetivo:</strong> {workOrderData.targetDates?.end ? new Date(workOrderData.targetDates.end).toLocaleString() : '—'}</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}><strong>Alcance:</strong> {workOrderData.scope || '—'}</Typography>
              <Typography variant="body2"><strong>Cotización Ref:</strong> {workOrderData.proposalRef || '—'}</Typography>
              <Typography variant="body2"><strong>Total Cotización:</strong> {workOrderData.proposalTotal ?? '—'}</Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No hay datos de OT.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWoDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <TabPanel value={activeTab} index={5}>
        <Paper sx={{ p: 3, display: 'grid', gap: 3 }}>
          <Typography variant="h6">Actividades</Typography>

          {/* Work Order */}
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>Orden de Trabajo</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Genera la Orden de Trabajo con el alcance del servicio y referencia a la cotización aprobada.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button variant="contained" onClick={handleCreateWorkOrder} disabled={workOrderLoading || workOrderExists}>
                {workOrderLoading ? 'Creando…' : workOrderExists ? 'OT creada' : 'Crear Orden de Trabajo'}
              </Button>
              {workOrderExists && (
                <>
                  <Button variant="outlined" onClick={() => setWoDetailOpen(true)}>Ver OT</Button>
                  <Button variant="text" onClick={() => workOrderId && navigate(`/ot/${workOrderId}`)} disabled={!workOrderId}>Ir a OT</Button>
                </>
              )}
              {workOrderExists && (
                <Chip size="small" label="Existe" color="success" />
              )}
            </Box>
          </Box>

          {/* Resource Assignment */}
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>Asignación de Recursos</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Separa elementos por coma. Ejemplo: Juan, María
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Autocomplete
                multiple freeSolo options={catalogPersonnel}
                value={resPersonnelArr}
                onChange={(_, v) => setResPersonnelArr(v as string[])}
                renderTags={(value: readonly string[], getTagProps) => value.map((option: string, index: number) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))}
                renderInput={(params) => <TextField {...params} label="Personal" size="small" />} />

              <Autocomplete
                multiple freeSolo options={catalogEquipment}
                value={resEquipmentArr}
                onChange={(_, v) => setResEquipmentArr(v as string[])}
                renderTags={(value: readonly string[], getTagProps) => value.map((option: string, index: number) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))}
                renderInput={(params) => <TextField {...params} label="Equipo" size="small" />} />

              <Autocomplete
                multiple freeSolo options={catalogMaterials}
                value={resMaterialsArr}
                onChange={(_, v) => setResMaterialsArr(v as string[])}
                renderTags={(value: readonly string[], getTagProps) => value.map((option: string, index: number) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))}
                renderInput={(params) => <TextField {...params} label="Materiales" size="small" />} />
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button variant="contained" onClick={handleSaveResources} disabled={resourcesLoading}>
                {resourcesLoading ? 'Guardando…' : 'Guardar Recursos'}
              </Button>
              {resourcesSaved && <Chip size="small" label="Guardado" color="primary" variant="outlined" />}
            </Box>
          </Box>

          {/* Timeline from audit_logs */}
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>Línea de Tiempo</Typography>
            {loadingAudit ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={22} />
              </Box>
            ) : auditLogs.length > 0 ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {auditLogs.map((ev: any) => {
                  const when = ev.happenedAt?.toDate?.() || ev.changedAt?.toDate?.() || (ev.happenedAt ? new Date(ev.happenedAt) : (ev.changedAt ? new Date(ev.changedAt) : null));
                  const whenStr = when ? new Date(when).toLocaleString() : '';
                  return (
                    <Box key={ev.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Chip size="small" label={ev.type || 'evento'} />
                      <Typography variant="body2">{whenStr}</Typography>
                      {ev.name && <Typography variant="body2" sx={{ color: 'text.secondary' }}>• {ev.name}</Typography>}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Sin eventos aún.</Typography>
            )}
          </Box>
        </Paper>
      </TabPanel>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Eliminar documento</DialogTitle>
        <DialogContent>
          <Typography>¿Deseas eliminar este documento de forma permanente?</Typography>
          {docToDelete?.name && (
            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
              {docToDelete.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={handleConfirmDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Upload progress list */}
      {uploadingDoc && uploadItems.length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Subidas en progreso</Typography>
          {uploadItems.map((it) => (
            <Typography key={it.name} variant="caption" sx={{ display: 'block' }}>
              {it.name}: {it.progress}%
            </Typography>
          ))}
        </Box>
      )}

      <TabPanel value={activeTab} index={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Documentos del Servicio</Typography>

          {/* Evidencias RAD */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Evidencias de RAD (solo lectura)
            </Typography>
            {loadingDaily ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={22} />
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
                {dailyReports.flatMap((rad: any) =>
                  (Array.isArray(rad.evidenceURLs) ? rad.evidenceURLs : []).map((url: string, idx: number) => (
                    <Card key={`${rad.id || 'rad'}_${idx}`} variant="outlined">
                      <CardContent>
                        <Box sx={{ aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 1, mb: 1 }}>
                          <img src={url} alt="Evidencia RAD" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                        <Typography variant="caption">{rad.date?.toDate ? new Date(rad.date.toDate()).toLocaleString() : new Date(rad.date).toLocaleString()}</Typography>
                      </CardContent>
                    </Card>
                  ))
                )}
                {dailyReports.every((r: any) => !r.evidenceURLs || r.evidenceURLs.length === 0) && (
                  <Typography variant="body2" color="text.secondary">No hay evidencias en los RADs de este servicio.</Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Documentos Manuales */}
          <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Subir documentos manualmente
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Button variant="outlined" component="label" disabled={uploadingDoc}>
                {uploadingDoc ? 'Subiendo...' : 'Seleccionar archivo'}
                <input type="file" hidden multiple onChange={onDocFilesChange} />
              </Button>
              <Button variant="contained" onClick={handleUploadDocuments} disabled={uploadingDoc || !docFiles || docFiles.length === 0}>
                {uploadingDoc ? `Subiendo ${docProgress}%` : 'Subir'}
              </Button>
              {docFiles && docFiles.length > 0 && (
                <Typography variant="caption">{Array.from(docFiles).map(f => f.name).join(', ')}</Typography>
              )}
            </Box>

            <Typography variant="subtitle1" gutterBottom>Archivos del Servicio</Typography>
            {loadingDocuments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={22} />
              </Box>
            ) : documents.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                {documents.map((docu) => (
                  <Card key={docu.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ mr: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {docu.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" href={docu.url} target="_blank" rel="noopener noreferrer">Ver</Button>
                          <Button size="small" color="error" onClick={() => confirmDeleteDocument(docu)}>Eliminar</Button>
                        </Box>
                      </Box>
                      {docu.contentType?.startsWith?.('image/') && (
                        <Box sx={{ aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 1 }}>
                          <img src={docu.url} alt={docu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {docu.uploadedAt?.toDate ? new Date(docu.uploadedAt.toDate()).toLocaleString() : (docu.uploadedAt ? new Date(docu.uploadedAt).toLocaleString() : '')}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No hay documentos subidos para este servicio.</Typography>
            )}
          </Box>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Visitas Técnicas</Typography>
          
          {loadingTechnicalVisits ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : technicalVisits.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {technicalVisits.map((visit, index) => (
                <Card key={visit.id} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        Visita #{index + 1}
                      </Typography>
                      <Chip 
                        label={visit.status || 'programada'} 
                        color={visit.status === 'completada' ? 'success' : visit.status === 'cancelada' ? 'error' : 'warning'}
                        variant="outlined"
                      />
                    </Box>

                    {/* Información de Programación */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" color="primary" gutterBottom>
                        📅 Información de Programación
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Fecha Programada</Typography>
                          <Typography>
                            {visit.visitDate && visit.visitTime ? 
                              `${visit.visitDate} a las ${visit.visitTime}` : 
                              'No especificada'
                            }
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Técnico Asignado</Typography>
                          <Typography>{visit.technicianName || 'No especificado'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Duración Estimada</Typography>
                          <Typography>{visit.estimatedDuration ? `${visit.estimatedDuration} horas` : 'No especificada'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Propósito</Typography>
                          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                            {visit.visitPurpose || 'No especificado'}
                          </Typography>
                        </Box>
                      </Box>
                      {visit.specialRequirements && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Requerimientos Especiales</Typography>
                          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                            {visit.specialRequirements}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Resultados de la Visita */}
                    {visit.results && (
                      <Box>
                        <Typography variant="subtitle1" color="primary" gutterBottom>
                          📋 Resultados de la Visita
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Hora de Inicio Real</Typography>
                            <Typography>{visit.results.actualStartTime || 'No registrada'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Hora de Finalización</Typography>
                            <Typography>{visit.results.actualEndTime || 'No registrada'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Estado de la Visita</Typography>
                            <Chip 
                              label={visit.results.visitStatus || 'Sin estado'} 
                              size="small"
                              color={visit.results.visitStatus === 'completada' ? 'success' : 'default'}
                            />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Satisfacción del Cliente</Typography>
                            <Typography>{visit.results.clientSatisfaction || 'No evaluada'}</Typography>
                          </Box>
                        </Box>

                        {visit.results.problemsFound && visit.results.problemsFound.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Problemas Encontrados</Typography>
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                              {visit.results.problemsFound.map((problem: string, idx: number) => (
                                <Typography component="li" key={idx}>{problem}</Typography>
                              ))}
                            </Box>
                          </Box>
                        )}

                        {visit.results.solutionsProposed && visit.results.solutionsProposed.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Soluciones Propuestas</Typography>
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                              {visit.results.solutionsProposed.map((solution: string, idx: number) => (
                                <Typography component="li" key={idx}>{solution}</Typography>
                              ))}
                            </Box>
                          </Box>
                        )}

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Trabajo Completado</Typography>
                          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                            {visit.results.workCompleted || 'No especificado'}
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Notas del Técnico</Typography>
                          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                            {visit.results.technicianNotes || 'Sin notas'}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Acción Recomendada</Typography>
                            <Chip 
                              label={visit.results.recommendedAction || 'Sin recomendación'} 
                              size="small"
                              color={visit.results.recommendedAction === 'aprobar' ? 'success' : 
                                     visit.results.recommendedAction === 'rechazar' ? 'error' : 'warning'}
                            />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Fecha Estimada de Finalización</Typography>
                            <Typography>{visit.results.estimatedCompletionDate || 'No especificada'}</Typography>
                          </Box>
                        </Box>

                        {visit.results.followUpRequired && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                            <Typography variant="subtitle2" color="warning.dark">
                              ⚠️ Requiere Seguimiento
                            </Typography>
                            {visit.results.followUpDate && (
                              <Typography variant="body2">
                                Fecha de seguimiento: {visit.results.followUpDate}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No hay visitas técnicas registradas para este servicio.
              </Typography>
              {service?.status === 'Visita Técnica' && (
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  onClick={() => setTechVisitModalOpen(true)}
                >
                  Programar Visita Técnica
                </Button>
              )}
            </Box>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" gutterBottom sx={{ m: 0 }}>Cotizaciones del Servicio</Typography>
            <Chip label={`${proposals.length} cotización${proposals.length === 1 ? '' : 'es'}`} color="primary" variant="outlined" />
          </Box>

          {loadingProposals ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : proposals.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {proposals.map((p) => {
                const created = (p as any).createdAt?.toDate ? (p as any).createdAt.toDate() : new Date((p as any).createdAt || 0);
                return (
                  <Card key={p.id} variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            v{String(p.version || 1).padStart(2, '0')} • {service.folio}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {p.id.substring(0, 12)}... • Creada: {isNaN(created.getTime()) ? 'N/D' : created.toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={p.status}
                            color={p.status === 'Aprobada' ? 'success' : p.status === 'Rechazada' ? 'error' : p.status === 'Enviada' ? 'info' : 'default'}
                            size="small"
                          />
                          <Button size="small" variant="outlined" onClick={() => { setExistingProposal(p); setQuotationModalOpen(true); }}>
                            Ver/Editar
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => { setExistingProposal(null); setQuotationModalOpen(true); }}
                >
                  Crear Nueva Cotización
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No hay cotizaciones creadas para este servicio
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => { setExistingProposal(null); setQuotationModalOpen(true); }}
                sx={{ mt: 1.5 }}
              >
                Crear Cotización
              </Button>
            </Box>
          )}
        </Paper>
      </TabPanel>

    <TabPanel value={activeTab} index={3}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          RADs del Servicio
        </Typography>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, alignItems: 'end', mb: 1 }}>
          <DatePicker
            label="Desde"
            value={radFrom}
            onChange={(val) => setRadFrom(val)}
            slotProps={{ textField: { error: Boolean(invalidRange) } }}
          />
          <DatePicker
            label="Hasta"
            value={radTo}
            onChange={(val) => setRadTo(val)}
            slotProps={{ textField: { error: Boolean(invalidRange) } }}
          />
          <FormControl>
            <InputLabel id="paging-mode">Paginación</InputLabel>
            <Select
              labelId="paging-mode"
              label="Paginación"
              value={useServerPaging ? 'server' : 'local'}
              onChange={(e) => {
                const v = e.target.value as string;
                setUseServerPaging(v === 'server');
                setRadPage(0);
              }}
            >
              <MenuItem value="local">Local</MenuItem>
              <MenuItem value="server">Servidor</MenuItem>
            </Select>
          </FormControl>
          <FormControl disabled={!useServerPaging}>
            <InputLabel id="page-size">Líneas</InputLabel>
            <Select
              labelId="page-size"
              label="Líneas"
              value={String(radLimit)}
              onChange={(e) => setRadLimit(Number(e.target.value))}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {invalidRange && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
            El campo "Hasta" debe ser mayor o igual que "Desde".
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" mb={1} gap={1} flexWrap="wrap">
          <Box>
            {useServerPaging && (
              <>
                <Button size="small" variant="outlined" disabled={!radHasPrev || loadingDaily || Boolean(invalidRange)} onClick={() => fetchServerPage('prev')} sx={{ mr: 1 }}>
                  Anterior
                </Button>
                <Button size="small" variant="outlined" disabled={!radHasNext || loadingDaily || Boolean(invalidRange)} onClick={() => fetchServerPage('next')}>
                  Siguiente
                </Button>
              </>
            )}
          </Box>
          <Box>
            <Button variant="outlined" onClick={handleExportRADs} disabled={loadingDaily || Boolean(invalidRange) || (useServerPaging ? serverDailyReports.length === 0 : dailyReports.length === 0)} sx={{ mr: 1 }}>
              Exportar CSV
            </Button>
            <Button variant="outlined" onClick={handleExportRADsPDF} disabled={loadingDaily || Boolean(invalidRange) || (useServerPaging ? serverDailyReports.length === 0 : dailyReports.length === 0)}>
              Exportar PDF
            </Button>
          </Box>
        </Box>

        {/* RADs Gantt timeline */}
        {!(useServerPaging ? serverDailyReports.length === 0 : dailyReports.length === 0) && (
          (() => {
            const rows = useServerPaging ? serverDailyReports : dailyReports;
            // Build date range
            const dates: Date[] = rows.map((r: any) => {
              const d = r.date?.toDate?.() ? new Date(r.date.toDate()) : (r.date ? new Date(r.date) : new Date());
              d.setHours(0,0,0,0);
              return d;
            });
            const minD = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxD = new Date(Math.max(...dates.map(d => d.getTime())));
            const start = new Date(minD); start.setDate(start.getDate() - 2);
            const end = new Date(maxD); end.setDate(end.getDate() + 5);
            const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1);
            const dayWidth = 32;
            function dateToX(d: Date | null) {
              if (!d) return 0;
              const day = new Date(d); day.setHours(0,0,0,0);
              const diff = Math.round((day.getTime() - start.getTime()) / (1000*60*60*24));
              return Math.max(0, Math.min(diff, days)) * dayWidth;
            }
            const today = new Date(); today.setHours(0,0,0,0);
            const todayX = dateToX(today);
            const todayInRange = todayX >= 0 && todayX <= days * dayWidth;
            // Determine metric for bar width (prefer hours, else hectares)
            const hoursArr = rows.map((r: any) => Number(r?.progress?.hours || 0));
            const hectaresArr = rows.map((r: any) => Number(r?.progress?.hectares || 0));
            const useHours = hoursArr.some(v => v > 0);
            const values = useHours ? hoursArr : hectaresArr;
            const maxVal = Math.max(0, ...values);
            const minWidth = Math.max(16, Math.round(dayWidth * 0.75));
            const maxWidth = 220; // cap to avoid overflow per row
            return (
              <Paper sx={{ p: 2, mt: 2, overflowX: 'auto' }}>
                <Typography variant="h6" gutterBottom>Gantt de RADs</Typography>
                <Box sx={{ display: 'flex', mb: 1, minWidth: 200 + days * dayWidth }}>
                  <Box sx={{ width: 200, flexShrink: 0 }} />
                  <Box sx={{ position: 'relative', display: 'flex', gap: 0, flexGrow: 1 }}>
                    {Array.from({ length: days }).map((_, i) => {
                      const d = new Date(start); d.setDate(d.getDate() + i);
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
                  {rows.map((r: any, idx: number) => {
                    const d = r.date?.toDate?.() ? new Date(r.date.toDate()) : (r.date ? new Date(r.date) : new Date());
                    d.setHours(0,0,0,0);
                    const left = dateToX(d);
                    const metricVal = useHours ? Number(r?.progress?.hours || 0) : Number(r?.progress?.hectares || 0);
                    const width = maxVal > 0
                      ? Math.max(minWidth, Math.round((metricVal / maxVal) * (maxWidth - minWidth)) + minWidth)
                      : minWidth;
                    const dateStr = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
                    const label = useHours
                      ? `${dateStr} • ${Number(r?.progress?.hours || 0)}h`
                      : `${dateStr} • ${Number(r?.progress?.hectares || 0)}ha`;
                    return (
                      <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', minWidth: 200 + days * dayWidth, mb: 1 }}>
                        <Box sx={{ width: 200, pr: 1, flexShrink: 0 }}>
                          <Typography variant="body2" noWrap title={r.id}>{service?.folio || r.serviceId || 'RAD'}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {r?.progress?.hectares ? `${r.progress.hectares} ha` : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ position: 'relative', height: 28, flexGrow: 1 }}>
                          <Box sx={{ position: 'absolute', inset: 0, display: 'flex' }}>
                            {Array.from({ length: days }).map((_, i) => (
                              <Box key={i} sx={{ width: dayWidth, borderRight: '1px dashed', borderColor: 'divider', opacity: 0.7 }} />
                            ))}
                          </Box>
                          {todayInRange && (
                            <Box sx={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2, bgcolor: 'error.light', opacity: 0.6 }} />
                          )}
                          <Box sx={{ position: 'absolute', left, top: 6, height: 16, width, bgcolor: 'primary.main', borderRadius: 1 }} />
                          <Typography variant="caption" sx={{ position: 'absolute', left: left + 4, top: 6, color: '#fff', fontSize: 10, maxWidth: Math.max(0, width - 8), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                            {label}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            );
          })()
        )}
        {loadingDaily ? (
          <Box display="flex" justifyContent="center" py={2}><Typography>Cargando...</Typography></Box>
        ) : (useServerPaging ? serverDailyReports.length === 0 : dailyReports.length === 0) ? (
          <Typography color="textSecondary">No hay reportes diarios</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {(useServerPaging ? serverDailyReports : dailyReports.slice(radPage * radRowsPerPage, radPage * radRowsPerPage + radRowsPerPage)).map((rad) => (
              <Card key={rad.id} onClick={() => openRadViewer(rad)} sx={{ cursor: 'pointer' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{rad.date?.toDate ? new Date(rad.date.toDate()).toLocaleDateString() : new Date(rad.date).toLocaleDateString()}</Typography>
                      <Typography variant="body2" color="text.secondary">Hectáreas: {rad.progress?.hectares || 0} | Horas: {rad.progress?.hours || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">Combustible: {rad.consumables?.fuel || 0} L | Fertilizante: {rad.consumables?.fertilizer || 0}</Typography>
                      {rad.incidents && <Typography variant="body2">Incidentes: {rad.incidents}</Typography>}
                    </Box>
                    <Typography variant="caption" color="text.secondary">Evidencias: {rad.evidenceURLs?.length || 0}</Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
        {!useServerPaging && !loadingDaily && (dailyReports.length > 0) && (
          <TablePagination
            component="div"
            count={dailyReports.length}
            page={radPage}
            onPageChange={(_, p) => setRadPage(p)}
            rowsPerPage={radRowsPerPage}
            onRowsPerPageChange={(e) => { setRadRowsPerPage(parseInt(e.target.value,10)); setRadPage(0); }}
            rowsPerPageOptions={[5,10,25]}
            labelRowsPerPage="Filas por página"
          />
        )}
      </Box>
      {(currentUser && (['admin','manager','supervisor'] as const).includes((service as any)?.role || ''))}
      <DailyReportForm serviceId={service.id} supervisorUid={currentUser?.uid || ''} onCreated={() => { /* realtime updates list */ }} />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documentos del Servicio
          </Typography>
          <Typography color="textSecondary" paragraph>
            Aquí se mostrarán los documentos relacionados con este servicio.
          </Typography>
          <Button variant="outlined" startIcon={<AttachFileIcon />}>
            Subir Documento
          </Button>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Actividades
          </Typography>
          <Typography color="textSecondary" paragraph>
            Aquí se mostrarán las actividades relacionadas con este servicio.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Facturación
          </Typography>
          <Typography color="textSecondary" paragraph>
            Aquí se mostrará la información de facturación relacionada con este servicio.
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={7}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Seguimiento (Audit Logs)
          </Typography>
        </Box>
        {loadingAudit ? (
          <Box display="flex" justifyContent="center" py={2}><Typography>Cargando...</Typography></Box>
        ) : auditLogs.length === 0 ? (
          <Typography color="textSecondary">Sin eventos de auditoría</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {auditLogs.map((log) => (
              <Card key={log.id}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" gap={2}>
                    <Box>
                      <Typography variant="subtitle1">
                        {log.type === 'service_status_change' ? 'Cambio de estado' : (log.type || 'Evento')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {log.oldStatus} → {log.newStatus}
                      </Typography>
                      {log.notes && (
                        <Typography variant="body2">Notas: {log.notes}</Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Por: {log.changedBy || 'system'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {log.changedAt?.toDate ? new Date(log.changedAt.toDate()).toLocaleString() : (log.changedAt ? new Date(log.changedAt).toLocaleString() : '')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </TabPanel>

      {/* RAD Viewer Dialog */}
      <Dialog
        open={radViewerOpen}
        onClose={closeRadViewer}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalle del RAD
          {selectedRad && (
            <Typography variant="subtitle2" color="text.secondary">
              {selectedRad.date?.toDate ? new Date(selectedRad.date.toDate()).toLocaleDateString() : new Date(selectedRad.date).toLocaleDateString()}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedRad && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Hectáreas</Typography>
                  <Typography variant="h6">{selectedRad.progress?.hectares || 0}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Horas</Typography>
                  <Typography variant="h6">{selectedRad.progress?.hours || 0}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Combustible (L)</Typography>
                  <Typography variant="h6">{selectedRad.consumables?.fuel || 0}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Fertilizante (kg)</Typography>
                  <Typography variant="h6">{selectedRad.consumables?.fertilizer || 0}</Typography>
                </Box>
              </Box>
              {selectedRad.incidents && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Incidentes</Typography>
                  <Typography>{selectedRad.incidents}</Typography>
                </Box>
              )}
              {selectedRad.evidenceURLs && selectedRad.evidenceURLs.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Evidencias ({selectedRad.evidenceURLs.length})
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1 }}>
                    {selectedRad.evidenceURLs.map((url: string, idx: number) => (
                      <Box key={idx} component="img" src={url} sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 1 }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRadViewer}>Cerrar</Button>
          {selectedRad && (
            <Button
              variant="contained"
              onClick={() => handleExportSingleRadPDF(selectedRad)}
            >
              Exportar PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cambiar Estado del Servicio</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="status-select-label">Nuevo Estado</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              value={newStatus || ''}
              label="Nuevo Estado"
              onChange={handleStatusChange}
            >
              {Object.values(serviceStatuses).map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            fullWidth
            multiline
            rows={4}
            label="Notas del Cambio"
            value={statusChangeNotes}
            onChange={(e) => setStatusChangeNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            color="primary"
            disabled={!newStatus}
          >
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Technical Visit Modal */}
      {techVisitModalOpen && (
        <TechnicalVisitModal
          open={techVisitModalOpen}
          onClose={() => setTechVisitModalOpen(false)}
          service={service!}
          onVisitSaved={handleTechnicalVisitSaved}
        />
      )}

      {/* Service Evaluation Modal */}
      <ServiceEvaluationModal
        open={evaluationModalOpen}
        onClose={() => setEvaluationModalOpen(false)}
        service={service}
        onEvaluationComplete={() => {
          // Refresh service data
          if (id) {
            const serviceRef = doc(db, 'services', id);
            onSnapshot(serviceRef, (doc) => {
              if (doc.exists()) {
                setService({ id: doc.id, ...doc.data() } as Service);
              }
            });
          }
        }}
      />

      {/* Quotation Modal */}
      <QuotationModal
        open={quotationModalOpen}
        onClose={() => setQuotationModalOpen(false)}
        service={service}
        existingProposal={existingProposal ?? undefined}
        onQuotationCreated={() => {
          // Refresh service data after quotation is created
          if (service) {
            setService({ ...service });
          }
        }}
      />
    </Box>
  );
}

// Helper object for service statuses
const serviceStatuses: Record<ServiceStatus, string> = {
  'Solicitado': 'Solicitado',
  'En Proceso': 'En Proceso',
  'Visita Técnica': 'Visita Técnica',
  'En Visita Técnica': 'En Visita Técnica',
  'Pendiente Cotización': 'Pendiente Cotización',
  'Cotización Enviada': 'Cotización Enviada',
  'Cotización Aprobada': 'Cotización Aprobada',
  'Cotización Rechazada': 'Cotización Rechazada',
  'Rechazado': 'Rechazado',
  'En Planificación': 'En Planificación',
  'En Ejecución': 'En Ejecución',
  'Finalizado': 'Finalizado',
  'Facturado': 'Facturado',
  'Pagado': 'Pagado',
};
