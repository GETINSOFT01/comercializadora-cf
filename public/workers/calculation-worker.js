// Web Worker para cálculos pesados
// Este worker maneja operaciones que podrían bloquear el hilo principal

self.onmessage = function(e) {
  const { type, data, id } = e.data;

  try {
    let result;

    switch (type) {
      case 'CALCULATE_REPORT_TOTALS':
        result = calculateReportTotals(data);
        break;
      
      case 'PROCESS_LARGE_DATASET':
        result = processLargeDataset(data);
        break;
      
      case 'GENERATE_STATISTICS':
        result = generateStatistics(data);
        break;
      
      case 'SORT_LARGE_ARRAY':
        result = sortLargeArray(data);
        break;
      
      case 'FILTER_AND_SEARCH':
        result = filterAndSearch(data);
        break;
      
      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }

    // Enviar resultado de vuelta al hilo principal
    self.postMessage({
      id,
      type: 'SUCCESS',
      result
    });

  } catch (error) {
    // Enviar error de vuelta al hilo principal
    self.postMessage({
      id,
      type: 'ERROR',
      error: error.message
    });
  }
};

// Función para calcular totales de reportes
function calculateReportTotals(data) {
  const { services, clients, dateRange } = data;
  
  const totals = {
    totalServices: 0,
    totalRevenue: 0,
    averageServiceValue: 0,
    clientsServed: new Set(),
    servicesByStatus: {},
    revenueByMonth: {},
    topClients: [],
  };

  // Procesar servicios
  services.forEach(service => {
    if (isInDateRange(service.date, dateRange)) {
      totals.totalServices++;
      totals.totalRevenue += service.amount || 0;
      totals.clientsServed.add(service.clientId);
      
      // Contar por status
      totals.servicesByStatus[service.status] = 
        (totals.servicesByStatus[service.status] || 0) + 1;
      
      // Agrupar por mes
      const month = new Date(service.date).toISOString().slice(0, 7);
      totals.revenueByMonth[month] = 
        (totals.revenueByMonth[month] || 0) + (service.amount || 0);
    }
  });

  // Calcular promedio
  totals.averageServiceValue = totals.totalServices > 0 
    ? totals.totalRevenue / totals.totalServices 
    : 0;

  // Convertir Set a número
  totals.clientsServed = totals.clientsServed.size;

  // Calcular top clientes
  const clientRevenue = {};
  services.forEach(service => {
    if (isInDateRange(service.date, dateRange)) {
      clientRevenue[service.clientId] = 
        (clientRevenue[service.clientId] || 0) + (service.amount || 0);
    }
  });

  totals.topClients = Object.entries(clientRevenue)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([clientId, revenue]) => ({
      clientId,
      revenue,
      clientName: clients.find(c => c.id === clientId)?.name || 'Desconocido'
    }));

  return totals;
}

// Función para procesar datasets grandes
function processLargeDataset(data) {
  const { items, operations } = data;
  let processedItems = [...items];

  operations.forEach(operation => {
    switch (operation.type) {
      case 'FILTER':
        processedItems = processedItems.filter(item => 
          evaluateFilter(item, operation.criteria)
        );
        break;
      
      case 'SORT':
        processedItems.sort((a, b) => {
          const aVal = getNestedValue(a, operation.field);
          const bVal = getNestedValue(b, operation.field);
          return operation.direction === 'desc' ? bVal - aVal : aVal - bVal;
        });
        break;
      
      case 'GROUP':
        processedItems = groupBy(processedItems, operation.field);
        break;
      
      case 'AGGREGATE':
        processedItems = aggregate(processedItems, operation.functions);
        break;
    }
  });

  return processedItems;
}

// Función para generar estadísticas
function generateStatistics(data) {
  const { values, type } = data;
  
  if (!Array.isArray(values) || values.length === 0) {
    return { error: 'No hay datos para procesar' };
  }

  const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
  
  if (numericValues.length === 0) {
    return { error: 'No hay valores numéricos válidos' };
  }

  const sorted = [...numericValues].sort((a, b) => a - b);
  const sum = numericValues.reduce((acc, val) => acc + val, 0);
  const mean = sum / numericValues.length;
  
  const variance = numericValues.reduce((acc, val) => 
    acc + Math.pow(val - mean, 2), 0) / numericValues.length;
  
  const standardDeviation = Math.sqrt(variance);
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  return {
    count: numericValues.length,
    sum,
    mean,
    median,
    mode: calculateMode(numericValues),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
    variance,
    standardDeviation,
    q1,
    q3,
    iqr: q3 - q1,
    outliers: findOutliers(sorted, q1, q3)
  };
}

