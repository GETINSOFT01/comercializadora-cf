import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert, AlertTitle } from '@mui/material';
import { Refresh as RefreshIcon, Home as HomeIcon, BugReport as BugReportIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Here you would integrate with error tracking services like:
    // - Sentry
    // - LogRocket
    // - Bugsnag
    // - Firebase Crashlytics
    
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Example: Send to Firebase Analytics or external service
    console.log('Logging error to service:', errorData);
  };

  private handleRefresh = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            p: 3,
            textAlign: 'center'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%'
            }}
          >
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BugReportIcon />
                  Oops! Algo salió mal
                </Box>
              </AlertTitle>
              Ha ocurrido un error inesperado en la aplicación. Nuestro equipo ha sido notificado automáticamente.
            </Alert>

            <Typography variant="h6" gutterBottom>
              ¿Qué puedes hacer?
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
                color="primary"
              >
                Intentar de nuevo
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Ir al inicio
              </Button>
            </Box>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 4, textAlign: 'left' }}>
                <Typography variant="h6" color="error" gutterBottom>
                  Detalles del error (solo en desarrollo):
                </Typography>
                
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#f5f5f5',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    maxHeight: 300,
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="body2" color="error">
                    <strong>Error:</strong> {this.state.error.message}
                  </Typography>
                  
                  {this.state.error.stack && (
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      <strong>Stack:</strong>
                      {'\n'}{this.state.error.stack}
                    </Typography>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      <strong>Component Stack:</strong>
                      {'\n'}{this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specialized error boundaries for different contexts
export const RouteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Route Error:', error, errorInfo);
      // Could send to analytics with route context
    }}
  >
    {children}
  </ErrorBoundary>
);

export const FormErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Error en el formulario</AlertTitle>
        Ha ocurrido un error al procesar el formulario. Por favor, recarga la página e intenta de nuevo.
      </Alert>
    }
    onError={(error, errorInfo) => {
      console.error('Form Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning">
          <AlertTitle>Error al cargar gráfico</AlertTitle>
          No se pudo cargar el gráfico. Los datos pueden no estar disponibles en este momento.
        </Alert>
      </Box>
    }
    onError={(error, errorInfo) => {
      console.error('Chart Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);
