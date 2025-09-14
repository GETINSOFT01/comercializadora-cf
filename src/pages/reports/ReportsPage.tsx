import { useEffect, useMemo, useState } from 'react';
import { 
  Box, Card, CardContent, CardHeader, Typography, Tabs, Tab, Stack, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Autocomplete, TablePagination, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, FormControlLabel, Switch, FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [tab, setTab] = useState<number>(0);

  // Servicios por estado (segunda pestaña) - removido; no se usa actualmente

  // Resumen RAD (primera pestaña)
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [services, setServices] = useState<Array<{ id: string; folio?: string; clientName?: string; clientId?: string }>>([]);
  const [selectedService, setSelectedService] = useState<{ id: string; folio?: string; clientName?: string; clientId?: string } | null>(null);
  const [loadingRad, setLoadingRad] = useState(false);
  const [radRows, setRadRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [exportOnlyVisible, setExportOnlyVisible] = useState(false);
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  // Contenedor de gráfico removido (no se renderiza gráfico en pantalla)

  const PREF_KEY = 'reports_filters_v1';

  // Load initial filters from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.startDateISO) setStartDate(new Date(p.startDateISO));
        if (p.endDateISO) setEndDate(new Date(p.endDateISO));
        if (typeof p.serviceFilter === 'string') setServiceFilter(p.serviceFilter);
        if (typeof p.selectedClientId === 'string') setPendingClientId(p.selectedClientId);
        if (typeof p.selectedServiceId === 'string') setPendingServiceId(p.selectedServiceId);
        if (typeof p.rowsPerPage === 'number' && p.rowsPerPage > 0) setRowsPerPage(p.rowsPerPage);
        if (typeof p.decimalPlaces === 'number') setDecimalPlaces(p.decimalPlaces);
      }
    } catch {}
  }, []);

  const loadRAD = async () => {
    if (!startDate || !endDate) return;
    setLoadingRad(true);
    try {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      let q = query(
        collection(db, 'daily_reports'),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'asc')
      );
      // Nota: si Firestore requiere índice para combinar serviceId, se puede filtrar en cliente
      const snap = await getDocs(q);
      let rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      // Filtro por servicio seleccionado o texto parcial
      if (selectedService?.id) {
        rows = rows.filter(r => (r.serviceId || '') === selectedService.id);
      } else if (serviceFilter.trim()) {
        rows = rows.filter(r => (r.serviceId || '').toLowerCase().includes(serviceFilter.trim().toLowerCase()));
      }
      // Filtro por cliente seleccionado (si no se seleccionó servicio específico)
      if (selectedClient?.id && !selectedService?.id) {
        const svcById = new Map(services.map(s => [s.id, s] as const));
        rows = rows.filter(r => {
          const svc = svcById.get(r.serviceId);
          return svc?.clientId === selectedClient.id;
        });
      }
      setRadRows(rows);
    } finally {
      setLoadingRad(false);
    }
    // Save current filters to localStorage
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        startDateISO: startDate?.toISOString() || null,
        endDateISO: endDate?.toISOString() || null,
        selectedClientId: selectedClient?.id || null,
        selectedServiceId: selectedService?.id || null,
        serviceFilter,
        rowsPerPage,
        decimalPlaces,
      }));
    } catch {}
  };

  // Clear all filters to defaults and reload
  const clearFilters = () => {
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 7);
    dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date();
    dEnd.setHours(23, 59, 59, 999);

    setStartDate(dStart);
    setEndDate(dEnd);
    setSelectedClient(null);
    setSelectedService(null);
    setServiceFilter('');
    setPendingClientId(null);
    setPendingServiceId(null);
    setPage(0);
    try {
      localStorage.removeItem(PREF_KEY);
    } catch {}
    // reload after state updates
    setTimeout(() => {
      loadRAD();
    }, 0);
  };

  useEffect(() => {
    loadRAD();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resumen semanal para gráfico removido

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return radRows.slice(start, start + rowsPerPage);
  }, [radRows, page, rowsPerPage]);

  // Active filters counter (dates different than default window + client + service + text)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    const defStart = new Date(); defStart.setDate(defStart.getDate() - 7); defStart.setHours(0,0,0,0);
    const defEnd = new Date(); defEnd.setHours(0,0,0,0);
    if (startDate && endDate) {
      const s = new Date(startDate); s.setHours(0,0,0,0);
      const e = new Date(endDate); e.setHours(0,0,0,0);
      if (s.getTime() !== defStart.getTime() || e.getTime() !== defEnd.getTime()) count++;
    }
    if (selectedClient) count++;
    if (selectedService) count++;
    if (serviceFilter.trim()) count++;
    return count;
  }, [startDate, endDate, selectedClient, selectedService, serviceFilter]);

  // Cargar clientes y servicios para filtros y display
  useEffect(() => {
    const loadAll = async () => {
      const [svcSnap, cliSnap] = await Promise.all([
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'clients')),
      ]);
      const clientsArr = cliSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name || 'Cliente' }));
      setClients(clientsArr);
      const arr = svcSnap.docs.map(d => {
        const data: any = d.data();
        return { id: d.id, folio: data.folio || '', clientName: data.clientName || data.client?.name || '', clientId: data.clientId || data.client?.id || '' };
      });
      setServices(arr);
      // Restore pending selections if present
      if (pendingClientId) {
        const c = clientsArr.find(x => x.id === pendingClientId) || null;
        setSelectedClient(c);
      }
      if (pendingServiceId) {
        const s = arr.find(x => x.id === pendingServiceId) || null;
        setSelectedService(s as any);
      }
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingClientId, pendingServiceId]);

  const serviceLabel = (id?: string) => {
    if (!id) return '';
    const s = services.find(x => x.id === id);
    if (!s) return id;
    return `${s.folio || id}${s.clientName ? ' • ' + s.clientName : ''}`;
  };

  const radKpis = useMemo(() => {
    let hectares = 0, hours = 0, fuel = 0, fertilizer = 0;
    for (const r of radRows) {
      hectares += Number(r?.progress?.hectares || 0);
      hours += Number(r?.progress?.hours || 0);
      fuel += Number(r?.consumables?.fuel || 0);
      fertilizer += Number(r?.consumables?.fertilizer || 0);
    }
    // Promedios por día en el rango seleccionado (inclusive)
    let avgHectaresPerDay = 0, avgHoursPerDay = 0;
    if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(0,0,0,0);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1);
      avgHectaresPerDay = hectares / days;
      avgHoursPerDay = hours / days;
    }
    return { hectares, hours, fuel, fertilizer, avgHectaresPerDay, avgHoursPerDay };
  }, [radRows, startDate, endDate]);

  const exportRadCSV = () => {
    const headers = ['RAD','Servicio (folio • cliente)','Fecha','Hectáreas','Horas','Combustible','Fertilizante','Incidentes','Evidencias'];
    const source = exportOnlyVisible ? pagedRows : radRows;
    const { range, clientStr, serviceStr, exportCount } = buildSummary();
    const rows = source.map(r => {
      const d = r.date?.toDate?.() ? new Date(r.date.toDate()) : (r.date ? new Date(r.date) : null);
      return [
        r.id,
        serviceLabel(r.serviceId) || '',
        d ? d.toLocaleDateString('es-MX') : '',
        fmt(Number(r?.progress?.hectares || 0)),
        fmt(Number(r?.progress?.hours || 0)),
        fmt(Number(r?.consumables?.fuel || 0)),
        fmt(Number(r?.consumables?.fertilizer || 0)),
        (r.incidents || '').replace(/\n/g, ' '),
        fmt(Array.isArray(r.evidenceURLs) ? r.evidenceURLs.length : 0)
      ].join(',');
    });
    const preface = [
      '# Resumen RAD',
      `# Rango: ${range}`,
      `# Cliente: ${clientStr}`,
      `# Servicio: ${serviceStr}`,
      `# Registros exportados: ${exportCount}`,
      '#',
    ].join('\n');
    const csv = [preface, headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `resumen_rad.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportRadPDF = async () => {
    const docPdf = new jsPDF();
    docPdf.text('Resumen RAD', 14, 14);
    const source = exportOnlyVisible ? pagedRows : radRows;
    // Summary block under title
    const { range, clientStr, serviceStr, exportCount } = buildSummary();
    docPdf.setFontSize(10);
    docPdf.text(`Rango: ${range}`, 14, 20);
    docPdf.text(`Cliente: ${clientStr}`, 80, 20);
    docPdf.text(`Servicio: ${serviceStr}`, 14, 26);
    docPdf.text(`Registros: ${exportCount}`, 80, 26);
    const body = source.map(r => {
      const d = r.date?.toDate?.() ? new Date(r.date.toDate()) : (r.date ? new Date(r.date) : null);
      return [
        r.id,
        serviceLabel(r.serviceId) || '',
        d ? d.toLocaleDateString('es-MX') : '',
        fmt(Number(r?.progress?.hectares || 0)),
        fmt(Number(r?.progress?.hours || 0)),
        fmt(Number(r?.consumables?.fuel || 0)),
        fmt(Number(r?.consumables?.fertilizer || 0)),
        (r.incidents || '').slice(0,60),
        fmt(Array.isArray(r.evidenceURLs) ? r.evidenceURLs.length : 0)
      ];
    });
    autoTable(docPdf, {
      head: [['RAD','Servicio (folio • cliente)','Fecha','Hectáreas','Horas','Combustible','Fertilizante','Incidentes','Evidencias']],
      body,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25,118,210] },
      didDrawPage: (data) => {
        const pageSize = docPdf.internal.pageSize;
        const pageWidth = pageSize.getWidth ? pageSize.getWidth() : (pageSize as any).width;
        const pageHeight = pageSize.getHeight ? pageSize.getHeight() : (pageSize as any).height;
        const gen = new Date().toLocaleString('es-MX');
        docPdf.setFontSize(8);
        docPdf.setTextColor(100);
        docPdf.text(`Generado: ${gen}`, 14, pageHeight - 6);
        const pageStr = `${data.pageNumber}/${docPdf.getNumberOfPages()}`;
        docPdf.text(pageStr, pageWidth - 14, pageHeight - 6, { align: 'right' } as any);
        docPdf.setTextColor(0);
      },
    });
    // Insert KPIs (sin gráfico)
    let y = (docPdf as any).lastAutoTable?.finalY ? (docPdf as any).lastAutoTable.finalY + 8 : 28;
    docPdf.setFontSize(10);
    docPdf.text(`Totales: Hectáreas ${fmt(radKpis.hectares)} • Horas ${fmt(radKpis.hours)} • Combustible ${fmt(radKpis.fuel)} • Fertilizante ${fmt(radKpis.fertilizer)}`, 14, y);
    y += 6;
    docPdf.text(`Promedios (por día): Hectáreas ${fmt(radKpis.avgHectaresPerDay)} • Horas ${fmt(radKpis.avgHoursPerDay)}`, 14, y);
    docPdf.save('resumen_rad.pdf');
  };

  // Export only current page (CSV)
  const exportRadCSVPage = () => {
    const headers = ['RAD','Servicio (folio • cliente)','Fecha','Hectáreas','Horas','Combustible','Fertilizante','Incidentes','Evidencias'];
    const rows = pagedRows.map(r => {
      const d = r.date?.toDate?.() ? new Date(r.date.toDate()) : (r.date ? new Date(r.date) : null);
      return [
        r.id,
        serviceLabel(r.serviceId) || '',
        d ? d.toLocaleDateString('es-MX') : '',
        fmt(Number(r?.progress?.hectares || 0)),
        fmt(Number(r?.progress?.hours || 0)),
        fmt(Number(r?.consumables?.fuel || 0)),
        fmt(Number(r?.consumables?.fertilizer || 0)),
        (r.incidents || '').replace(/\n/g, ' '),
        fmt(Array.isArray(r.evidenceURLs) ? r.evidenceURLs.length : 0)
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `resumen_rad_pagina.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export only current page (PDF)
  const exportRadPDFPage = () => {
    const docPdf = new jsPDF();
    docPdf.text('Resumen RAD (Página actual)', 14, 14);
    const body = pagedRows.map(r => {
      const d = r.date?.toDate?.() ? new Date(r.date.toDate()) : (r.date ? new Date(r.date) : null);
      return [
        r.id,
        serviceLabel(r.serviceId) || '',
        d ? d.toLocaleDateString('es-MX') : '',
        fmt(Number(r?.progress?.hectares || 0)),
        fmt(Number(r?.progress?.hours || 0)),
        fmt(Number(r?.consumables?.fuel || 0)),
        fmt(Number(r?.consumables?.fertilizer || 0)),
        (r.incidents || '').slice(0,60),
        fmt(Array.isArray(r.evidenceURLs) ? r.evidenceURLs.length : 0)
      ];
    });
    autoTable(docPdf, {
      head: [['RAD','Servicio (folio • cliente)','Fecha','Hectáreas','Horas','Combustible','Fertilizante','Incidentes','Evidencias']],
      body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [25,118,210] },
      didDrawPage: (data) => {
        const pageSize = docPdf.internal.pageSize;
        const pageWidth = pageSize.getWidth ? pageSize.getWidth() : (pageSize as any).width;
        const pageHeight = pageSize.getHeight ? pageSize.getHeight() : (pageSize as any).height;
        const gen = new Date().toLocaleString('es-MX');
        docPdf.setFontSize(8);
        docPdf.setTextColor(100);
        docPdf.text(`Generado: ${gen}`, 14, pageHeight - 6);
        const pageStr = `${data.pageNumber}/${docPdf.getNumberOfPages()}`;
        docPdf.text(pageStr, pageWidth - 14, pageHeight - 6, { align: 'right' } as any);
        docPdf.setTextColor(0);
      },
    });
    docPdf.save('resumen_rad_pagina.pdf');
  };

  // Constantes de colores removidas (no se usan)

  // Locale number formatter (es-MX)
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: decimalPlaces }).format(Number.isFinite(n) ? n : 0);

  // Función de incrustación de gráfico removida

  // Build summary strings for exports
  const buildSummary = () => {
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    const range = `${s ? s.toLocaleDateString('es-MX') : '—'} → ${e ? e.toLocaleDateString('es-MX') : '—'}`;
    const clientStr = selectedClient ? selectedClient.name : '—';
    const serviceStr = selectedService ? serviceLabel(selectedService.id) : (serviceFilter.trim() ? `Texto: "${serviceFilter.trim()}"` : '—');
    const exportCount = exportOnlyVisible ? pagedRows.length : radRows.length;
    return { range, clientStr, serviceStr, exportCount };
  };

  // Resumen de cabecera removido (no usado)

  return (
    <Box sx={{ px: 0, mx: 0, ml: 0 }}>
      <Typography variant="h4" gutterBottom>
        Reportes
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Resumen RAD" />
        <Tab label="Servicios" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ px: 0, mx: 0, maxWidth: '100%', overflowX: 'hidden' }}>
          <Card sx={{ mb: 2, mx: 0, overflow: 'hidden' }}>
            <CardHeader title="Filtros" />
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ flexWrap: 'wrap' }}>
                <DatePicker label="Desde" value={startDate} onChange={(v) => setStartDate(v)} slotProps={{ textField: { sx: { minWidth: 180 } } }} />
                <DatePicker label="Hasta" value={endDate} onChange={(v) => setEndDate(v)} slotProps={{ textField: { sx: { minWidth: 180 } } }} />
                <Tooltip title="Restablecer todos los filtros">
                  <span>
                    <Button variant="text" color="secondary" onClick={() => setConfirmClearOpen(true)} disabled={loadingRad}>Limpiar filtros</Button>
                  </span>
                </Tooltip>
                <Autocomplete
                  options={services}
                  getOptionLabel={(opt) => `${opt.folio || opt.id}${opt.clientName ? ' • ' + opt.clientName : ''}`}
                  value={selectedService}
                  onChange={(_, v) => setSelectedService(v)}
                  filterOptions={(opts) => {
                    if (!selectedClient?.id) return opts;
                    return opts.filter(o => o.clientId === selectedClient.id);
                  }}
                  sx={{ minWidth: 220, flex: '1 1 260px' }}
                  renderInput={(params) => <TextField {...params} label="Servicio" placeholder="Buscar por folio/cliente" />}
                />
                <Autocomplete
                  options={clients}
                  getOptionLabel={(opt) => opt.name}
                  value={selectedClient}
                  onChange={(_, v) => setSelectedClient(v)}
                  sx={{ minWidth: 200, flex: '1 1 220px' }}
                  renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Filtrar por cliente" />}
                />
                <TextField sx={{ flex: '1 1 220px', minWidth: 200 }} label="Servicio (texto parcial)" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} />
                <Button variant="contained" onClick={loadRAD} disabled={loadingRad} sx={{ flex: '0 0 auto' }}>{loadingRad ? 'Cargando...' : 'Aplicar'}</Button>
                <Chip size="small" color={activeFiltersCount ? 'secondary' : 'default'} label={`Filtros activos: ${activeFiltersCount}`} sx={{ flex: '0 0 auto' }} />
                <FormControlLabel control={<Switch size="small" checked={exportOnlyVisible} onChange={(e) => setExportOnlyVisible(e.target.checked)} />} label="Exportar solo visibles" sx={{ flex: '0 0 auto' }} />
                <FormControl size="small" sx={{ minWidth: 140, flex: '0 0 auto' }}>
                  <InputLabel>Decimales</InputLabel>
                  <Select label="Decimales" value={decimalPlaces} onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setDecimalPlaces(v);
                    try {
                      const raw = localStorage.getItem(PREF_KEY);
                      const base = raw ? JSON.parse(raw) : {};
                      localStorage.setItem(PREF_KEY, JSON.stringify({ ...base, decimalPlaces: v }));
                    } catch {}
                  }}>
                    <MenuItem value={0}>0</MenuItem>
                    <MenuItem value={1}>1</MenuItem>
                    <MenuItem value={2}>2</MenuItem>
                    <MenuItem value={3}>3</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 'auto' }}>
                  <Button variant="outlined" onClick={exportRadCSV} disabled={!radRows.length}>Exportar CSV</Button>
                  <Button variant="outlined" onClick={exportRadPDF} disabled={!radRows.length}>Exportar PDF</Button>
                  <Button variant="outlined" onClick={exportRadCSVPage} disabled={!pagedRows.length}>Exportar página CSV</Button>
                  <Button variant="outlined" onClick={exportRadPDFPage} disabled={!pagedRows.length}>Exportar página PDF</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
            <DialogTitle>Limpiar filtros</DialogTitle>
            <DialogContent>
              ¿Deseas restablecer el rango de fechas y limpiar Cliente, Servicio y texto de búsqueda?
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmClearOpen(false)}>Cancelar</Button>
              <Button color="secondary" onClick={() => { setConfirmClearOpen(false); clearFilters(); }}>Limpiar</Button>
            </DialogActions>
          </Dialog>

          <Card sx={{ mx: 0 }}>
            <CardHeader title={<Stack direction="row" alignItems="center" justifyContent="space-between"><span>Listado RAD</span><Chip size="small" label={`${radRows.length} registro(s)`} /></Stack>} />
            <CardContent>
              <Box sx={{ overflowX: 'auto', width: '100%' }}>
                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: { xs: 110, sm: 140 }, whiteSpace: 'nowrap' }}>RAD</TableCell>
                      <TableCell sx={{ width: { xs: 220, sm: 340 } }}>Servicio</TableCell>
                      <TableCell sx={{ width: { xs: 110, sm: 140 }, whiteSpace: 'nowrap' }}>Fecha</TableCell>
                      <TableCell align="right" sx={{ width: 110, whiteSpace: 'nowrap' }}>Hectáreas</TableCell>
                      <TableCell align="right" sx={{ width: 110, whiteSpace: 'nowrap' }}>Horas</TableCell>
                      <TableCell align="right" sx={{ width: 120, whiteSpace: 'nowrap' }}>Combustible</TableCell>
                      <TableCell align="right" sx={{ width: 120, whiteSpace: 'nowrap' }}>Fertilizante</TableCell>
                      <TableCell sx={{ width: 'auto' }}>Incidentes</TableCell>
                      <TableCell align="right" sx={{ width: 110, whiteSpace: 'nowrap' }}>Evidencias</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedRows.map((r) => {
                      const d = r.date?.toDate?.() ? new Date(r.date.toDate()) : (r.date ? new Date(r.date) : null);
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.id}</TableCell>
                          <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{serviceLabel(r.serviceId) || '—'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{d ? d.toLocaleDateString() : '—'}</TableCell>
                          <TableCell align="right">{Number(r?.progress?.hectares || 0)}</TableCell>
                          <TableCell align="right">{Number(r?.progress?.hours || 0)}</TableCell>
                          <TableCell align="right">{Number(r?.consumables?.fuel || 0)}</TableCell>
                          <TableCell align="right">{Number(r?.consumables?.fertilizer || 0)}</TableCell>
                          <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(r.incidents || '').replace(/\n/g, ' ')}</TableCell>
                          <TableCell align="right">{Array.isArray(r.evidenceURLs) ? r.evidenceURLs.length : 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination
                component="div"
                count={radRows.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { 
                  const v = parseInt(e.target.value, 10); 
                  setRowsPerPage(v); 
                  setPage(0); 
                  try {
                    const raw = localStorage.getItem(PREF_KEY);
                    const base = raw ? JSON.parse(raw) : {};
                    localStorage.setItem(PREF_KEY, JSON.stringify({ ...base, rowsPerPage: v }));
                  } catch {}
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </CardContent>
          </Card>
        </Box>
      )}

      {tab === 1 && (
        <ServicesReportSection />
      )}
    </Box>
  );
}