// Función para ordenar arrays grandes
function sortLargeArray(data) {
  const { array, sortBy, direction = 'asc' } = data;
  
  return array.sort((a, b) => {
    let aVal = sortBy ? getNestedValue(a, sortBy) : a;
    let bVal = sortBy ? getNestedValue(b, sortBy) : b;
    
    // Manejar diferentes tipos de datos
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Función para filtrar y buscar
function filterAndSearch(data) {
  const { items, searchTerm, filters, searchFields } = data;
  
  let filteredItems = [...items];
  
  // Aplicar filtros
  if (filters && Object.keys(filters).length > 0) {
    filteredItems = filteredItems.filter(item => {
      return Object.entries(filters).every(([field, value]) => {
        const itemValue = getNestedValue(item, field);
        return itemValue === value || 
               (Array.isArray(value) && value.includes(itemValue));
      });
    });
  }
  
  // Aplicar búsqueda de texto
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    filteredItems = filteredItems.filter(item => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some(field => {
          const value = getNestedValue(item, field);
          return value && value.toString().toLowerCase().includes(term);
        });
      } else {
        // Buscar en todos los campos string del objeto
        return Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(term)
        );
      }
    });
  }
  
  return filteredItems;
}

// Funciones auxiliares
function isInDateRange(date, range) {
  if (!range || (!range.start && !range.end)) return true;
  
  const itemDate = new Date(date);
  const startDate = range.start ? new Date(range.start) : new Date('1900-01-01');
  const endDate = range.end ? new Date(range.end) : new Date('2100-12-31');
  
  return itemDate >= startDate && itemDate <= endDate;
}

function evaluateFilter(item, criteria) {
  return Object.entries(criteria).every(([field, condition]) => {
    const value = getNestedValue(item, field);
    
    if (typeof condition === 'object' && condition !== null) {
      if (condition.operator === 'gt') return value > condition.value;
      if (condition.operator === 'lt') return value < condition.value;
      if (condition.operator === 'gte') return value >= condition.value;
      if (condition.operator === 'lte') return value <= condition.value;
      if (condition.operator === 'eq') return value === condition.value;
      if (condition.operator === 'ne') return value !== condition.value;
      if (condition.operator === 'in') return condition.value.includes(value);
      if (condition.operator === 'contains') return value && value.toString().toLowerCase().includes(condition.value.toLowerCase());
    }
    
    return value === condition;
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function groupBy(array, field) {
  return array.reduce((groups, item) => {
    const key = getNestedValue(item, field);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

function aggregate(items, functions) {
  const result = {};
  
  functions.forEach(func => {
    const { field, operation, alias } = func;
    const values = items.map(item => getNestedValue(item, field)).filter(v => v != null);
    const key = alias || `${operation}_${field}`;
    
    switch (operation) {
      case 'sum':
        result[key] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
        break;
      case 'avg':
        result[key] = values.length > 0 ? 
          values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length : 0;
        break;
      case 'count':
        result[key] = values.length;
        break;
      case 'min':
        result[key] = Math.min(...values.map(Number));
        break;
      case 'max':
        result[key] = Math.max(...values.map(Number));
        break;
    }
  });
  
  return result;
}

function calculateMode(values) {
  const frequency = {};
  let maxFreq = 0;
  let modes = [];
  
  values.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
    if (frequency[value] > maxFreq) {
      maxFreq = frequency[value];
      modes = [value];
    } else if (frequency[value] === maxFreq && !modes.includes(value)) {
      modes.push(value);
    }
  });
  
  return modes.length === values.length ? null : modes;
}

function findOutliers(sorted, q1, q3) {
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return sorted.filter(value => value < lowerBound || value > upperBound);
}
