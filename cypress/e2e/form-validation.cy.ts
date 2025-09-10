describe('Form Validation E2E', () => {
  beforeEach(() => {
    cy.mockFirebaseAuth();
    cy.mockFirestore();
    cy.login('test@example.com', 'password123');
  });

  describe('Service Form Validation', () => {
    beforeEach(() => {
      cy.visit('/services/new');
    });

    it('should show real-time validation errors', () => {
      // Test description length validation
      cy.get('[data-testid="description-input"]').type('Short');
      cy.get('[data-testid="description-input"]').blur();
      cy.checkValidationError('description-input', 'al menos 10 caracteres');
      
      // Fix the error
      cy.get('[data-testid="description-input"]').clear().type('This is a valid description with enough characters');
      cy.get('[data-testid="description-input"]').blur();
      cy.get('[data-testid="description-input"]').parent().should('not.contain', 'al menos 10 caracteres');
    });

    it('should validate duration as positive number', () => {
      cy.get('[data-testid="duration-input"]').type('-5');
      cy.get('[data-testid="duration-input"]').blur();
      cy.checkValidationError('duration-input', 'Debe ser un número positivo');
      
      cy.get('[data-testid="duration-input"]').clear().type('abc');
      cy.get('[data-testid="duration-input"]').blur();
      cy.checkValidationError('duration-input', 'Debe ser un número positivo');
      
      cy.get('[data-testid="duration-input"]').clear().type('8');
      cy.get('[data-testid="duration-input"]').blur();
      cy.get('[data-testid="duration-input"]').parent().should('not.contain', 'Debe ser un número positivo');
    });

    it('should validate future dates only', () => {
      cy.fillDate('[data-testid="start-date-input"]', '2020-01-01');
      cy.get('[data-testid="start-date-input"]').blur();
      cy.checkValidationError('start-date-input', 'La fecha no puede ser en el pasado');
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      cy.fillDate('[data-testid="start-date-input"]', futureDateString);
      cy.get('[data-testid="start-date-input"]').blur();
      cy.get('[data-testid="start-date-input"]').parent().should('not.contain', 'La fecha no puede ser en el pasado');
    });

    it('should validate contact phone format', () => {
      // Navigate to step 2
      cy.fillServiceForm({
        clientId: 'client-123',
        serviceType: 'Fumigación',
        description: 'Valid description with enough characters',
        estimatedDuration: '8'
      });
      cy.get('[data-testid="next-button"]').click();
      
      // Test invalid phone formats
      cy.get('[data-testid="contact-phone-input"]').type('123');
      cy.get('[data-testid="contact-phone-input"]').blur();
      cy.checkValidationError('contact-phone-input', 'El teléfono debe tener al menos 10 dígitos');
      
      // Test valid phone format
      cy.get('[data-testid="contact-phone-input"]').clear().type('5551234567');
      cy.get('[data-testid="contact-phone-input"]').blur();
      cy.get('[data-testid="contact-phone-input"]').parent().should('not.contain', 'El teléfono debe tener al menos 10 dígitos');
    });
  });

  describe('Client Form Validation', () => {
    beforeEach(() => {
      cy.visit('/clients/new');
    });

    it('should validate email format in real-time', () => {
      cy.get('[data-testid="contact-email-0"]').type('invalid-email');
      cy.get('[data-testid="contact-email-0"]').blur();
      cy.checkValidationError('contact-email-0', 'Correo electrónico inválido');
      
      cy.get('[data-testid="contact-email-0"]').clear().type('valid@example.com');
      cy.get('[data-testid="contact-email-0"]').blur();
      cy.get('[data-testid="contact-email-0"]').parent().should('not.contain', 'Correo electrónico inválido');
    });

    it('should validate postal code format', () => {
      cy.get('[data-testid="postal-code-input"]').type('123');
      cy.get('[data-testid="postal-code-input"]').blur();
      cy.checkValidationError('postal-code-input', 'debe tener exactamente 5 dígitos');
      
      cy.get('[data-testid="postal-code-input"]').clear().type('12345');
      cy.get('[data-testid="postal-code-input"]').blur();
      cy.get('[data-testid="postal-code-input"]').parent().should('not.contain', 'debe tener exactamente 5 dígitos');
    });

    it('should validate name format (letters only)', () => {
      cy.get('[data-testid="contact-name-0"]').type('John123');
      cy.get('[data-testid="contact-name-0"]').blur();
      cy.checkValidationError('contact-name-0', 'solo puede contener letras y espacios');
      
      cy.get('[data-testid="contact-name-0"]').clear().type('John Doe');
      cy.get('[data-testid="contact-name-0"]').blur();
      cy.get('[data-testid="contact-name-0"]').parent().should('not.contain', 'solo puede contener letras y espacios');
    });

    it('should validate multiple contacts independently', () => {
      // Add second contact
      cy.get('[data-testid="add-contact-button"]').click();
      
      // Set invalid emails for both
      cy.get('[data-testid="contact-email-0"]').type('invalid1');
      cy.get('[data-testid="contact-email-1"]').type('invalid2');
      
      cy.get('[data-testid="contact-email-0"]').blur();
      cy.get('[data-testid="contact-email-1"]').blur();
      
      // Both should show errors
      cy.checkValidationError('contact-email-0', 'Correo electrónico inválido');
      cy.checkValidationError('contact-email-1', 'Correo electrónico inválido');
      
      // Fix first email
      cy.get('[data-testid="contact-email-0"]').clear().type('valid1@example.com');
      cy.get('[data-testid="contact-email-0"]').blur();
      
      // First should be valid, second still invalid
      cy.get('[data-testid="contact-email-0"]').parent().should('not.contain', 'Correo electrónico inválido');
      cy.checkValidationError('contact-email-1', 'Correo electrónico inválido');
    });
  });

  describe('Login Form Validation', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('should validate email format in real-time', () => {
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="email-input"]').blur();
      cy.checkValidationError('email-input', 'Formato de email inválido');
      
      cy.get('[data-testid="email-input"]').clear().type('valid@example.com');
      cy.get('[data-testid="email-input"]').blur();
      cy.get('[data-testid="email-input"]').parent().should('not.contain', 'Formato de email inválido');
    });

    it('should validate password length', () => {
      cy.get('[data-testid="password-input"]').type('123');
      cy.get('[data-testid="password-input"]').blur();
      cy.checkValidationError('password-input', 'La contraseña debe tener al menos 6 caracteres');
      
      cy.get('[data-testid="password-input"]').clear().type('password123');
      cy.get('[data-testid="password-input"]').blur();
      cy.get('[data-testid="password-input"]').parent().should('not.contain', 'La contraseña debe tener al menos 6 caracteres');
    });

    it('should disable submit button when form is invalid', () => {
      cy.get('[data-testid="login-button"]').should('be.disabled');
      
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('123');
      cy.get('[data-testid="login-button"]').should('be.disabled');
      
      cy.get('[data-testid="email-input"]').clear().type('valid@example.com');
      cy.get('[data-testid="password-input"]').clear().type('password123');
      cy.get('[data-testid="login-button"]').should('not.be.disabled');
    });
  });

  describe('Error Boundary Testing', () => {
    it('should handle form submission errors gracefully', () => {
      cy.visit('/services/new');
      
      // Mock network error
      cy.window().then((win) => {
        win.firestore.collection().add = cy.stub().rejects(new Error('Network error'));
      });
      
      cy.fillServiceForm({
        clientId: 'client-123',
        serviceType: 'Fumigación',
        description: 'Valid description with enough characters',
        estimatedDuration: '8',
        location: 'Test Location',
        contactName: 'John Doe',
        contactPhone: '5551234567'
      });
      
      cy.get('[data-testid="next-button"]').click();
      cy.get('[data-testid="next-button"]').click();
      cy.get('[data-testid="submit-button"]').click();
      
      // Should show error message without crashing
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'Error al crear la solicitud');
      
      // Form should still be functional
      cy.get('[data-testid="submit-button"]').should('be.visible');
    });

    it('should handle validation errors from server', () => {
      cy.visit('/clients/new');
      
      // Mock server validation error
      cy.window().then((win) => {
        win.firestore.collection().add = cy.stub().rejects({
          code: 'invalid-argument',
          message: 'Invalid client data'
        });
      });
      
      cy.get('[data-testid="client-name-input"]').type('Test Client');
      cy.get('[data-testid="street-input"]').type('Test Street');
      cy.get('[data-testid="city-input"]').type('Test City');
      cy.get('[data-testid="state-input"]').type('Test State');
      cy.get('[data-testid="postal-code-input"]').type('12345');
      cy.get('[data-testid="contact-name-0"]').type('John Doe');
      cy.get('[data-testid="contact-email-0"]').type('john@example.com');
      
      cy.get('[data-testid="save-client-button"]').click();
      
      // Should show server error
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('[data-testid="error-message"]').should('contain', 'Error al guardar el cliente');
    });
  });
});
