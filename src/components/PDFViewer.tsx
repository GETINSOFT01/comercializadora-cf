import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Toolbar,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { PDFService } from '../services/pdfService';
import { EmailService } from '../services/emailService';
import type { Proposal, Service, Client } from '../types';
import { useSnackbar } from 'notistack';

interface PDFViewerProps {
  open: boolean;
  onClose: () => void;
  proposal: Proposal;
  service: Service;
  client: Client;
  title?: string;
}

export default function PDFViewer({
  open,
  onClose,
  proposal,
  service,
  client,
  title = 'Vista Previa de Cotización'
}: PDFViewerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    console.log('PDFViewer useEffect - open:', open);
    if (open) {
      console.log('PDFViewer opening, generating PDF...');
      generatePDF();
    } else {
      // Cleanup URL when dialog closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open]);

  const generatePDF = async () => {
    try {
      console.log('generatePDF starting...');
      console.log('Proposal:', proposal);
      console.log('Service:', service);
      console.log('Client:', client);
      
      setLoading(true);
      const pdfService = new PDFService();
      const pdfBlob = await pdfService.generateQuotationPDFBlob({
        proposal,
        service,
        client
      });

      console.log('PDF generated successfully, creating URL...');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      console.log('PDF URL created:', url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      enqueueSnackbar('Error al generar el PDF', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Cotizacion_${service.folio || proposal.id}_v${proposal.version}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleResend = async () => {
    try {
      setSending(true);
      const emailService = new EmailService();
      
      // Generate PDF for email
      const pdfService = new PDFService();
      const pdfBase64 = await pdfService.generateQuotationPDFBase64({
        proposal,
        service,
        client
      });

      await emailService.sendQuotationEmail({
        proposal,
        service,
        client,
        pdfBase64
      });

      enqueueSnackbar('Cotización reenviada exitosamente', { variant: 'success' });
    } catch (error) {
      console.error('Error resending quotation:', error);
      enqueueSnackbar('Error al reenviar la cotización', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Descargar PDF">
            <span>
              <IconButton onClick={handleDownload} disabled={!pdfUrl}>
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Imprimir">
            <span>
              <IconButton onClick={handlePrint} disabled={!pdfUrl}>
                <PrintIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Reenviar por email">
            <span>
              <IconButton 
                onClick={handleResend} 
                disabled={!pdfUrl || sending}
                color="primary"
              >
                {sending ? <CircularProgress size={20} /> : <EmailIcon />}
              </IconButton>
            </span>
          </Tooltip>

          <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
            Folio: {service.folio} | Versión: v{proposal.version}
          </Typography>
        </Box>
      </Toolbar>

      <DialogContent sx={{ p: 0, flex: 1 }}>
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}
          >
            <CircularProgress />
          </Box>
        ) : pdfUrl ? (
          <Box sx={{ height: '100%', width: '100%' }}>
            <iframe
              src={pdfUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              title="PDF Viewer"
            />
          </Box>
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}
          >
            <Typography color="text.secondary">
              Error al cargar el PDF
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
