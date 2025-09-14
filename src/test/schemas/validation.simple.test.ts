import { describe, it, expect } from 'vitest';
import { loginSchema } from '../../schemas/validation';
import { serviceRequestFormSchema } from '../../schemas/serviceValidation';

describe('Simple Validation Tests', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('serviceRequestFormSchema', () => {
    const validServiceData = {
      clientId: 'client123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      priority: 'media',
      estimatedDuration: '8',
      estimatedStartDate: '2025-12-01',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567',
      additionalNotes: 'Acceso por camino de terracería',
      requiresVisit: 'no',
      termsAccepted: true,
    };

    it('should validate correct service form data', () => {
      const result = serviceRequestFormSchema.safeParse(validServiceData);
      expect(result.success).toBe(true);
    });

    it('should require client selection', () => {
      const invalidData = { ...validServiceData, clientId: '' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should require terms acceptance', () => {
      const invalidData = { ...validServiceData, termsAccepted: false };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('términos y condiciones')
        )).toBe(true);
      }
    });

    it('should validate description length', () => {
      const invalidData = { ...validServiceData, description: 'Short' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('al menos 10 caracteres')
        )).toBe(true);
      }
    });

    it('should validate priority enum', () => {
      const validPriorities = ['baja', 'media', 'alta', 'urgente'];
      
      validPriorities.forEach(priority => {
        const data = { ...validServiceData, priority };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      const invalidData = { ...validServiceData, priority: 'invalid' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate estimated duration', () => {
      // Valid durations
      const validDurations = ['1', '8', '24', '168'];
      validDurations.forEach(duration => {
        const data = { ...validServiceData, estimatedDuration: duration };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      // Invalid durations
      const invalidDurations = ['0', '-5', 'abc', ''];
      invalidDurations.forEach(duration => {
        const data = { ...validServiceData, estimatedDuration: duration };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it('should make additional notes optional', () => {
      const { additionalNotes, ...dataWithoutNotes } = validServiceData;
      
      const result = serviceRequestFormSchema.safeParse(dataWithoutNotes);
      expect(result.success).toBe(true);
    });

    it('should validate contact phone format', () => {
      const validPhones = ['5551234567', '+52 55 1234 5678'];
      validPhones.forEach(phone => {
        const data = { ...validServiceData, contactPhone: phone };
        const result = serviceRequestFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate location minimum length', () => {
      const invalidData = { ...validServiceData, location: 'A' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate contact name format', () => {
      const invalidData = { ...validServiceData, contactName: 'A' };
      const result = serviceRequestFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
