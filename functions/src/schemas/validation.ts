import { z } from 'zod';

// Esquemas de validación del lado servidor (espejo de los del cliente)

// Esquema de dirección
const addressSchema = z.object({
  street: z.string().min(1, 'La calle es requerida'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El estado es requerido'),
  postalCode: z.string().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
  country: z.string().default('México'),
});

// Esquema de contacto
const contactSchema = z.object({
  name: z.string().min(1, 'El nombre del contacto es requerido'),
  role: z.string().optional(),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

// Esquema de cliente
export const clientSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es requerido'),
  businessName: z.string().optional(),
  taxId: z.string().optional(),
  address: addressSchema,
  contacts: z.array(contactSchema).min(1, 'Debe tener al menos un contacto'),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// Esquema de solicitud de servicio
export const serviceRequestSchema = z.object({
  clientId: z.string().min(1, 'Debe seleccionar un cliente'),
  serviceType: z.enum([
    'Mantenimiento Agrícola',
    'Fumigación',
    'Cosecha',
    'Siembra',
    'Preparación de Terreno',
    'Riego',
    'Otro',
  ], { required_error: 'Debe seleccionar un tipo de servicio' }),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  priority: z.enum(['baja', 'media', 'alta', 'urgente'], {
    required_error: 'Debe seleccionar una prioridad',
  }),
  estimatedDuration: z.number().positive('La duración debe ser un número positivo'),
  estimatedStartDate: z.date(),
  location: z.string().min(1, 'La ubicación es requerida'),
  contactName: z.string().min(1, 'El nombre del contacto es requerido'),
  contactPhone: z.string().min(1, 'El teléfono de contacto es requerido'),
  additionalNotes: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'Debe aceptar los términos y condiciones',
  }),
});

// Esquema de reporte diario (RAD)
export const dailyReportSchema = z.object({
  serviceId: z.string().min(1, 'El ID del servicio es requerido'),
  date: z.date(),
  progress: z.object({
    hectares: z.number().min(0, 'Las hectáreas no pueden ser negativas').optional(),
    hours: z.number().min(0, 'Las horas no pueden ser negativas').optional(),
    percentage: z.number().min(0).max(100, 'El porcentaje debe estar entre 0 y 100').optional(),
  }),
  consumables: z.object({
    fuel: z.number().min(0, 'El combustible no puede ser negativo').optional(),
    fertilizer: z.number().min(0, 'El fertilizante no puede ser negativo').optional(),
    seeds: z.number().min(0, 'Las semillas no pueden ser negativas').optional(),
    pesticides: z.number().min(0, 'Los pesticidas no pueden ser negativos').optional(),
  }),
  incidents: z.string().optional(),
  evidenceURLs: z.array(z.string().url('URL de evidencia inválida')).optional(),
  weather: z.object({
    temperature: z.number().optional(),
    humidity: z.number().min(0).max(100).optional(),
    conditions: z.string().optional(),
  }).optional(),
});

// Esquema de propuesta de servicio
export const serviceProposalSchema = z.object({
  serviceId: z.string().min(1, 'El ID del servicio es requerido'),
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  scope: z.string().min(10, 'El alcance debe tener al menos 10 caracteres'),
  timeline: z.object({
    startDate: z.date(),
    endDate: z.date(),
    milestones: z.array(z.object({
      name: z.string().min(1, 'El nombre del hito es requerido'),
      date: z.date(),
      description: z.string().optional(),
    })).optional(),
  }),
  pricing: z.object({
    subtotal: z.number().positive('El subtotal debe ser positivo'),
    tax: z.number().min(0, 'El impuesto no puede ser negativo'),
    total: z.number().positive('El total debe ser positivo'),
    currency: z.string().default('MXN'),
  }),
  terms: z.string().min(10, 'Los términos deben tener al menos 10 caracteres'),
  validUntil: z.date(),
});

// Esquema de factura
export const invoiceSchema = z.object({
  serviceId: z.string().min(1, 'El ID del servicio es requerido'),
  clientId: z.string().min(1, 'El ID del cliente es requerido'),
  invoiceNumber: z.string().min(1, 'El número de factura es requerido'),
  issueDate: z.date(),
  dueDate: z.date(),
  items: z.array(z.object({
    description: z.string().min(1, 'La descripción del item es requerida'),
    quantity: z.number().positive('La cantidad debe ser positiva'),
    unitPrice: z.number().positive('El precio unitario debe ser positivo'),
    total: z.number().positive('El total debe ser positivo'),
  })).min(1, 'Debe tener al menos un item'),
  subtotal: z.number().positive('El subtotal debe ser positivo'),
  tax: z.number().min(0, 'El impuesto no puede ser negativo'),
  total: z.number().positive('El total debe ser positivo'),
  currency: z.string().default('MXN'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

// Tipos TypeScript derivados de los esquemas
export type ClientData = z.infer<typeof clientSchema>;
export type ServiceRequestData = z.infer<typeof serviceRequestSchema>;
export type DailyReportData = z.infer<typeof dailyReportSchema>;
export type ServiceProposalData = z.infer<typeof serviceProposalSchema>;
export type InvoiceData = z.infer<typeof invoiceSchema>;
