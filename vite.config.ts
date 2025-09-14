import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  build: {
    // Enable source maps for production debugging
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    // Enable minification
    minify: 'terser',
    // Optimize terser options
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Increase chunk size limit
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React ecosystem - prevent circular dependencies
          if (id.includes('react-dom')) {
            return 'react-dom-vendor';
          }
          if (id.includes('react-router')) {
            return 'react-router-vendor';
          }
          if (id.includes('react') && !id.includes('react-dom') && !id.includes('react-router')) {
            return 'react-vendor';
          }
          
          // Material-UI
          if (id.includes('@mui/material')) {
            return 'mui-core';
          }
          if (id.includes('@mui/icons-material')) {
            return 'mui-icons';
          }
          if (id.includes('@mui/x-date-pickers')) {
            return 'mui-pickers';
          }
          
          // Firebase
          if (id.includes('firebase')) {
            return 'firebase-vendor';
          }
          
          // Charts
          if (id.includes('recharts')) {
            return 'chart-vendor';
          }
          
          // PDF generation
          if (id.includes('jspdf')) {
            return 'pdf-vendor';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }
          
          // Other utilities
          if (id.includes('notistack')) {
            return 'notification-vendor';
          }
          
          // Node modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
      // External dependencies (if using CDN)
      external: [],
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'es-toolkit/compat/get',
    ],
    exclude: [
      // Exclude heavy dependencies from pre-bundling
      'jspdf',
      'jspdf-autotable',
    ],
  },
  // Resolve alias for es-toolkit compatibility
  resolve: {
    alias: {
      'es-toolkit/compat/get': 'es-toolkit/compat',
    },
  },
  // Server configuration for development
  server: {
    // Optimize HMR
    hmr: {
      overlay: false,
    },
  },
})
