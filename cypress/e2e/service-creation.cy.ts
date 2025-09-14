describe('Service Creation Flow', () => {
  beforeEach(() => {
    cy.mockFirebaseAuth();
    cy.mockFirestore();
    cy.login('test@example.com', 'password123');
    cy.visit('/services/new');
  });

  it('should display service creation form', () => {
    // Step 0: client selection list and search field
    cy.contains('h6', 'Seleccione un Cliente').should('be.visible');
    cy.get('input[placeholder="Buscar cliente..."]').should('be.visible');
    // Step 1 elements (rendered when step changes)
    cy.contains('button', 'Siguiente').should('be.disabled');
  });

  it('should validate required fields in step 1', () => {
    cy.contains('button', 'Siguiente').click();
    // Expect client selection error
    cy.contains('Debe seleccionar un cliente').should('be.visible');
  });

  it('should proceed to step 2 when step 1 is valid', () => {
    // Step 0: select client, then go to step 1
    cy.selectClientByName('Mock Client 1');
    cy.contains('button', 'Siguiente').click();
    // Step 1: fill fields and proceed
    cy.selectServiceType('Fumigación');
    cy.get('[name="description"]').type('Servicio de fumigación para cultivo de maíz en 50 hectáreas');
    cy.get('[name="estimatedDuration"]').type('8');
    cy.get('[name="estimatedStartDate"]').type('2025-12-01');
    cy.contains('button', 'Siguiente').click();
    
    // Should be in step 2
    cy.get('[name="location"]').should('be.visible');
    cy.get('[name="contactName"]').should('be.visible');
    cy.get('[name="contactPhone"]').should('be.visible');
  });

  it('should validate required fields in step 2', () => {
    // Navigate to step 2 first
    cy.selectClientByName('Mock Client 1');
    cy.contains('button', 'Siguiente').click();
    cy.selectServiceType('Fumigación');
    cy.get('[name="description"]').type('Servicio de fumigación para cultivo de maíz');
    cy.get('[name="estimatedDuration"]').type('8');
    cy.contains('button', 'Siguiente').click();
    // Try to proceed without filling step 2 fields
    cy.contains('button', 'Siguiente').click();
    // Check errors by helper mapping to field names
    cy.checkValidationError('location-input', 'La ubicación debe tener al menos 5 caracteres');
    cy.checkValidationError('contact-name-input', 'El nombre del contacto debe tener al menos 2 caracteres');
    cy.checkValidationError('contact-phone-input', 'El teléfono debe tener al menos 10 dígitos');
  });

  it('should validate terms acceptance', () => {
    // Fill both steps but don't accept terms
    cy.selectClientByName('Mock Client 1');
    cy.selectServiceType('Fumigación');
    cy.get('[name="description"]').type('Servicio de fumigación para cultivo de maíz');
    cy.get('[name="estimatedDuration"]').type('8');
    cy.contains('button', 'Siguiente').click();
    cy.get('[name="location"]').type('Campo Norte, Parcela 5');
    cy.get('[name="contactName"]').type('Juan Pérez');
    cy.get('[name="contactPhone"]').type('5551234567');
    cy.contains('button', 'Siguiente').click();
    // Expect terms error shown by helper text
    cy.contains('Debe aceptar los términos y condiciones').should('be.visible');
  });

  it('should show confirmation step with form data', () => {
    const serviceData = {
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz en 50 hectáreas',
      estimatedDuration: '8',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567',
      additionalNotes: 'Acceso por camino de terracería'
    };
    
    cy.selectClientByName('Mock Client 1');
    cy.contains('button', 'Siguiente').click();
    cy.fillServiceForm(serviceData);
    cy.contains('button', 'Siguiente').click();
    cy.contains('button', 'Siguiente').click();
    
    // Should show confirmation with data
    cy.contains('Cliente:').parent().should('contain', 'Mock Client 1');
    cy.contains('Tipo de Servicio:').parent().should('contain', 'Fumigación');
    cy.contains('Descripción:').parent().should('contain', serviceData.description);
    cy.contains('Ubicación:').parent().should('contain', serviceData.location);
    cy.contains('Contacto:').parent().should('contain', serviceData.contactName);
  });

  it('should successfully create service', () => {
    cy.selectClientByName('Mock Client 1');
    cy.contains('button', 'Siguiente').click();
    cy.fillServiceForm({
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567'
    });
    
    cy.contains('button', 'Siguiente').click();
    cy.contains('button', 'Siguiente').click();
    // aceptar términos
    cy.get('input[name="termsAccepted"]').check({ force: true });
    cy.contains('button', 'Guardar Solicitud').click();
    
    // Should show success message and redirect
    cy.contains(/Guardando|Solicitud/i).should('exist');
    cy.url().should('include', '/services');
  });

  it('should allow navigation between steps', () => {
    // Go to step 2
    cy.selectClientByName('Mock Client 1');
    cy.contains('button', 'Siguiente').click();
    cy.fillServiceForm({
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8'
    });
    cy.contains('button', 'Siguiente').click();
    
    // Go back to step 1
    cy.contains('button', 'Atrás').click();
    
    // Should preserve form data
    cy.get('[name="description"]').should('have.value', 'Servicio de fumigación para cultivo de maíz');
  });

  it('should handle form submission errors', () => {
    // Mock Firestore to reject
    cy.window().then((win) => {
      (win as any).firestore.collection().add = cy.stub().rejects(new Error('Network error'));
    });
    
    cy.selectClientByName('Mock Client 1');
    cy.fillServiceForm({
      serviceType: 'Fumigación',
      description: 'Servicio de fumigación para cultivo de maíz',
      estimatedDuration: '8',
      location: 'Campo Norte, Parcela 5',
      contactName: 'Juan Pérez',
      contactPhone: '5551234567'
    });
    
    cy.contains('button', 'Siguiente').click();
    cy.contains('button', 'Siguiente').click();
    cy.get('input[name="termsAccepted"]').check({ force: true });
    cy.contains('button', 'Guardar Solicitud').click();
    
    // Should show error message
    cy.contains(/Error al crear la solicitud|Error/i).should('be.visible');
  });
});
