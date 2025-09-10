import React, { lazy, type ComponentType } from 'react';

/**
 * Safe lazy import wrapper that handles loading errors gracefully
 */
function safeLazyImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Failed to load component:', error);
      if (fallback) {
        return { default: fallback };
      }
      // Return a simple error component
      const ErrorComponent: React.FC = () => (
        React.createElement('div', { style: { padding: '20px', textAlign: 'center' } },
          React.createElement('h3', null, 'Error al cargar el componente'),
          React.createElement('p', null, 'Por favor, recarga la página')
        )
      );
      return { default: ErrorComponent as T };
    }
  });
};

// Page Components - Lazy loaded
export const LoginPage = safeLazyImport(
  () => import('../pages/auth/LoginPageValidated')
);

export const LoginPageValidated = safeLazyImport(
  () => import('../pages/auth/LoginPageValidated')
);

export const DashboardPage = safeLazyImport(
  () => import('../pages/dashboard/DashboardPage')
);

export const ServicesPage = safeLazyImport(
  () => import('../pages/services/ServicesPage')
);

export const ServiceDetailPage = safeLazyImport(
  () => import('../pages/services/ServiceDetailPage')
);

export const NewServicePage = safeLazyImport(
  () => import('../pages/services/NewServicePage')
);

export const NewServicePageValidated = safeLazyImport(
  () => import('../pages/services/NewServicePageValidated')
);

export const ClientsPage = safeLazyImport(
  () => import('../pages/clients/ClientsPage')
);

export const NewClientPage = safeLazyImport(
  () => import('../pages/clients/NewClientPage')
);

export const ReportsPage = safeLazyImport(
  () => import('../pages/reports/ReportsPage')
);

export const AdminPage = safeLazyImport(
  () => import('../pages/admin/AdminPage')
);

export const NotFoundPage = safeLazyImport(
  () => import('../pages/NotFoundPage')
);

export const UnauthorizedPage = safeLazyImport(
  () => import('../pages/UnauthorizedPage')
);

// Dynamic imports for heavy utilities
export const loadPDFGenerator = () => import('jspdf');
export const loadAutoTable = () => import('jspdf-autotable');
export const loadCharts = () => import('recharts');

// Firebase utilities - lazy loaded
export const loadFirebaseStorage = () => import('firebase/storage');
export const loadFirebaseFunctions = () => import('firebase/functions');

// Form utilities
export const loadFormik = () => import('formik');
export const loadYup = () => import('yup');

// Date utilities
export const loadDateFns = () => import('date-fns');
export const loadDateFnsLocale = () => import('date-fns/locale');

// Export all lazy components for easy access
export const LazyComponents = {
  LoginPage,
  LoginPageValidated,
  DashboardPage,
  ServicesPage,
  ServiceDetailPage,
  NewServicePage,
  NewServicePageValidated,
  ClientsPage,
  NewClientPage,
  ReportsPage,
  AdminPage,
  NotFoundPage,
  UnauthorizedPage,
};

// Note: React.lazy components don't have preload functionality
// If preloading is needed, it should be implemented at the import level
export const preloadCriticalComponents = () => {
  // Preload authentication and dashboard components
  // This would need to be implemented differently if required
  console.log('Preloading critical components...');
};

export const preloadByRole = (role: string) => {
  // Role-based preloading would need custom implementation
  console.log(`Preloading components for role: ${role}`);
};