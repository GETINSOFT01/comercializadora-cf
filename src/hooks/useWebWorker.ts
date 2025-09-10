import { useCallback, useRef, useEffect } from 'react';

interface WorkerMessage {
  id: string;
  type: string;
  data: any;
}

interface WorkerResponse {
  id: string;
  type: 'SUCCESS' | 'ERROR';
  result?: any;
  error?: string;
}

interface UseWebWorkerOptions {
  workerPath: string;
  onError?: (error: Error) => void;
}

export const useWebWorker = ({ workerPath, onError }: UseWebWorkerOptions) => {
  const workerRef = useRef<Worker | null>(null);
  const pendingCallbacks = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());

  // Inicializar worker
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        workerRef.current = new Worker(workerPath);
        
        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { id, type, result, error } = event.data;
          const callbacks = pendingCallbacks.current.get(id);
          
          if (callbacks) {
            if (type === 'SUCCESS') {
              callbacks.resolve(result);
            } else if (type === 'ERROR') {
              callbacks.reject(new Error(error || 'Worker error'));
            }
            pendingCallbacks.current.delete(id);
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error);
          onError?.(new Error('Worker execution error'));
        };

      } catch (error) {
        console.error('Failed to create worker:', error);
        onError?.(error as Error);
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingCallbacks.current.clear();
    };
  }, [workerPath, onError]);

  // Función para ejecutar tareas en el worker
  const execute = useCallback(<T = any>(type: string, data: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      pendingCallbacks.current.set(id, { resolve, reject });

      const message: WorkerMessage = { id, type, data };
      workerRef.current.postMessage(message);

      // Timeout para evitar promesas colgadas
      setTimeout(() => {
        if (pendingCallbacks.current.has(id)) {
          pendingCallbacks.current.delete(id);
          reject(new Error('Worker timeout'));
        }
      }, 30000); // 30 segundos timeout
    });
  }, []);

  // Verificar si el worker está disponible
  const isAvailable = useCallback(() => {
    return typeof Worker !== 'undefined' && workerRef.current !== null;
  }, []);

  return {
    execute,
    isAvailable,
  };
};

// Hook específico para cálculos
export const useCalculationWorker = () => {
  const { execute, isAvailable } = useWebWorker({
    workerPath: '/workers/calculation-worker.js',
    onError: (error) => {
      console.error('Calculation worker error:', error);
    },
  });

  const calculateReportTotals = useCallback(
    (services: any[], clients: any[], dateRange?: { start?: string; end?: string }) => {
      return execute('CALCULATE_REPORT_TOTALS', { services, clients, dateRange });
    },
    [execute]
  );

  const processLargeDataset = useCallback(
    (items: any[], operations: any[]) => {
      return execute('PROCESS_LARGE_DATASET', { items, operations });
    },
    [execute]
  );

  const generateStatistics = useCallback(
    (values: number[], type?: string) => {
      return execute('GENERATE_STATISTICS', { values, type });
    },
    [execute]
  );

  const sortLargeArray = useCallback(
    (array: any[], sortBy?: string, direction: 'asc' | 'desc' = 'asc') => {
      return execute('SORT_LARGE_ARRAY', { array, sortBy, direction });
    },
    [execute]
  );

  const filterAndSearch = useCallback(
    (items: any[], searchTerm?: string, filters?: Record<string, any>, searchFields?: string[]) => {
      return execute('FILTER_AND_SEARCH', { items, searchTerm, filters, searchFields });
    },
    [execute]
  );

  return {
    calculateReportTotals,
    processLargeDataset,
    generateStatistics,
    sortLargeArray,
    filterAndSearch,
    isAvailable,
  };
};
