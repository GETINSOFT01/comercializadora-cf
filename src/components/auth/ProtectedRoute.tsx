import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Permission } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
  fallbackPath?: string;
  showUnauthorized?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackPath = '/login',
  showUnauthorized = false,
}: ProtectedRouteProps) {
  const { currentUser, hasRole, hasPermission, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth is being determined
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Verificando autenticación...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    if (showUnauthorized) {
      return <Navigate to="/unauthorized" replace />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      if (showUnauthorized) {
        return <Navigate to="/unauthorized" replace />;
      }
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Convenience components for common protection patterns
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRoles={['admin']} showUnauthorized>
    {children}
  </ProtectedRoute>
);

export const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRoles={['admin', 'manager']} showUnauthorized>
    {children}
  </ProtectedRoute>
);

export const SupervisorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRoles={['admin', 'manager', 'supervisor']} showUnauthorized>
    {children}
  </ProtectedRoute>
);

export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRoles={['admin', 'manager', 'supervisor', 'technician']} showUnauthorized>
    {children}
  </ProtectedRoute>
);
