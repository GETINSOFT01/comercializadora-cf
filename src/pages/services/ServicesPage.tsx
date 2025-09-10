import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Service, ServiceStatus } from '../../types';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusColors: Record<ServiceStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  'Solicitado': 'info',
  'En Visita Técnica': 'info',
  'Cotización Aprobada': 'info',
  'En Planificación': 'warning',
  'En Ejecución': 'warning',
  'Finalizado': 'success',
  'Facturado': 'success',
  'Pagado': 'success',
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'Todos'>('Todos');
  const [dateFilter, setDateFilter] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        let q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));

        // Apply filters
        const filters = [];
        
        if (statusFilter !== 'Todos') {
          filters.push(where('status', '==', statusFilter));
        }
        
        if (dateFilter.start) {
          filters.push(where('createdAt', '>=', Timestamp.fromDate(dateFilter.start)));
        }
        
        if (dateFilter.end) {
          const endOfDay = new Date(dateFilter.end);
          endOfDay.setHours(23, 59, 59, 999);
          filters.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)));
        }
        
        // Only show services assigned to the current user if they're a supervisor
        if (userRole === 'supervisor') {
          filters.push(where('assignedTeam', 'array-contains', currentUser?.uid || ''));
        }
        
        // Apply all filters
        if (filters.length > 0) {
          q = query(q, ...filters);
        }

        const querySnapshot = await getDocs(q);
        const servicesData: Service[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Service, 'id'>;
          servicesData.push({ id: doc.id, ...data });
        });

        setServices(servicesData);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [statusFilter, dateFilter, currentUser?.uid, userRole]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value as ServiceStatus | 'Todos');
    setPage(0);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = 
      service.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.fscf001_data?.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.fscf001_data?.serviceType?.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesSearch;
  });

  const paginatedServices = filteredServices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const jsDate = date.toDate ? date.toDate() : new Date(date);
    return format(jsDate, 'PP', { locale: es });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Servicios
        </Typography>
        {(userRole === 'admin' || userRole === 'manager') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/services/new')}
          >
            Nuevo Servicio
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Filtros" />
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '200px' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Buscar por folio, cliente o tipo de servicio..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Box>
            <Box sx={{ flex: '0 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="status-filter-label">Estado</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Estado"
                >
                  <MenuItem value="Todos">
                    <em>Todos</em>
                  </MenuItem>
                  {Object.keys(statusColors).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '0 1 200px', minWidth: '150px' }}>
              <TextField
                fullWidth
                type="date"
                label="Fecha desde"
                InputLabelProps={{ shrink: true }}
                value={dateFilter.start ? format(dateFilter.start, 'yyyy-MM-dd') : ''}
                onChange={(e) =>
                  setDateFilter({
                    ...dateFilter,
                    start: e.target.value ? new Date(e.target.value) : null,
                  })
                }
              />
            </Box>
            <Box sx={{ flex: '0 1 200px', minWidth: '150px' }}>
              <TextField
                fullWidth
                type="date"
                label="Hasta"
                InputLabelProps={{ shrink: true }}
                value={dateFilter.end ? format(dateFilter.end, 'yyyy-MM-dd') : ''}
                onChange={(e) =>
                  setDateFilter({
                    ...dateFilter,
                    end: e.target.value ? new Date(e.target.value) : null,
                  })
                }
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Folio</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Tipo de Servicio</TableCell>
                <TableCell>Fecha de Creación</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Cargando servicios...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No se encontraron servicios que coincidan con los filtros
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedServices.map((service) => (
                  <TableRow key={service.id} hover>
                    <TableCell>{service.folio}</TableCell>
                    <TableCell>{service.fscf001_data?.clientName || 'N/A'}</TableCell>
                    <TableCell>{service.fscf001_data?.serviceType || 'N/A'}</TableCell>
                    <TableCell>{formatDate(service.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        label={service.status}
                        color={statusColors[service.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalles">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/services/${service.id}`)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {(userRole === 'admin' || userRole === 'manager') && (
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/services/${service.id}/edit`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredServices.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </TableContainer>
      </Card>
    </Box>
  );
}
