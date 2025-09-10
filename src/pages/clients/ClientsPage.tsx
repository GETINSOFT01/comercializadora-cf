import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Client } from '../../types';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const clientsData: Client[] = [];
        querySnapshot.forEach((doc) => {
          clientsData.push({ id: doc.id, ...doc.data() } as Client);
        });
        
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
        enqueueSnackbar('Error al cargar los clientes', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [enqueueSnackbar]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.taxId?.toLowerCase().includes(searchLower) ||
      client.contacts?.some(contact => 
        contact.name.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower)
      )
    );
  });

  const paginatedClients = filteredClients.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getPrimaryContact = (client: Client) => {
    return client.contacts?.[0] || { name: 'Sin contacto', email: '', phone: '' };
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/clients/new')}
        >
          Nuevo Cliente
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar clientes por nombre, RFC o contacto..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Contacto Principal</TableCell>
                <TableCell>Información de Contacto</TableCell>
                <TableCell>RFC</TableCell>
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
                      Cargando clientes...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      {searchTerm 
                        ? 'No se encontraron clientes que coincidan con la búsqueda'
                        : 'No hay clientes registrados'}
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/clients/new')}
                        sx={{ mt: 2 }}
                      >
                        Agregar Cliente
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClients.map((client) => {
                  const primaryContact = getPrimaryContact(client);
                  return (
                    <TableRow key={client.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <BusinessIcon color="action" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {client.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {client.businessName || 'Sin razón social'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <PersonIcon color="action" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body1">
                              {primaryContact.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {primaryContact.role || 'Sin cargo especificado'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" mb={0.5}>
                          <EmailIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            {primaryContact.email || 'Sin correo'}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center">
                          <PhoneIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            {primaryContact.phone || 'Sin teléfono'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {client.taxId || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={client.isActive ? 'Activo' : 'Inactivo'}
                          color={client.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver detalles">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/clients/${client.id}/edit`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredClients.length}
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
