// Dynamic imports for heavy components and utilities
// This approach reduces initial bundle size by loading these on demand

export const loadPDFGenerator = () => import('jspdf');
export const loadAutoTable = () => import('jspdf-autotable');

export const loadChartComponents = () => import('recharts');

export const loadDateFns = () => import('date-fns');

// Firebase storage utilities
export const loadFirebaseStorage = () => import('firebase/storage');

// Heavy MUI components that can be loaded on demand
export const loadMUIDataGrid = () => import('@mui/x-data-grid');
export const loadMUIDatePickers = () => import('@mui/x-date-pickers');

// Utility function to handle dynamic imports with error handling
export const safeImport = async <T>(importFn: () => Promise<T>): Promise<T | null> => {
  try {
    return await importFn();
  } catch (error) {
    console.error('Failed to load module:', error);
    return null;
  }
};
