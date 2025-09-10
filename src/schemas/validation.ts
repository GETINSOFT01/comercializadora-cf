import { z } from 'zod';

// Common validation patterns
const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Base schemas for reusable components
export const contactSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/, 'El nombre solo puede contener letras y espacios'),
  
  email: z.string()
    .email('Formato de email inválido')
    .regex(emailRegex, 'Email debe tener un formato válido'),
  
  phone: z.string()
    .regex(/^\+?[\d\s\-()]+$/, 'Formato de teléfono inválido (ej: +52 55 1234 5678)')
    .optional(),
  
  role: z.string()
    .min(2, 'El rol debe tener al menos 2 caracteres')
    .max(50, 'El rol no puede exceder 50 caracteres')
    .optional()
});

export const addressSchema = z.object({
  street: z.string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(200, 'La dirección no puede exceder 200 caracteres'),
  
  city: z.string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad no puede exceder 100 caracteres'),
  
  state: z.string()
    .min(2, 'El estado debe tener al menos 2 caracteres')
    .max(50, 'El estado no puede exceder 50 caracteres'),
  
  zipCode: z.string()
    .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
  
  country: z.string()
    .min(2, 'El país debe tener al menos 2 caracteres')
    .max(50, 'El país no puede exceder 50 caracteres')
    .default('México')
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string()
    .email('Formato de email inválido')
    .min(1, 'El email es requerido'),
  
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
});

export const registerSchema = z.object({
  email: z.string()
    .email('Formato de email inválido')
    .min(1, 'El email es requerido'),
  
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  confirmPassword: z.string(),
  
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  
  role: z.enum(['admin', 'manager', 'supervisor', 'technician', 'finance', 'client'])
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

// Client schemas
export const clientSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  
  taxId: z.string()
    .regex(rfcRegex, 'RFC inválido (ej: ABC123456XYZ)')
    .transform(val => val.toUpperCase()),
  
  address: addressSchema,
  
  contacts: z.array(contactSchema)
    .min(1, 'Debe tener al menos un contacto')
    .max(10, 'No puede tener más de 10 contactos'),
  
  paymentTerms: z.number()
    .int('Los términos de pago deben ser un número entero')
    .min(0, 'Los términos de pago no pueden ser negativos')
    .max(365, 'Los términos de pago no pueden exceder 365 días')
    .default(30),
  
  notes: z.string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
});

// Service schemas
export const serviceRequestSchema = z.object({
  clientId: z.string()
    .min(1, 'Debe seleccionar un cliente'),
  
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
  
  requestDate: z.date({
    message: 'La fecha de solicitud es requerida'
  }),
  
  requiredDate: z.date({
    message: 'La fecha requerida es requerida'
  }),
  
  location: z.object({
    address: z.string()
      .min(5, 'La dirección debe tener al menos 5 caracteres')
      .max(300, 'La dirección no puede exceder 300 caracteres'),
    
    coordinates: z.object({
      lat: z.number()
        .min(-90, 'Latitud inválida')
        .max(90, 'Latitud inválida'),
      
      lng: z.number()
        .min(-180, 'Longitud inválida')
        .max(180, 'Longitud inválida')
    }).optional()
  }),
  
  priority: z.enum(['low', 'medium', 'high', 'urgent'])
    .default('medium'),
  
  serviceType: z.string()
    .min(2, 'El tipo de servicio debe tener al menos 2 caracteres')
    .max(100, 'El tipo de servicio no puede exceder 100 caracteres'),
  
  estimatedHours: z.number()
    .positive('Las horas estimadas deben ser positivas')
    .max(1000, 'Las horas estimadas no pueden exceder 1000')
    .optional(),
  
  attachments: z.array(z.string().url('URL de archivo inválida'))
    .max(20, 'No puede tener más de 20 archivos adjuntos')
    .optional()
}).refine((data) => data.requiredDate >= data.requestDate, {
  message: 'La fecha requerida debe ser posterior a la fecha de solicitud',
  path: ['requiredDate']
});

