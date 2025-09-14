/**
 * Firestore Error Handler Utility
 * Handles common Firestore errors including BloomFilter issues
 */

import { FirestoreError } from 'firebase/firestore';

export interface FirestoreErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  shouldRetry: boolean;
  retryDelay?: number;
}

/**
 * Maps Firestore errors to user-friendly messages and retry strategies
 */
export const handleFirestoreError = (error: any): FirestoreErrorInfo => {
  // Handle BloomFilter errors specifically
  if (error.name === 'BloomFilterError' || error.message?.includes('BloomFilter')) {
    console.warn('🔄 BloomFilter error detected - this is a known Firebase issue and can be safely ignored');
    return {
      code: 'bloom-filter-error',
      message: 'BloomFilter error (non-critical)',
      userMessage: 'Conexión optimizada automáticamente',
      shouldRetry: false, // Don't retry BloomFilter errors
    };
  }

  // Handle standard Firestore errors
  if (error instanceof FirestoreError || error.code) {
    switch (error.code) {
      case 'permission-denied':
        return {
          code: error.code,
          message: error.message,
          userMessage: 'No tienes permisos para realizar esta acción',
          shouldRetry: false,
        };

      case 'unavailable':
        return {
          code: error.code,
          message: error.message,
          userMessage: 'Servicio temporalmente no disponible',
          shouldRetry: true,
          retryDelay: 2000,
        };

      case 'deadline-exceeded':
        return {
          code: error.code,
          message: error.message,
          userMessage: 'La operación tardó demasiado tiempo',
          shouldRetry: true,
          retryDelay: 1000,
        };

      case 'resource-exhausted':
        return {
          code: error.code,
          message: error.message,
          userMessage: 'Límite de operaciones excedido, intenta más tarde',
          shouldRetry: true,
          retryDelay: 5000,
        };

      case 'not-found':
        return {
          code: error.code,
          message: error.message,
          userMessage: 'El documento solicitado no existe',
          shouldRetry: false,
        };

      case 'already-exists':
        return {
          code: error.code,
          message: error.message,
          userMessage: 'El documento ya existe',
          shouldRetry: false,
        };

      case 'cancelled':
        return {
          code: error.code,
          message: error.message,
          userMessage: 'Operación cancelada',
          shouldRetry: true,
          retryDelay: 500,
        };

      default:
        return {
          code: error.code || 'unknown',
          message: error.message || 'Unknown error',
          userMessage: 'Error inesperado en la base de datos',
          shouldRetry: true,
          retryDelay: 1000,
        };
    }
  }

  // Handle network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return {
      code: 'network-error',
      message: error.message,
      userMessage: 'Error de conexión a internet',
      shouldRetry: true,
      retryDelay: 2000,
    };
  }

  // Generic error fallback
  return {
    code: 'unknown',
    message: error.message || 'Unknown error',
    userMessage: 'Error inesperado',
    shouldRetry: false,
  };
};

/**
 * Retry wrapper for Firestore operations
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorInfo = handleFirestoreError(error);

      // Don't retry if error shouldn't be retried or it's the last attempt
      if (!errorInfo.shouldRetry || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = errorInfo.retryDelay || baseDelay * Math.pow(2, attempt);
      console.warn(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`, errorInfo.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Suppress BloomFilter error logs in console
 */
export const suppressBloomFilterLogs = () => {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('BloomFilter') || message.includes('BloomFilterError')) {
      // Silently ignore BloomFilter warnings
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('BloomFilter') || message.includes('BloomFilterError')) {
      // Silently ignore BloomFilter errors
      return;
    }
    originalError.apply(console, args);
  };
};

/**
 * Initialize error handling for the application
 */
export const initializeErrorHandling = () => {
  // Suppress BloomFilter logs
  suppressBloomFilterLogs();

  // Global error handler for unhandled Firebase errors
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorInfo = handleFirestoreError(error);
    
    if (errorInfo.code === 'bloom-filter-error') {
      // Prevent BloomFilter errors from showing in console
      event.preventDefault();
    }
  });

  console.log('🛡️ Firestore error handling initialized');
};
