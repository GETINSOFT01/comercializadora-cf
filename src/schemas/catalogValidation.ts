import { z } from 'zod';

export const serviceTypeSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es muy largo')
    .trim(),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  active: z.boolean(),
  order: z.number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden debe ser mayor o igual a 0')
});

export type ServiceTypeFormData = z.infer<typeof serviceTypeSchema>;
