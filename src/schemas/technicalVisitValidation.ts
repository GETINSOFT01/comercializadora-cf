import { z } from 'zod';

// Schema para el formulario de visita técnica
export const technicalVisitFormSchema = z.object({
  serviceId: z.string()
    .min(1, 'ID del servicio es requerido'),
  
  visitDate: z.string()
    .min(1, 'La fecha de visita es requerida')
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Fecha de visita inválida'
    }),
  
  visitTime: z.string()
    .min(1, 'La hora de visita es requerida')
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  
  technicianName: z.string()
    .min(2, 'El nombre del técnico debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/, 'El nombre solo puede contener letras y espacios'),
  
  technicianId: z.string()
    .min(1, 'ID del técnico es requerido'),
  
  visitPurpose: z.string()
    .min(10, 'El propósito de la visita debe tener al menos 10 caracteres')
    .max(500, 'El propósito no puede exceder 500 caracteres'),
  
  estimatedDuration: z.number()
    .min(0.5, 'La duración mínima es 0.5 horas')
    .max(24, 'La duración máxima es 24 horas'),
  
  specialRequirements: z.string()
    .max(1000, 'Los requerimientos no pueden exceder 1000 caracteres')
    .optional(),
  
  clientContactConfirmed: z.boolean()
    .refine((val) => val === true, {
      message: 'Debe confirmar el contacto con el cliente'
    })
});

// Schema para los resultados de la visita técnica
export const technicalVisitResultsSchema = z.object({
  visitId: z.string()
    .min(1, 'ID de la visita es requerido'),
  
  actualStartTime: z.string()
    .min(1, 'Hora de inicio real es requerida'),
  
  actualEndTime: z.string()
    .min(1, 'Hora de finalización real es requerida'),
  
  visitStatus: z.enum(['completada', 'parcial', 'cancelada', 'reprogramada'], {
    message: 'Seleccione un estado válido para la visita'
  }),
  
  problemsFound: z.array(z.string())
    .min(1, 'Debe especificar al menos un problema encontrado'),
  
  solutionsProposed: z.array(z.string())
    .min(1, 'Debe proponer al menos una solución'),
  
  materialsNeeded: z.array(z.object({
    item: z.string().min(1, 'Nombre del material requerido'),
    quantity: z.number().min(1, 'Cantidad debe ser mayor a 0'),
    estimatedCost: z.number().min(0, 'Costo no puede ser negativo').optional(),
    urgent: z.boolean().default(false)
  })).optional(),
  
  workCompleted: z.string()
    .min(10, 'Descripción del trabajo completado debe tener al menos 10 caracteres')
    .max(2000, 'La descripción no puede exceder 2000 caracteres'),
  
  additionalWorkNeeded: z.string()
    .max(2000, 'La descripción no puede exceder 2000 caracteres')
    .optional(),
  
  clientSatisfaction: z.enum(['muy_satisfecho', 'satisfecho', 'neutral', 'insatisfecho', 'muy_insatisfecho'], {
    message: 'Seleccione un nivel de satisfacción válido'
  }),
  
  clientComments: z.string()
    .max(1000, 'Los comentarios no pueden exceder 1000 caracteres')
    .optional(),
  
  technicianNotes: z.string()
    .min(10, 'Las notas del técnico deben tener al menos 10 caracteres')
    .max(2000, 'Las notas no pueden exceder 2000 caracteres'),
  
  photosUploaded: z.array(z.string()).optional(),
  
  followUpRequired: z.boolean().default(false),
  
  followUpDate: z.string().optional(),
  
  recommendedAction: z.enum(['aprobar', 'rechazar', 'requiere_mas_trabajo', 'requiere_cotizacion'], {
    message: 'Seleccione una acción recomendada válida'
  }),
  
  estimatedCompletionDate: z.string()
    .min(1, 'Fecha estimada de finalización es requerida')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      return date >= today;
    }, {
      message: 'La fecha no puede ser en el pasado'
    }),
  
  totalEstimatedCost: z.number()
    .min(0, 'El costo no puede ser negativo')
    .optional()
});

export type TechnicalVisitFormData = z.infer<typeof technicalVisitFormSchema>;
export type TechnicalVisitResultsData = z.infer<typeof technicalVisitResultsSchema>;
