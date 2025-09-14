import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../firebase/config';
import type { Proposal, Service, Client } from '../types';

export interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string; // base64 encoded
    type: string;
  }[];
}

export interface QuotationEmailData {
  proposal: Proposal;
  service: Service;
  client: Client;
  pdfBase64?: string;
}

export class EmailService {
  private sendEmailFunction = httpsCallable(functions, 'sendEmail');

  async sendQuotationEmail(data: QuotationEmailData): Promise<void> {
    const { proposal, service, client, pdfBase64 } = data;
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      throw new Error('Usuario no autenticado. Por favor, inicie sesión nuevamente.');
    }

    // Get client emails
    const clientEmails = this.getClientEmails(client);
    
    if (clientEmails.length === 0) {
      throw new Error('No se encontraron emails del cliente para enviar la cotización');
    }

    const versionStr = String(proposal.version || 1).padStart(2, '0');
    const folioStr = service.folio || service.id;
    const emailData: EmailData = {
      to: clientEmails,
      subject: `Cotización ${folioStr} - v${versionStr}`,
      html: this.generateQuotationEmailTemplate(proposal, service, client),
      attachments: pdfBase64 ? [{
        filename: `Cotizacion_${folioStr}_v${versionStr}.pdf`,
        content: pdfBase64,
        type: 'application/pdf'
      }] : undefined
    };

    try {
      // Ensure we have a fresh token
      await auth.currentUser.getIdToken(true);
      await this.sendEmailFunction(emailData);
    } catch (error) {
      console.error('Error sending quotation email:', error);
      if (error instanceof Error && error.message.includes('auth')) {
        throw new Error('Error de autenticación. Por favor, inicie sesión nuevamente.');
      }
      throw new Error('Error al enviar el email de cotización');
    }
  }

  private getClientEmails(client: Client): string[] {
    const emails: string[] = [];
    
    // Add main client email if exists
    if (client.email) {
      emails.push(client.email);
    }
    
    // Add contact emails
    if (client.contacts) {
      client.contacts.forEach(contact => {
        if (contact.email && !emails.includes(contact.email)) {
          emails.push(contact.email);
        }
      });
    }
    
    return emails;
  }

  private generateQuotationEmailTemplate(proposal: Proposal, service: Service, client: Client): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    };

    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + (proposal.validityDays || 30));

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotización - Comercializadora CF</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1976d2;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: #666;
            margin: 5px 0 0 0;
          }
          .info-section {
            margin-bottom: 25px;
          }
          .info-section h3 {
            color: #1976d2;
            border-left: 4px solid #1976d2;
            padding-left: 10px;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
          }
          .info-item strong {
            color: #1976d2;
            display: block;
            margin-bottom: 5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th,
          .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          .items-table th {
            background-color: #1976d2;
            color: white;
            font-weight: bold;
          }
          .items-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .total-section {
            background-color: #e3f2fd;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 25px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .total-row.grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #1976d2;
            border-top: 2px solid #1976d2;
            padding-top: 10px;
          }
          .validity-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 25px;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .cta-button {
            display: inline-block;
            background-color: #1976d2;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          @media (max-width: 600px) {
            .info-grid {
              grid-template-columns: 1fr;
            }
            .total-row {
              flex-direction: column;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Comercializadora CF</h1>
            <p>Cotización de Servicios Profesionales</p>
          </div>

          <div class="info-section">
            <h3>Información del Cliente</h3>
            <div class="info-grid">
              <div class="info-item">
                <strong>Cliente:</strong>
                ${client.name}
              </div>
              <div class="info-item">
                <strong>RFC:</strong>
                ${(client as any).rfc || 'No especificado'}
              </div>
            </div>
          </div>

          <div class="info-section">
            <h3>Detalles del Servicio</h3>
            <div class="info-item">
              <strong>Descripción:</strong>
              ${(service as any).description || 'Servicio solicitado'}
            </div>
          </div>

          <div class="info-section">
            <h3>Conceptos Cotizados</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${proposal.items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td>${formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="total-section">
            <h3>Resumen de Totales</h3>
            <div class="total-row">
              <span>Subtotal de Conceptos:</span>
              <span>${formatCurrency(proposal.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}</span>
            </div>
            <div class="total-row">
              <span>Mano de Obra:</span>
              <span>${formatCurrency(proposal.costDetails.labor)}</span>
            </div>
            <div class="total-row">
              <span>Equipo:</span>
              <span>${formatCurrency(proposal.costDetails.equipment)}</span>
            </div>
            <div class="total-row">
              <span>Materiales:</span>
              <span>${formatCurrency(proposal.costDetails.materials)}</span>
            </div>
            <div class="total-row">
              <span>Otros:</span>
              <span>${formatCurrency(proposal.costDetails.other)}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL GENERAL:</span>
              <span>${formatCurrency(proposal.totalAmount)}</span>
            </div>
          </div>

          <div class="validity-info">
            <strong>⏰ Vigencia de la Cotización:</strong><br>
            Esta cotización es válida hasta el <strong>${validityDate.toLocaleDateString('es-MX')}</strong> (${proposal.validityDays} días a partir de hoy).
          </div>

          ${proposal.notes ? `
            <div class="info-section">
              <h3>Notas Adicionales</h3>
              <div class="info-item">
                ${proposal.notes}
              </div>
            </div>
          ` : ''}

          <div style="text-align: center;">
            <p>Para cualquier duda o aclaración, no dude en contactarnos.</p>
            <p><strong>¡Gracias por su confianza!</strong></p>
          </div>

          <div class="footer">
            <p>Comercializadora CF - Servicios Profesionales</p>
            <p>Este es un email automático, por favor no responda directamente a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
