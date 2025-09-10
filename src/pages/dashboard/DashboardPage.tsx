import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Service, ServiceStatus } from '../../types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const statusIcons: Record<ServiceStatus, React.ReactElement> = {
  'Solicitado': <InfoIcon color="info" />,
  'En Visita Técnica': <InfoIcon color="info" />,
  'Cotización Aprobada': <InfoIcon color="info" />,
  'En Planificación': <WarningIcon color="warning" />,
  'En Ejecución': <WarningIcon color="warning" />,
  'Finalizado': <CheckCircleIcon color="success" />,
  'Facturado': <CheckCircleIcon color="success" />,
  'Pagado': <CheckCircleIcon color="success" />,
};

export default function DashboardPage() {
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    pendingApproval: 0,
  });
  
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const servicesRef = collection(db, 'services');
        let q;
        
        // Only show services assigned to the current user if they're a supervisor
        if (userRole === 'supervisor') {
          q = query(
            servicesRef,
            where('assignedTeam', 'array-contains', currentUser?.uid || '')
          );
        } else {
          q = servicesRef;
        }
        
        const querySnapshot = await getDocs(q);
        const servicesData: Service[] = [];
        let inProgressCount = 0;
        let completedCount = 0;
        let pendingApprovalCount = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Service, 'id'>;
          const service = { id: doc.id, ...data };
          servicesData.push(service);

          // Update counters based on status
          if (['En Planificación', 'En Ejecución'].includes(service.status)) {
            inProgressCount++;
          } else if (['Finalizado', 'Facturado', 'Pagado'].includes(service.status)) {
            completedCount++;
          } else if (['Solicitado', 'En Visita Técnica', 'Cotización Aprobada'].includes(service.status)) {
            pendingApprovalCount++;
          }
        });

        // Sort by creation date, newest first
        servicesData.sort((a, b) => 
          (b.createdAt as any)?.toDate().getTime() - (a.createdAt as any)?.toDate().getTime()
        );

        setRecentServices(servicesData.slice(0, 5));
        setStats({
          total: servicesData.length,
          inProgress: inProgressCount,
          completed: completedCount,
          pendingApproval: pendingApprovalCount,
        });
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [currentUser?.uid, userRole]);

  const StatCard = ({ title, value, color }: { title: string; value: number; color: string }) => (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" color={color}>
          {loading ? <CircularProgress size={24} /> : value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Panel de Control
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
        <StatCard title="Total de Servicios" value={stats.total} color="primary" />
        <StatCard title="En Progreso" value={stats.inProgress} color="warning" />
        <StatCard title="Completados" value={stats.completed} color="success" />
        <StatCard title="Pendientes de Aprobación" value={stats.pendingApproval} color="info" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box>
          <Card>
            <CardHeader
              title="Actividad Reciente"
              action={
                <Button size="small" onClick={() => navigate('/services')}>
                  Ver Todo
                </Button>
              }
            />
            <Divider />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : recentServices.length > 0 ? (
              <List>
                {recentServices.map((service) => (
                  <ListItem
                    key={service.id}
                    component="div"
                    onClick={() => navigate(`/services/${service.id}`)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {statusIcons[service.status]}
                          <Typography variant="subtitle1" component="span">
                            {service.folio}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {service.fscf001_data?.serviceType || 'Sin tipo especificado'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {service.createdAt && (service.createdAt as any).toDate
                              ? new Date((service.createdAt as any).toDate()).toLocaleDateString()
                              : 'Fecha no disponible'}
                          </Typography>
                        </>
                      }
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        bgcolor: 'action.selected',
                        px: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      {service.status}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <AssignmentIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
                <Typography color="text.secondary">
                  No hay servicios recientes
                </Typography>
              </Box>
            )}
          </Card>
        </Box>
        <Box>
          <Card>
            <CardHeader title="Acciones Rápidas" />
            <Divider />
            <List>
              <ListItem component="div" onClick={() => navigate('/services/new')} sx={{ cursor: 'pointer' }}>
                <ListItemText primary="Crear Nuevo Servicio" />
              </ListItem>
              <ListItem component="div" onClick={() => navigate('/clients')} sx={{ cursor: 'pointer' }}>
                <ListItemText primary="Administrar Clientes" />
              </ListItem>
              {userRole === 'admin' && (
                <ListItem component="div" onClick={() => navigate('/admin')} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary="Configuración del Sistema" />
                </ListItem>
              )}
            </List>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
