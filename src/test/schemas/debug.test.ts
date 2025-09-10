import { describe, it, expect } from 'vitest';
import { serviceRequestFormSchema } from '../../schemas/serviceValidation';

describe('Debug Service Validation', () => {
  it('should debug validation errors', () => {
    const validServiceData = {
      clientId: 'client123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      priority: 'media',
      estimatedDuration: '8',
      estimatedStartDate: '2024-12-01',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567',
      additionalNotes: 'Acceso por camino de terracería',
      termsAccepted: true,
    };

    const result = serviceRequestFormSchema.safeParse(validServiceData);
    
    if (!result.success) {
      console.log('Validation errors:', result.error.issues);
      result.error.issues.forEach((issue, index) => {
        console.log(`Error ${index + 1}:`, {
          path: issue.path,
          message: issue.message,
          code: issue.code
        });
      });
    }
    
    expect(result.success).toBe(true);
  });
});
