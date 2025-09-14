/**
 * Utilidad para generar folios con formato CF-AAAA-WW-###
 * donde:
 * - CF: Prefijo fijo
 * - AAAA: Año (4 dígitos)
 * - WW: Número de semana del año (2 dígitos, con padding de ceros)
 * - ###: Número consecutivo por semana (3 dígitos, con padding de ceros)
 */

/**
 * Calcula el número de semana del año según ISO 8601
 * @param date Fecha para calcular la semana
 * @returns Número de semana (1-53)
 */
export function getWeekNumber(date: Date): number {
  // Crear una copia de la fecha para no modificar la original
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  
  // Establecer al jueves de esa semana (ISO 8601)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  
  // Obtener el primer día del año
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  
  // Calcular el número de semana
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Genera un folio con formato CF-AAAA-WW-###
 * @param year Año (4 dígitos)
 * @param weekNumber Número de semana (1-53)
 * @param consecutiveNumber Número consecutivo (1-999)
 * @returns Folio formateado
 */
export function generateFolio(year: number, weekNumber: number, consecutiveNumber: number): string {
  const yearStr = year.toString();
  const weekStr = weekNumber.toString().padStart(2, '0');
  const consecutiveStr = consecutiveNumber.toString().padStart(3, '0');
  
  return `CF-${yearStr}-${weekStr}-${consecutiveStr}`;
}

/**
 * Genera un folio automático basado en la fecha actual
 * @param consecutiveNumber Número consecutivo para la semana actual
 * @returns Folio formateado para la fecha actual
 */
export function generateCurrentFolio(consecutiveNumber: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const weekNumber = getWeekNumber(now);
  
  return generateFolio(year, weekNumber, consecutiveNumber);
}

/**
 * Extrae los componentes de un folio existente
 * @param folio Folio en formato CF-AAAA-WW-###
 * @returns Objeto con los componentes del folio o null si el formato es inválido
 */
export function parseFolio(folio: string): {
  year: number;
  weekNumber: number;
  consecutiveNumber: number;
} | null {
  const folioRegex = /^CF-(\d{4})-(\d{2})-(\d{3})$/;
  const match = folio.match(folioRegex);
  
  if (!match) {
    return null;
  }
  
  return {
    year: parseInt(match[1], 10),
    weekNumber: parseInt(match[2], 10),
    consecutiveNumber: parseInt(match[3], 10),
  };
}

/**
 * Valida si un folio tiene el formato correcto
 * @param folio Folio a validar
 * @returns true si el formato es válido
 */
export function isValidFolio(folio: string): boolean {
  return parseFolio(folio) !== null;
}

/**
 * Genera el prefijo de folio para una fecha específica (sin el número consecutivo)
 * @param date Fecha para generar el prefijo
 * @returns Prefijo en formato CF-AAAA-WW-
 */
export function getFolioPrefix(date: Date = new Date()): string {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  const weekStr = weekNumber.toString().padStart(2, '0');
  
  return `CF-${year}-${weekStr}-`;
}

/**
 * Obtiene el siguiente número consecutivo para la semana actual
 * Esta función debe ser usada junto con una consulta a la base de datos
 * para obtener el último folio de la semana actual
 * @param lastFolioOfWeek Último folio generado en la semana actual (opcional)
 * @returns Siguiente número consecutivo
 */
export function getNextConsecutiveNumber(lastFolioOfWeek?: string): number {
  if (!lastFolioOfWeek) {
    return 1; // Primer folio de la semana
  }
  
  const parsed = parseFolio(lastFolioOfWeek);
  if (!parsed) {
    return 1; // Si no se puede parsear, empezar desde 1
  }
  
  return parsed.consecutiveNumber + 1;
}
