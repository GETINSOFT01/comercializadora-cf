import { useState, useCallback } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getFolioPrefix, parseFolio } from '../utils/folioGenerator';

interface UseFolioGeneratorReturn {
  generateNewFolio: () => Promise<string>;
  isGenerating: boolean;
  error: string | null;
  validateFolio: (folio: string) => boolean;
  getCurrentWeekPrefix: () => string;
}

/**
 * Hook personalizado para la generación y gestión de folios
 * Maneja la lógica de generación automática con números consecutivos únicos
 */
export function useFolioGenerator(): UseFolioGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Genera un nuevo folio único para la semana actual
   */
  const generateNewFolio = useCallback(async (): Promise<string> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Usar una transacción con contador semanal para garantizar unicidad evitando condiciones de carrera
      const folio = await runTransaction(db, async (transaction) => {
        // Clave del contador semanal: 'CF-AAAA-WW' (sin el último guion)
        const prefix = getFolioPrefix(); // CF-AAAA-WW-
        const prefixKey = prefix.slice(0, -1); // CF-AAAA-WW
        const counterRef = doc(db, 'folios_weeks', prefixKey);
        const snap = await transaction.get(counterRef);

        let next = 1;
        if (snap.exists()) {
          const data = snap.data() as { current?: number };
          next = (data.current || 0) + 1;
          transaction.update(counterRef, { current: next, updatedAt: new Date(), prefix: prefixKey });
        } else {
          transaction.set(counterRef, { current: next, createdAt: new Date(), updatedAt: new Date(), prefix: prefixKey });
        }

        // Formatear folio final CF-AAAA-WW-###
        const consecutiveStr = next.toString().padStart(3, '0');
        return `${prefix}${consecutiveStr}`;
      });

      return folio;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al generar folio';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Valida el formato de un folio
   */
  const validateFolio = useCallback((folio: string): boolean => {
    const parsed = parseFolio(folio);
    return parsed !== null;
  }, []);

  /**
   * Obtiene el prefijo de la semana actual
   */
  const getCurrentWeekPrefix = useCallback((): string => {
    return getFolioPrefix();
  }, []);

  return {
    generateNewFolio,
    isGenerating,
    error,
    validateFolio,
    getCurrentWeekPrefix
  };
}
