import { z } from 'zod';

// Simplified service request schema for the form
export const serviceRequestFormSchema = z.object({
  clientId: z.string()
    .min(1, 'Debe seleccionar un cliente'),
  
  serviceType: z.string()
    .min(1, 'El tipo de servicio es requerido'),
  
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
  
  priority: z.enum(['baja', 'media', 'alta', 'urgente'], {
    message: 'Seleccione una prioridad válida'
  }),
  
  estimatedDuration: z.string()
    .min(1, 'La duración estimada es requerida')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Debe ser un número positivo'
    }),
  
  estimatedStartDate: z.string()
    .min(1, 'La fecha de inicio es requerida')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, {
      message: 'La fecha no puede ser en el pasado'
    }),
  
  location: z.string()
    .min(5, 'La ubicación debe tener al menos 5 caracteres')
    .max(300, 'La ubicación no puede exceder 300 caracteres'),
  
  contactName: z.string()
    .min(2, 'El nombre del contacto debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/, 'El nombre solo puede contener letras y espacios'),
  
  contactPhone: z.string()
    .min(1, 'El teléfono de contacto es requerido')
    .regex(/^\+?[\d\s\-()]+$/, 'Formato de teléfono inválido (ej: +52 55 1234 5678)'),
  
  additionalNotes: z.string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional(),
  
  termsAccepted: z.boolean()
    .refine((val) => val === true, {
      message: 'Debe aceptar los términos y condiciones'
    })
});

export type ServiceRequestFormData = z.infer<typeof serviceRequestFormSchema>;
