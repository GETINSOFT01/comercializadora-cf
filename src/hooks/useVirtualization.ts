import { useMemo } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualizationResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  totalHeight: number;
  offsetY: number;
}

/**
 * Hook para virtualización de listas grandes, mejora el rendimiento
 * al renderizar solo los elementos visibles
 */
export function useVirtualization(
  itemCount: number,
  scrollTop: number,
  options: VirtualizationOptions
): VirtualizationResult {
  const { itemHeight, containerHeight, overscan = 5 } = options;

  return useMemo(() => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(itemCount - 1, startIndex + visibleItems + overscan * 2);
    const totalHeight = itemCount * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY,
    };
  }, [itemCount, scrollTop, itemHeight, containerHeight, overscan]);
}

/**
 * Hook para memoización inteligente de datos de tabla
 */
export function useTableMemo<T>(
  data: T[],
  dependencies: any[] = []
): T[] {
  return useMemo(() => data, [data, ...dependencies]);
}

/**
 * Hook para optimizar filtros de búsqueda
 */
export function useSearchFilter<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  return useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return String(value).toLowerCase().includes(lowercaseSearch);
      })
    );
  }, [items, searchTerm, searchFields]);
}
