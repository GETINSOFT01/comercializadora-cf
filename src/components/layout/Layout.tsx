import { useState } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as ServicesIcon,
  People as ClientsIcon,
  Assessment as ReportsIcon,
  Settings as AdminIcon,
  Category as CatalogsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Engineering as TechnicalVisitIcon,
  RequestQuote as QuotationsIcon,
  DownloadForOffline as InstallIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { usePWA } from '../../hooks/usePWA';

const drawerWidth = 240;

export default function Layout() {
  const theme = useTheme();
  const { userRole, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(true);
  const { isInstallable, hasUpdate, isLoading, installApp, updateApp } = usePWA();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: ['admin', 'manager', 'supervisor', 'finance'] },
    { text: 'Servicios', icon: <ServicesIcon />, path: '/services', roles: ['admin', 'manager', 'supervisor'] },
    { text: 'Visitas Técnicas', icon: <TechnicalVisitIcon />, path: '/visitas-tecnicas', roles: ['admin', 'manager', 'supervisor'] },
    { text: 'Cotizaciones', icon: <QuotationsIcon />, path: '/quotations', roles: ['admin', 'manager', 'supervisor'] },
    { text: 'Clientes', icon: <ClientsIcon />, path: '/clients', roles: ['admin', 'manager'] },
    { text: 'Reportes', icon: <ReportsIcon />, path: '/reports', roles: ['admin', 'manager', 'finance'] },
    { text: 'Catálogos', icon: <CatalogsIcon />, path: '/catalogs', roles: ['admin'] },
    { text: 'Administración', icon: <AdminIcon />, path: '/admin', roles: ['admin'] },
  ];

  // Para debugging - mostrar todos los items del menú temporalmente
  const filteredMenuItems = menuItems;

  const drawer = (
    <div style={{ width: drawerWidth, height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Comercializadora CF
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={RouterLink} 
              to={item.path}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ opacity: open ? 1 : 0 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={handleLogout}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
            }}
          >
            <ListItemText 
              primary="Cerrar sesión" 
              sx={{ opacity: open ? 1 : 0 }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && !isMobile && {
            marginLeft: `calc(${drawerWidth}px - 16px)`,
            width: `calc(100% - (${drawerWidth}px - 16px))`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{
              marginRight: 5,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Panel de Control
          </Typography>
          <Typography variant="body2">
            {userRole ? `Rol: ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}` : ''}
          </Typography>
          {!isLoading && isInstallable && (
            <Button color="inherit" startIcon={<InstallIcon />} sx={{ ml: 2 }} onClick={installApp}>
              Instalar app
            </Button>
          )}
          {!isLoading && hasUpdate && (
            <Button color="warning" startIcon={<UpdateIcon />} sx={{ ml: 1 }} onClick={updateApp}>
              Actualizar
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
        }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: open ? drawerWidth : 0,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              borderRight: 'none',
              boxShadow: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Reduce left padding to align content closer to the drawer
          pt: 3,
          pr: 0,
          pb: 3,
          pl: 0,
          // Avoid setting an explicit width to prevent horizontal overflow
          maxWidth: '100%',
          overflowX: 'hidden',
          marginTop: '64px',
          marginLeft: { sm: open ? `calc(${drawerWidth}px - 16px)` : 0 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Box sx={{ mx: 'auto', width: '100%', maxWidth: 1440, px: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
