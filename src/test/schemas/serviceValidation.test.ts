import { describe, it, expect } from 'vitest';
import { serviceRequestFormSchema } from '../../schemas/serviceValidation';

describe('Service Validation Schema', () => {
  describe('serviceRequestFormSchema', () => {
    const validServiceFormData = {
      clientId: 'client123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz en 50 hectáreas',
      priority: 'media' as const,
      estimatedDuration: '8',
      estimatedStartDate: '2025-12-01',
      location: 'Campo Norte, Parcela 5, Carretera Federal',
      contactName: 'Juan Pérez',
      contactPhone: '+52 55 1234 5678',
      additionalNotes: 'Acceso por camino de terracería',
      requiresVisit: 'no' as const,
      termsAccepted: true,
    };

    it('should validate correct service form data', () => {
      const result = serviceRequestFormSchema.safeParse(validServiceFormData);
      expect(result.success).toBe(true);
    });

    it('should require client selection', () => {
      const invalidData = { ...validServiceFormData, clientId: '' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Debe seleccionar un cliente');
      }
    });

    it('should validate service type options', () => {
      const validTypes = [
        'Mantenimiento Agrícola',
        'Fumigación',
        'Cosecha',
        'Siembra',
        'Preparación de Terreno',
        'Riego',
        'Otro',
      ];

      validTypes.forEach(type => {
        const data = { ...validServiceFormData, serviceType: type };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      const invalidData = { ...validServiceFormData, serviceType: 'Invalid Type' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate priority options', () => {
      const validPriorities = ['baja', 'media', 'alta', 'urgente'];

      validPriorities.forEach(priority => {
        const data = { ...validServiceFormData, priority };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      const invalidData = { ...validServiceFormData, priority: 'invalid' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require minimum description length', () => {
      const shortDescription = 'Short';
      const invalidData = { ...validServiceFormData, description: shortDescription };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 10 caracteres');
      }
    });

    it('should validate estimated duration as string number', () => {
      const validDurations = ['1', '8', '24', '168'];
      
      validDurations.forEach(duration => {
        const data = { ...validServiceFormData, estimatedDuration: duration };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      const invalidData = { ...validServiceFormData, estimatedDuration: 'abc' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate date format', () => {
      const validDates = ['2025-12-01', '2026-01-15', '2025-10-15'];
      
      validDates.forEach(date => {
        const data = { ...validServiceFormData, estimatedStartDate: date };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      const invalidData = { ...validServiceFormData, estimatedStartDate: 'invalid-date' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require terms acceptance', () => {
      const invalidData = { ...validServiceFormData, termsAccepted: false };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('términos y condiciones');
      }
    });

    it('should make additional notes optional', () => {
      const { additionalNotes, ...dataWithoutNotes } = validServiceFormData;
      
      const result = serviceRequestFormSchema.safeParse(dataWithoutNotes);
      expect(result.success).toBe(true);
    });

    it('should validate required fields', () => {
      const requiredFields = [
        'clientId',
        'serviceType',
        'description',
        'priority',
        'estimatedDuration',
        'estimatedStartDate',
        'location',
        'contactName',
        'contactPhone',
        'termsAccepted',
      ];

      requiredFields.forEach(field => {
        const invalidData = { ...validServiceFormData };
        delete invalidData[field as keyof typeof invalidData];
        
        const result = serviceRequestFormSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    it('should validate phone number format', () => {
      const validPhones = ['5551234567', '555-123-4567', '(555) 123-4567', '+52 555 123 4567'];
      
      validPhones.forEach(phone => {
        const data = { ...validServiceFormData, contactPhone: phone };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate location minimum length', () => {
      const shortLocation = 'A';
      const invalidData = { ...validServiceFormData, location: shortLocation };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate contact name minimum length', () => {
      const shortName = 'A';
      const invalidData = { ...validServiceFormData, contactName: shortName };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle edge cases for duration', () => {
      // Test zero duration
      const zeroData = { ...validServiceFormData, estimatedDuration: '0' };
      const zeroResult = serviceRequestFormSchema.safeParse(zeroData);
      expect(zeroResult.success).toBe(false);

      // Test negative duration
      const negativeData = { ...validServiceFormData, estimatedDuration: '-5' };
      const negativeResult = serviceRequestFormSchema.safeParse(negativeData);
      expect(negativeResult.success).toBe(false);

      // Test decimal duration
      const decimalData = { ...validServiceFormData, estimatedDuration: '8.5' };
      const decimalResult = serviceRequestFormSchema.safeParse(decimalData);
      expect(decimalResult.success).toBe(true);
    });

    it('should validate maximum description length', () => {
      const longDescription = 'A'.repeat(2001);
      const invalidData = { ...validServiceFormData, description: longDescription };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate maximum notes length', () => {
      const longNotes = 'A'.repeat(1001);
      const invalidData = { ...validServiceFormData, additionalNotes: longNotes };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
