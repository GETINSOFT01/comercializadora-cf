describe('Service Creation Flow', () => {
  beforeEach(() => {
    cy.mockFirebaseAuth();
    cy.mockFirestore();
    cy.login('test@example.com', 'password123');
    cy.visit('/services/new');
  });

  it('should display service creation form', () => {
    cy.get('[data-testid="client-select"]').should('be.visible');
    cy.get('[data-testid="service-type-select"]').should('be.visible');
    cy.get('[data-testid="description-input"]').should('be.visible');
    cy.get('[data-testid="priority-select"]').should('be.visible');
    cy.get('[data-testid="duration-input"]').should('be.visible');
    cy.get('[data-testid="start-date-input"]').should('be.visible');
  });

  it('should validate required fields in step 1', () => {
    cy.get('[data-testid="next-button"]').click();
    
    cy.checkValidationError('client-select', 'Debe seleccionar un cliente');
    cy.checkValidationError('service-type-select', 'El tipo de servicio es requerido');
    cy.checkValidationError('description-input', 'La descripción debe tener al menos 10 caracteres');
  });

  it('should proceed to step 2 when step 1 is valid', () => {
    // Fill step 1
    cy.get('[data-testid="client-select"]').click();
    cy.get('[data-value="client-123"]').click();
    
    cy.get('[data-testid="service-type-select"]').click();
    cy.get('[data-value="Fumigación"]').click();
    
    cy.get('[data-testid="description-input"]').type('Servicio de fumigación para cultivo de maíz en 50 hectáreas');
    cy.get('[data-testid="duration-input"]').type('8');
    cy.fillDate('[data-testid="start-date-input"]', '2025-12-01');
    
    cy.get('[data-testid="next-button"]').click();
    
    // Should be in step 2
    cy.get('[data-testid="location-input"]').should('be.visible');
    cy.get('[data-testid="contact-name-input"]').should('be.visible');
    cy.get('[data-testid="contact-phone-input"]').should('be.visible');
  });

  it('should validate required fields in step 2', () => {
    // Navigate to step 2 first
    cy.fillServiceForm({
      clientId: 'client-123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8'
    });
    
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="next-button"]').click(); // Try to proceed without filling step 2
    
    cy.checkValidationError('location-input', 'La ubicación debe tener al menos 5 caracteres');
    cy.checkValidationError('contact-name-input', 'El nombre del contacto debe tener al menos 2 caracteres');
    cy.checkValidationError('contact-phone-input', 'El teléfono debe tener al menos 10 dígitos');
  });

  it('should validate terms acceptance', () => {
    // Fill both steps but don't accept terms
    cy.fillServiceForm({
      clientId: 'client-123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567'
    });
    
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="next-button"]').click();
    
    cy.checkValidationError('terms-checkbox', 'Debe aceptar los términos y condiciones');
  });

  it('should show confirmation step with form data', () => {
    const serviceData = {
      clientId: 'client-123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz en 50 hectáreas',
      estimatedDuration: '8',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567',
      additionalNotes: 'Acceso por camino de terracería'
    };
    
    cy.fillServiceForm(serviceData);
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="next-button"]').click();
    
    // Should show confirmation with data
    cy.get('[data-testid="confirm-client"]').should('contain', 'client-123');
    cy.get('[data-testid="confirm-service-type"]').should('contain', 'Fumigación');
    cy.get('[data-testid="confirm-description"]').should('contain', serviceData.description);
    cy.get('[data-testid="confirm-location"]').should('contain', serviceData.location);
    cy.get('[data-testid="confirm-contact"]').should('contain', serviceData.contactName);
  });

  it('should successfully create service', () => {
    cy.fillServiceForm({
      clientId: 'client-123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567'
    });
    
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="submit-button"]').click();
    
    // Should show success message and redirect
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.url().should('include', '/services');
  });

  it('should allow navigation between steps', () => {
    // Go to step 2
    cy.fillServiceForm({
      clientId: 'client-123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8'
    });
    cy.get('[data-testid="next-button"]').click();
    
    // Go back to step 1
    cy.get('[data-testid="back-button"]').click();
    
    // Should preserve form data
    cy.get('[data-testid="client-select"]').should('have.value', 'client-123');
    cy.get('[data-testid="description-input"]').should('have.value', 'Servicio de fumigación para cultivo de maíz');
  });

  it('should handle form submission errors', () => {
    // Mock Firestore to reject
    cy.window().then((win) => {
      win.firestore.collection().add = cy.stub().rejects(new Error('Network error'));
    });
    
    cy.fillServiceForm({
      clientId: 'client-123',
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567'
    });
    
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="submit-button"]').click();
    
    // Should show error message
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'Error al crear la solicitud');
  });
});