// --- Servicios Report Section (self-contained) ---

function ServicesReportSection() {
  // Reuse db and helpers from module scope
  const [sStart, setSStart] = useState<Date | null>(() => { const d=new Date(); d.setDate(d.getDate()-30); return d; });
  const [sEnd, setSEnd] = useState<Date | null>(new Date());
  const [sClient, setSClient] = useState<{ id: string; name: string } | null>(null);
  const [sStatus, setSStatus] = useState<string>('');
  const [sText, setSText] = useState<string>('');
  const [sRows, setSRows] = useState<any[]>([]);
  const [sLoading, setSLoading] = useState(false);
  const [sPage, setSPage] = useState(0);
  const [sRpp, setSRpp] = useState(10);
  const [sOnlyVisible, setSOnlyVisible] = useState(false);
  const [sClients, setSClients] = useState<Array<{ id: string; name: string }>>([]);

  // pull clients and services arrays from outer scope via React context of closure
  // For simplicity, reload from Firestore (avoids prop drilling). Client-side filtering keeps it simple.
  const loadServicesData = async () => {
    setSLoading(true);
    try {
      const [svcSnap, cliSnap] = await Promise.all([
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'clients')),
      ]);
      const arr = svcSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const clientsArr = cliSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name || 'Cliente' }));
      setSClients(clientsArr);
      // Filter client-side by date/status/client/text
      let rows = arr;
      if (sStart || sEnd) {
        const start = sStart ? new Date(sStart) : null; if (start) start.setHours(0,0,0,0);
        const end = sEnd ? new Date(sEnd) : null; if (end) end.setHours(23,59,59,999);
        rows = rows.filter(r => {
          const created = r.createdAt?.toDate?.() ? new Date(r.createdAt.toDate()) : (r.createdAt ? new Date(r.createdAt) : null);
          if (!created) return true; // si no hay fecha, no excluir
          if (start && created < start) return false;
          if (end && created > end) return false;
          return true;
        });
      }
      if (sClient?.id) {
        rows = rows.filter(r => (r.clientId || r.client?.id || '') === sClient.id);
      }
      if (sStatus.trim()) {
        rows = rows.filter(r => String(r.status || '').toLowerCase() === sStatus.toLowerCase());
      }
      if (sText.trim()) {
        const t = sText.trim().toLowerCase();
        rows = rows.filter(r =>
          String(r.folio || '').toLowerCase().includes(t) ||
          String(r.clientName || r.client?.name || '').toLowerCase().includes(t) ||
          String(r.description || '').toLowerCase().includes(t)
        );
      }
      setSRows(rows);
    } finally {
      setSLoading(false);
    }
  };

  useEffect(() => { loadServicesData(); }, []);

  const sPaged = useMemo(() => {
    const start = sPage * sRpp; return sRows.slice(start, start + sRpp);
  }, [sRows, sPage, sRpp]);

  const sStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const r of sRows) set.add(String(r.status || ''));
    return Array.from(set).filter(Boolean).sort();
  }, [sRows]);

  const activeCount = useMemo(() => {
    let c = 0; if (sClient) c++; if (sStatus) c++; if (sText.trim()) c++;
    const defS = new Date(); defS.setDate(defS.getDate()-30); defS.setHours(0,0,0,0);
    const defE = new Date(); defE.setHours(0,0,0,0);
    const s = sStart ? new Date(sStart) : null; if (s) s.setHours(0,0,0,0);
    const e = sEnd ? new Date(sEnd) : null; if (e) e.setHours(0,0,0,0);
    if ((s && s.getTime() !== defS.getTime()) || (e && e.getTime() !== defE.getTime())) c++;
    return c;
  }, [sStart, sEnd, sClient, sStatus, sText]);

  const exportServicesCSV = (onlyVisible=false) => {
    const src = onlyVisible ? sPaged : sRows;
    const headers = ['Folio','Cliente','Estado','Creado','Descripción'];
    const rows = src.map(r => [
      r.folio || r.id,
      r.clientName || r.client?.name || '',
      r.status || '',
      r.createdAt?.toDate?.() ? new Date(r.createdAt.toDate()).toLocaleDateString('es-MX') : (r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-MX') : ''),
      (r.description || '').replace(/\n/g,' ')
    ].join(','));
    const pre = [
      '# Resumen Servicios',
      `# Rango: ${(sStart?new Date(sStart).toLocaleDateString('es-MX'):'—')} → ${(sEnd?new Date(sEnd).toLocaleDateString('es-MX'):'—')}`,
      `# Cliente: ${sClient?.name || '—'}`,
      `# Estado: ${sStatus || '—'}`,
      `# Texto: ${sText || '—'}`,
      `# Registros exportados: ${src.length}`,
      '#',
    ].join('\n');
    const csv = [pre, headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'servicios.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportServicesPDF = (onlyVisible=false) => {
    const src = onlyVisible ? sPaged : sRows;
    const doc = new jsPDF();
    doc.text('Servicios', 14, 14);
    doc.setFontSize(10);
    doc.text(`Rango: ${(sStart?new Date(sStart).toLocaleDateString('es-MX'):'—')} → ${(sEnd?new Date(sEnd).toLocaleDateString('es-MX'):'—')}`, 14, 20);
    doc.text(`Cliente: ${sClient?.name || '—'}`, 100, 20);
    doc.text(`Estado: ${sStatus || '—'}`, 14, 26);
    doc.text(`Registros: ${src.length}`, 100, 26);
    const body = src.map(r => [
      r.folio || r.id,
      r.clientName || r.client?.name || '',
      r.status || '',
      r.createdAt?.toDate?.() ? new Date(r.createdAt.toDate()).toLocaleDateString('es-MX') : (r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-MX') : ''),
      (r.description || '').slice(0,60)
    ]);
    autoTable(doc, { head: [['Folio','Cliente','Estado','Creado','Descripción']], body, startY: 32, styles: { fontSize: 8 }, headStyles: { fillColor: [25,118,210] } });
    doc.save('servicios.pdf');
  };

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardHeader title="Filtros" />
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ flexWrap: 'wrap' }}>
            <DatePicker label="Desde" value={sStart} onChange={(v)=>setSStart(v)} slotProps={{ textField: { sx: { minWidth: 180 } } }} />
            <DatePicker label="Hasta" value={sEnd} onChange={(v)=>setSEnd(v)} slotProps={{ textField: { sx: { minWidth: 180 } } }} />
            <Autocomplete options={sClients} getOptionLabel={(o)=>o.name} value={sClient} onChange={(_,v)=>setSClient(v)} sx={{ minWidth: 200, flex: '1 1 220px' }} renderInput={(p)=><TextField {...p} label="Cliente" />} />
            <FormControl size="small" sx={{ minWidth: 140, flex: '0 0 auto' }}>
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={sStatus} onChange={(e)=>setSStatus(String(e.target.value))}>
                <MenuItem value="">Todos</MenuItem>
                {sStatuses.map(st => (<MenuItem key={st} value={st}>{st}</MenuItem>))}
              </Select>
            </FormControl>
            <TextField sx={{ flex: '1 1 240px', minWidth: 200 }} label="Buscar (folio/cliente/texto)" value={sText} onChange={(e)=>setSText(e.target.value)} />
            <Button variant="contained" onClick={loadServicesData} disabled={sLoading} sx={{ flex: '0 0 auto' }}>{sLoading? 'Cargando...':'Aplicar'}</Button>
            <Chip size="small" label={`Filtros activos: ${activeCount}`} sx={{ flex: '0 0 auto' }} />
            <FormControlLabel control={<Switch size="small" checked={sOnlyVisible} onChange={(e)=>setSOnlyVisible(e.target.checked)} />} label="Exportar solo visibles" sx={{ flex: '0 0 auto' }} />
            <Box flex={1} />
            <Button variant="outlined" onClick={()=>exportServicesCSV(sOnlyVisible)} disabled={!sRows.length}>Exportar CSV</Button>
            <Button variant="outlined" onClick={()=>exportServicesPDF(sOnlyVisible)} disabled={!sRows.length}>Exportar PDF</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={<Stack direction="row" alignItems="center" justifyContent="space-between"><span>Listado de Servicios</span><Chip size="small" label={`${sRows.length} registro(s)`} /></Stack>} />
        <CardContent>
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: { xs: 120, sm: 160 }, whiteSpace: 'nowrap' }}>Folio</TableCell>
                  <TableCell sx={{ width: { xs: 220, sm: 320 } }}>Cliente</TableCell>
                  <TableCell sx={{ width: { xs: 140, sm: 180 }, whiteSpace: 'nowrap' }}>Estado</TableCell>
                  <TableCell sx={{ width: { xs: 140, sm: 180 }, whiteSpace: 'nowrap' }}>Creado</TableCell>
                  <TableCell sx={{ width: 'auto' }}>Descripción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sPaged.map(r => {
                  const d = r.createdAt?.toDate?.() ? new Date(r.createdAt.toDate()) : (r.createdAt ? new Date(r.createdAt) : null);
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.folio || r.id}</TableCell>
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.clientName || r.client?.name || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.status || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{d ? d.toLocaleDateString('es-MX') : '—'}</TableCell>
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{(r.description || '')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <TablePagination component="div" count={sRows.length} page={sPage} onPageChange={(_,p)=>setSPage(p)} rowsPerPage={sRpp} onRowsPerPageChange={(e)=>{ setSRpp(parseInt(e.target.value,10)); setSPage(0); }} rowsPerPageOptions={[10,25,50,100]} />
        </CardContent>
      </Card>
    </Box>
  );
}
