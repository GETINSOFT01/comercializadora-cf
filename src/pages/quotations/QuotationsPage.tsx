import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  getDocs,
  getDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Proposal, ProposalStatus, Service } from '../../types';
import QuotationModal from '../../components/QuotationModal';
import PDFViewer from '../../components/PDFViewer';

interface QuotationWithService extends Proposal {
  service?: Service;
}

const statusColors: Record<ProposalStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'Borrador': 'default',
  'Enviada': 'info',
  'Aprobada': 'success',
  'Rechazada': 'error',
};

const statusLabels: Record<ProposalStatus, string> = {
  'Borrador': 'Borrador',
  'Enviada': 'Enviada',
  'Aprobada': 'Aprobada',
  'Rechazada': 'Rechazada',
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [quotations, setQuotations] = useState<QuotationWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationWithService | null>(null);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  // Date filters (calendar)
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    borrador: 0,
    enviada: 0,
    aprobada: 0,
    rechazada: 0,
    totalAmount: 0,
  });

  // Load quotations from Firestore
  useEffect(() => {
    // Build query constraints with optional server-side date range
    const constraints: any[] = [orderBy('createdAt', 'desc')];
    const invalidRange = Boolean(fromDate && toDate && toDate! < fromDate!);
    if (!invalidRange) {
      if (fromDate) {
        const fromD = new Date(fromDate);
        fromD.setHours(0, 0, 0, 0);
        constraints.push(where('createdAt', '>=', fromD));
      }
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', toD));
      }
    }

    const quotationsQuery = query(collection(db, 'proposals'), ...constraints);

    const unsubscribe = onSnapshot(quotationsQuery, async (snapshot) => {
      try {
        const quotationsData = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Proposal[];

        // 1) Collect unique serviceIds
        const serviceIds = Array.from(new Set(quotationsData.map(q => q.serviceId).filter(Boolean))) as string[];

        // 2) Fetch services by id (in parallel) and index by id
        const servicePromises = serviceIds.map(async (sid) => {
          const sSnap = await getDocs(query(collection(db, 'services'), where('__name__', '==', sid)));
          if (!sSnap.empty) {
            const sd = sSnap.docs[0];
            const data = { id: sd.id, ...sd.data() } as Service;
            return [sid, data] as const;
          }
          return [sid, undefined] as const;
        });
        const serviceEntries = await Promise.all(servicePromises);
        const serviceMap = new Map<string, Service | undefined>(serviceEntries);

        // 3) Collect unique clientIds from services
        const clientIds = Array.from(new Set(
          serviceEntries
            .map(([, s]) => s?.clientId)
            .filter((v): v is string => typeof v === 'string' && v.length > 0)
        ));

        // 4) Fetch clients by id (in parallel) and index by id
        const clientPromises = clientIds.map(async (cid) => {
          const cDoc = await getDoc(doc(db, 'clients', cid));
          if (cDoc.exists()) {
            return [cid, { id: cDoc.id, ...(cDoc.data() as any) } as any] as const;
          }
          return [cid, undefined] as const;
        });
        const clientEntries = await Promise.all(clientPromises);
        const clientMap = new Map<string, any | undefined>(clientEntries);

        // 5) Attach client objects to their services explicitly (avoid using any 'client' field from service doc)
        serviceMap.forEach((service) => {
          if (service?.clientId) {
            (service as any).client = clientMap.get(service.clientId) || undefined;
          } else {
            (service as any).client = undefined;
          }
        });

        // 6) Build final list
        const quotationsWithServices: QuotationWithService[] = quotationsData.map((q) => ({
          ...q,
          service: q.serviceId ? serviceMap.get(q.serviceId) : undefined,
        }));

        setQuotations(quotationsWithServices);

        // 7) Statistics
        const newStats = {
          total: quotationsWithServices.length,
          borrador: quotationsWithServices.filter(q => q.status === 'Borrador').length,
          enviada: quotationsWithServices.filter(q => q.status === 'Enviada').length,
          aprobada: quotationsWithServices.filter(q => q.status === 'Aprobada').length,
          rechazada: quotationsWithServices.filter(q => q.status === 'Rechazada').length,
          totalAmount: quotationsWithServices
            .filter(q => q.status === 'Aprobada')
            .reduce((sum, q) => sum + (q.totalAmount || 0), 0),
        };
        setStats(newStats);

      } catch (error) {
        console.error('Error loading quotations:', error);
        enqueueSnackbar('Error al cargar cotizaciones', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [enqueueSnackbar, fromDate, toDate]);

  const invalidRange = Boolean(fromDate && toDate && toDate! < fromDate!);

  // Filter quotations
  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch = !searchTerm || 
      quotation.service?.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.service?.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
    
    // Date range check (by createdAt)
    let matchesDate = true;
    const createdSource: any = (quotation as any).createdAt;
    const created: Date = createdSource?.toDate
      ? createdSource.toDate()
      : (createdSource instanceof Date
        ? createdSource
        : new Date(createdSource || 0));
    if (fromDate) {
      const fromD = new Date(fromDate);
      fromD.setHours(0,0,0,0);
      matchesDate = matchesDate && created >= fromD;
    }
    if (toDate) {
      const toD = new Date(toDate);
      toD.setHours(23,59,59,999);
      matchesDate = matchesDate && created <= toD;
    }
    
    return matchesSearch && matchesStatus && (invalidRange ? true : matchesDate);
  });

  // Paginated quotations
  const paginatedQuotations = filteredQuotations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewQuotation = (quotation: QuotationWithService) => {
    if (quotation.service) {
      navigate(`/services/${quotation.serviceId}`);
    } else {
      enqueueSnackbar('Servicio no encontrado', { variant: 'warning' });
    }
  };

  const handleEditQuotation = (quotation: QuotationWithService) => {
    setSelectedQuotation(quotation);
    setQuotationModalOpen(true);
  };

  const handleViewPDF = (quotation: QuotationWithService) => {
    console.log('handleViewPDF called with:', quotation);
    console.log('Service:', quotation.service);
    console.log('Client:', quotation.service?.client);
    
    if (quotation.service && quotation.status === 'Enviada') {
      setSelectedQuotation(quotation);
      setPdfViewerOpen(true);
      console.log('PDF Viewer should open now');
    } else {
      console.log('Conditions not met for PDF viewer');
      enqueueSnackbar('Solo se puede ver el PDF de cotizaciones enviadas', { variant: 'warning' });
    }
  };

  const handleUpdateStatus = async (quotationId: string, newStatus: ProposalStatus) => {
    try {
      await updateDoc(doc(db, 'proposals', quotationId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Update service status if needed
      const quotation = quotations.find(q => q.id === quotationId);
      if (quotation?.serviceId) {
        let serviceStatus = '';
        switch (newStatus) {
          case 'Aprobada':
            serviceStatus = 'Cotización Aprobada';
            break;
          case 'Rechazada':
            serviceStatus = 'Cotización Rechazada';
            break;
          case 'Enviada':
            serviceStatus = 'Cotización Enviada';
            break;
          default:
            serviceStatus = 'Pendiente Cotización';
        }

        await updateDoc(doc(db, 'services', quotation.serviceId), {
          status: serviceStatus,
          updatedAt: serverTimestamp(),
        });
      }

      enqueueSnackbar(`Cotización ${newStatus.toLowerCase()} exitosamente`, { variant: 'success' });
    } catch (error) {
      console.error('Error updating quotation status:', error);
      enqueueSnackbar('Error al actualizar estado de cotización', { variant: 'error' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return format(dateObj, 'dd/MM/yyyy', { locale: es });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Gestión de Cotizaciones
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
        >
          Actualizar
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(5, 1fr)',
          },
          gap: 3,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Total Cotizaciones
            </Typography>
            <Typography variant="h4">
              {stats.total}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Borradores
            </Typography>
            <Typography variant="h4" color="text.secondary">
              {stats.borrador}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Enviadas
            </Typography>
            <Typography variant="h4" color="info.main">
              {stats.enviada}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Aprobadas
            </Typography>
            <Typography variant="h4" color="success.main">
              {stats.aprobada}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Valor Aprobado
            </Typography>
            <Typography variant="h6" color="success.main">
              {formatCurrency(stats.totalAmount)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Buscar"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Folio, cliente, ID..."
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | 'all')}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="Borrador">Borrador</MenuItem>
              <MenuItem value="Enviada">Enviada</MenuItem>
              <MenuItem value="Aprobada">Aprobada</MenuItem>
              <MenuItem value="Rechazada">Rechazada</MenuItem>
            </Select>
          </FormControl>

          <DatePicker
            label="Desde"
            value={fromDate}
            onChange={(val) => setFromDate(val)}
            slotProps={{ textField: { size: 'small', error: Boolean(invalidRange) } }}
          />
          <DatePicker
            label="Hasta"
            value={toDate}
            onChange={(val) => setToDate(val)}
            slotProps={{ textField: { size: 'small', error: Boolean(invalidRange) } }}
          />

          {invalidRange && (
            <Typography variant="caption" color="error">
              El campo "Hasta" debe ser mayor o igual que "Desde".
            </Typography>
          )}

          <Button
            size="small"
            variant="outlined"
            onClick={() => { setFromDate(null); setToDate(null); }}
            disabled={!fromDate && !toDate}
          >
            Limpiar fechas
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {filteredQuotations.length} de {quotations.length} cotizaciones
          </Typography>
        </Box>
      </Paper>

      {/* Quotations Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID Cotización</TableCell>
                <TableCell>Folio Servicio</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Monto Total</TableCell>
                <TableCell>Fecha Creación</TableCell>
                <TableCell>Versión</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedQuotations.map((quotation) => (
                <TableRow key={quotation.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {quotation.id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {quotation.service?.folio ? `${quotation.service.folio} - v${String(quotation.version || 1).padStart(2, '0')}` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {quotation.service?.client?.name || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[quotation.status]}
                      color={statusColors[quotation.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(quotation.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(quotation.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      v{quotation.version}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Ver servicio">
                        <IconButton
                          size="small"
                          onClick={() => handleViewQuotation(quotation)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Editar cotización">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleEditQuotation(quotation)}
                            disabled={quotation.status === 'Aprobada'}
                          >
                            <EditIcon />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {quotation.status === 'Enviada' && (
                        <Tooltip title="Ver PDF enviado">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewPDF(quotation)}
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {quotation.status === 'Enviada' && (
                        <>
                          <Tooltip title="Aprobar">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleUpdateStatus(quotation.id, 'Aprobada')}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Rechazar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleUpdateStatus(quotation.id, 'Rechazada')}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredQuotations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Quotation Modal */}
      {selectedQuotation && selectedQuotation.service && (
        <QuotationModal
          open={quotationModalOpen}
          onClose={() => {
            setQuotationModalOpen(false);
            setSelectedQuotation(null);
          }}
          service={selectedQuotation.service}
          onQuotationCreated={() => {
            setQuotationModalOpen(false);
            setSelectedQuotation(null);
          }}
        />
      )}

      {/* PDF Viewer */}
      {selectedQuotation && selectedQuotation.service && selectedQuotation.service.client && (
        <PDFViewer
          open={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedQuotation(null);
          }}
          proposal={selectedQuotation}
          service={selectedQuotation.service}
          client={selectedQuotation.service.client}
          title={`Cotización ${selectedQuotation.service.folio} - v${selectedQuotation.version}`}
        />
      )}
    </Box>
  );
}
