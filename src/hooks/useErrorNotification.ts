import { useSnackbar, type VariantType } from 'notistack';
import { useCallback } from 'react';

export interface ErrorNotificationOptions {
  variant?: VariantType;
  persist?: boolean;
  preventDuplicate?: boolean;
  autoHideDuration?: number;
  action?: React.ReactNode;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorDetails {
  code?: string;
  message: string;
  details?: ValidationError[];
  timestamp?: Date;
  context?: Record<string, any>;
}

export const useErrorNotification = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const showError = useCallback((
    error: string | Error | ErrorDetails,
    options: ErrorNotificationOptions = {}
  ) => {
    const {
      variant = 'error',
      persist = false,
      preventDuplicate = true,
      autoHideDuration = 6000,
      action,
    } = options;

    let message: string;
    let details: ValidationError[] | undefined;

    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = error.message;
      details = error.details;
    }

    // Show main error message
    const snackbarKey = enqueueSnackbar(message, {
      variant,
      persist,
      preventDuplicate,
      autoHideDuration: persist ? undefined : autoHideDuration,
      action,
    });

    // Show validation details if available
    if (details && details.length > 0) {
      details.forEach((detail, index) => {
        setTimeout(() => {
          enqueueSnackbar(`${detail.field}: ${detail.message}`, {
            variant: 'warning',
            autoHideDuration: 4000,
            preventDuplicate: true,
          });
        }, index * 500); // Stagger the notifications
      });
    }

    return snackbarKey;
  }, [enqueueSnackbar]);

  const showSuccess = useCallback((
    message: string,
    options: Omit<ErrorNotificationOptions, 'variant'> = {}
  ) => {
    return enqueueSnackbar(message, {
      variant: 'success',
      autoHideDuration: 4000,
      preventDuplicate: true,
      ...options,
    });
  }, [enqueueSnackbar]);

  const showWarning = useCallback((
    message: string,
    options: Omit<ErrorNotificationOptions, 'variant'> = {}
  ) => {
    return enqueueSnackbar(message, {
      variant: 'warning',
      autoHideDuration: 5000,
      preventDuplicate: true,
      ...options,
    });
  }, [enqueueSnackbar]);

  const showInfo = useCallback((
    message: string,
    options: Omit<ErrorNotificationOptions, 'variant'> = {}
  ) => {
    return enqueueSnackbar(message, {
      variant: 'info',
      autoHideDuration: 4000,
      preventDuplicate: true,
      ...options,
    });
  }, [enqueueSnackbar]);

  const showValidationErrors = useCallback((
    errors: ValidationError[],
    title: string = 'Errores de validación'
  ) => {
    // Show main title
    enqueueSnackbar(title, {
      variant: 'error',
      autoHideDuration: 3000,
    });

    // Show each validation error
    errors.forEach((error, index) => {
      setTimeout(() => {
        enqueueSnackbar(`${error.field}: ${error.message}`, {
          variant: 'warning',
          autoHideDuration: 4000,
          preventDuplicate: true,
        });
      }, (index + 1) * 300);
    });
  }, [enqueueSnackbar]);

  const showFirebaseError = useCallback((
    error: any,
    context: string = 'Operación'
  ) => {
    let message = `Error en ${context}`;
    
    if (error?.code) {
      switch (error.code) {
        case 'permission-denied':
          message = 'No tienes permisos para realizar esta acción';
          break;
        case 'not-found':
          message = 'El recurso solicitado no fue encontrado';
          break;
        case 'already-exists':
          message = 'El recurso ya existe';
          break;
        case 'invalid-argument':
          message = 'Los datos proporcionados son inválidos';
          break;
        case 'unauthenticated':
          message = 'Debes iniciar sesión para continuar';
          break;
        case 'unavailable':
          message = 'Servicio temporalmente no disponible';
          break;
        case 'deadline-exceeded':
          message = 'La operación tardó demasiado tiempo';
          break;
        default:
          message = error.message || message;
      }
    } else if (error?.message) {
      message = error.message;
    }

    return showError(message, { persist: false });
  }, [showError]);

  const showNetworkError = useCallback(() => {
    return showError('Error de conexión. Verifica tu conexión a internet.', {
      variant: 'error',
      persist: true,
    });
  }, [showError]);

  const dismiss = useCallback((key?: string | number) => {
    if (key) {
      closeSnackbar(key);
    } else {
      closeSnackbar();
    }
  }, [closeSnackbar]);

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showValidationErrors,
    showFirebaseError,
    showNetworkError,
    dismiss,
  };
};
