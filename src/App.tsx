import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

// Contexts
import { AuthProvider } from './contexts/AuthContext';

// Theme
import theme from './theme/index';

// PWA Components
import PWAInstallPrompt from './components/pwa/PWAInstallPrompt';
import OfflineIndicator from './components/pwa/OfflineIndicator';

// Lazy loaded pages
import { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import {
  LoginPage,
  DashboardPage,
  ServicesPage,
  ServiceDetailPage,
  NewServicePage,
  ClientsPage,
  ReportsPage,
  AdminPage,
  NotFoundPage,
  UnauthorizedPage,
} from './utils/lazyImports';

// Loading component
const PageLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Cargando...
    </Typography>
  </Box>
);

// Components
import Layout from './components/layout/Layout';
import ProtectedRoute, { AdminRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <SnackbarProvider maxSnack={3}>
          <AuthProvider>
            <CssBaseline />
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="services" element={<ServicesPage />} />
                    <Route path="services/new" element={<NewServicePage />} />
                    <Route path="services/:id" element={<ServiceDetailPage />} />
                    <Route path="clients" element={<ClientsPage />} />
                    <Route 
                      path="reports" 
                      element={
                        <ProtectedRoute requiredRoles={['admin', 'manager', 'finance']} showUnauthorized>
                          <ReportsPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="admin" 
                      element={
                        <AdminRoute>
                          <AdminPage />
                        </AdminRoute>
                      } 
                    />
                  </Route>
                  
                  {/* 404 Not Found */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Router>
            
            {/* PWA Components */}
            <PWAInstallPrompt />
            <OfflineIndicator />
          </AuthProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