export const serviceProposalSchema = z.object({
  serviceRequestId: z.string()
    .min(1, 'ID de solicitud de servicio requerido'),
  
  items: z.array(z.object({
    description: z.string()
      .min(5, 'La descripción debe tener al menos 5 caracteres')
      .max(500, 'La descripción no puede exceder 500 caracteres'),
    
    quantity: z.number()
      .positive('La cantidad debe ser positiva')
      .max(10000, 'La cantidad no puede exceder 10,000'),
    
    unitPrice: z.number()
      .positive('El precio unitario debe ser positivo')
      .max(1000000, 'El precio unitario no puede exceder $1,000,000'),
    
    unit: z.string()
      .min(1, 'La unidad es requerida')
      .max(20, 'La unidad no puede exceder 20 caracteres')
  })).min(1, 'Debe tener al menos un item'),
  
  validityDays: z.number()
    .int('Los días de validez deben ser un número entero')
    .min(1, 'Debe tener al menos 1 día de validez')
    .max(365, 'No puede tener más de 365 días de validez')
    .default(30),
  
  notes: z.string()
    .max(2000, 'Las notas no pueden exceder 2000 caracteres')
    .optional(),
  
  terms: z.string()
    .max(5000, 'Los términos no pueden exceder 5000 caracteres')
    .optional()
});

// Daily Report (RAD) schema
export const dailyReportSchema = z.object({
  serviceId: z.string()
    .min(1, 'ID de servicio requerido'),
  
  date: z.date({
    message: 'La fecha es requerida'
  }),
  
  progress: z.object({
    hectares: z.number()
      .nonnegative('Las hectáreas no pueden ser negativas')
      .max(10000, 'Las hectáreas no pueden exceder 10,000')
      .optional(),
    
    hours: z.number()
      .positive('Las horas deben ser positivas')
      .max(24, 'Las horas no pueden exceder 24 por día'),
    
    percentage: z.number()
      .min(0, 'El porcentaje no puede ser negativo')
      .max(100, 'El porcentaje no puede exceder 100')
      .optional()
  }),
  
  consumables: z.object({
    fuel: z.number()
      .nonnegative('El combustible no puede ser negativo')
      .max(10000, 'El combustible no puede exceder 10,000 litros')
      .optional(),
    
    fertilizer: z.number()
      .nonnegative('El fertilizante no puede ser negativo')
      .max(50000, 'El fertilizante no puede exceder 50,000 kg')
      .optional(),
    
    seeds: z.number()
      .nonnegative('Las semillas no pueden ser negativas')
      .max(10000, 'Las semillas no pueden exceder 10,000 kg')
      .optional()
  }).optional(),
  
  incidents: z.string()
    .max(2000, 'Los incidentes no pueden exceder 2000 caracteres')
    .optional(),
  
  weather: z.object({
    condition: z.enum(['sunny', 'cloudy', 'rainy', 'stormy', 'foggy']),
    temperature: z.number()
      .min(-50, 'Temperatura mínima: -50°C')
      .max(60, 'Temperatura máxima: 60°C')
      .optional(),
    humidity: z.number()
      .min(0, 'Humedad mínima: 0%')
      .max(100, 'Humedad máxima: 100%')
      .optional()
  }).optional(),
  
  evidenceURLs: z.array(z.string().url('URL de evidencia inválida'))
    .max(50, 'No puede tener más de 50 evidencias')
    .optional()
});

// Invoice schema
export const invoiceSchema = z.object({
  serviceRequestId: z.string()
    .min(1, 'ID de solicitud de servicio requerido'),
  
  clientId: z.string()
    .min(1, 'ID de cliente requerido'),
  
  items: z.array(z.object({
    description: z.string()
      .min(5, 'La descripción debe tener al menos 5 caracteres')
      .max(500, 'La descripción no puede exceder 500 caracteres'),
    
    quantity: z.number()
      .positive('La cantidad debe ser positiva'),
    
    unitPrice: z.number()
      .positive('El precio unitario debe ser positivo'),
    
    taxRate: z.number()
      .min(0, 'La tasa de impuesto no puede ser negativa')
      .max(1, 'La tasa de impuesto no puede exceder 100%')
      .default(0.16) // IVA México
  })).min(1, 'Debe tener al menos un item'),
  
  createdAt: z.date({
    message: 'La fecha de creación es requerida'
  }),
  
  paymentMethod: z.enum(['cash', 'transfer', 'check', 'card']),
  
  notes: z.string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
});

// Type exports for TypeScript
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type ServiceRequestFormData = z.infer<typeof serviceRequestSchema>;
export type ServiceProposalFormData = z.infer<typeof serviceProposalSchema>;
export type DailyReportFormData = z.infer<typeof dailyReportSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
