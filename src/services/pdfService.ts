import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Proposal, Service, Client } from '../types';

export interface PDFGenerationOptions {
  proposal: Proposal;
  service: Service;
  client: Client;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
}

export class PDFService {
  private defaultCompanyInfo = {
    name: 'Comercializadora CF',
    address: 'Dirección de la empresa',
    phone: '+52 (55) 1234-5678',
    email: 'contacto@comercializadora-cf.com',
    website: 'www.comercializadora-cf.com'
  };

  async generateQuotationPDF(options: PDFGenerationOptions): Promise<string> {
    const pdf = await this.createPDFDocument(options);
    // Return base64 string
    return pdf.output('datauristring').split(',')[1];
  }

  async generateQuotationPDFBase64(options: PDFGenerationOptions): Promise<string> {
    return this.generateQuotationPDF(options);
  }

  async generateQuotationPDFBlob(options: PDFGenerationOptions): Promise<Blob> {
    const pdf = await this.createPDFDocument(options);
    return pdf.output('blob');
  }

  private async createPDFDocument(options: PDFGenerationOptions): Promise<jsPDF> {
    const { proposal, service, client, companyInfo = this.defaultCompanyInfo } = options;
    
    // Create HTML content for the PDF
    const htmlContent = this.generatePDFHTML(proposal, service, client, companyInfo);
    
    // Create a temporary div to render the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '210mm'; // A4 width
    document.body.appendChild(tempDiv);

    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123 // A4 height in pixels at 96 DPI
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // If content is longer than one page, add more pages
      if (imgHeight > 297) { // A4 height in mm
        let position = -297;
        while (position > -imgHeight) {
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          position -= 297;
        }
      }

      return pdf;
    } finally {
      // Clean up
      document.body.removeChild(tempDiv);
    }
  }

  private generatePDFHTML(proposal: Proposal, service: Service, client: Client, companyInfo: any): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + (proposal.validityDays || 30));

    const subtotalItems = proposal.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const subtotalCosts = proposal.costDetails.labor + proposal.costDetails.equipment + 
                         proposal.costDetails.materials + proposal.costDetails.other;

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            padding: 20mm;
            background: white;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #1976d2;
          }
          .company-info {
            flex: 1;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
          }
          .company-details {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
          }
          .quote-info {
            text-align: right;
            flex: 1;
          }
          .quote-title {
            font-size: 20px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
          }
          .quote-details {
            font-size: 11px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e0e0e0;
          }
          .client-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: bold;
            width: 100px;
            color: #1976d2;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            background-color: #1976d2;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
          }
          .items-table td {
            padding: 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 11px;
          }
          .items-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals-section {
            background-color: #f0f7ff;
            padding: 20px;
            border-radius: 5px;
            border: 1px solid #1976d2;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
          }
          .total-row.subtotal {
            font-weight: bold;
            padding-top: 8px;
            border-top: 1px solid #ccc;
          }
          .total-row.grand-total {
            font-size: 16px;
            font-weight: bold;
            color: #1976d2;
            padding-top: 10px;
            border-top: 2px solid #1976d2;
            margin-top: 10px;
          }
          .validity-box {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .notes-section {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #1976d2;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #e0e0e0;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-name">${companyInfo.name}</div>
            <div class="company-details">
              ${companyInfo.address}<br>
              Tel: ${companyInfo.phone}<br>
              Email: ${companyInfo.email}<br>
              ${companyInfo.website ? `Web: ${companyInfo.website}` : ''}
            </div>
          </div>
          <div class="quote-info">
            <div class="quote-title">COTIZACIÓN</div>
            <div class="quote-details">
              <strong>Folio:</strong> ${service.folio || 'N/A'} - v${String(proposal.version || 1).padStart(2, '0')}<br>
              Fecha: ${formatDate(new Date())}<br>
              Válida hasta: ${formatDate(validityDate)}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
          <div class="client-info">
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span>${client.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">RFC:</span>
              <span>${(client as any).rfc || 'No especificado'}</span>
            </div>
            ${client.address ? `
              <div class="info-row">
                <span class="info-label">Dirección:</span>
                <span>${client.address}</span>
              </div>
            ` : ''}
            ${client.contacts && client.contacts.length > 0 ? `
              <div class="info-row">
                <span class="info-label">Contacto:</span>
                <span>${client.contacts[0].name} - ${client.contacts[0].email || client.contacts[0].phone || ''}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">DESCRIPCIÓN DEL SERVICIO</div>
          <div style="padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
            ${(service as any).description || 'Servicio solicitado'}
          </div>
        </div>

        <div class="section">
          <div class="section-title">CONCEPTOS COTIZADOS</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">CONCEPTO</th>
                <th style="width: 15%;" class="text-center">CANT.</th>
                <th style="width: 17.5%;" class="text-right">PRECIO UNIT.</th>
                <th style="width: 17.5%;" class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${proposal.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                  <td class="text-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">RESUMEN DE TOTALES</div>
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal de Conceptos:</span>
              <span>${formatCurrency(subtotalItems)}</span>
            </div>
            <div class="total-row subtotal">
              <span>DESGLOSE DE COSTOS:</span>
              <span></span>
            </div>
            <div class="total-row">
              <span>• Mano de Obra:</span>
              <span>${formatCurrency(proposal.costDetails.labor)}</span>
            </div>
            <div class="total-row">
              <span>• Equipo:</span>
              <span>${formatCurrency(proposal.costDetails.equipment)}</span>
            </div>
            <div class="total-row">
              <span>• Materiales:</span>
              <span>${formatCurrency(proposal.costDetails.materials)}</span>
            </div>
            <div class="total-row">
              <span>• Otros:</span>
              <span>${formatCurrency(proposal.costDetails.other)}</span>
            </div>
            <div class="total-row subtotal">
              <span>Subtotal de Costos:</span>
              <span>${formatCurrency(subtotalCosts)}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL GENERAL:</span>
              <span>${formatCurrency(proposal.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div class="validity-box">
          <strong>⏰ VIGENCIA:</strong> Esta cotización es válida por ${proposal.validityDays} días a partir de la fecha de emisión.
        </div>

        ${proposal.notes ? `
          <div class="section">
            <div class="section-title">NOTAS ADICIONALES</div>
            <div class="notes-section">
              ${proposal.notes}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p><strong>${companyInfo.name}</strong></p>
          <p>Gracias por su confianza. Para cualquier aclaración, no dude en contactarnos.</p>
        </div>
      </body>
      </html>
    `;
  }
}

export const pdfService = new PDFService();
