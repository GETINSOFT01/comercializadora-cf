describe('Client Management Flow', () => {
  beforeEach(() => {
    cy.mockFirebaseAuth();
    cy.mockFirestore();
    cy.login('test@example.com', 'password123');
  });

  describe('Client Creation', () => {
    beforeEach(() => {
      cy.visit('/clients/new');
    });

    it('should display client creation form', () => {
      cy.get('[data-testid="client-name-input"]').should('be.visible');
      cy.get('[data-testid="business-name-input"]').should('be.visible');
      cy.get('[data-testid="tax-id-input"]').should('be.visible');
      cy.get('[data-testid="street-input"]').should('be.visible');
      cy.get('[data-testid="city-input"]').should('be.visible');
      cy.get('[data-testid="state-input"]').should('be.visible');
      cy.get('[data-testid="postal-code-input"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('[data-testid="save-client-button"]').click();
      
      cy.checkValidationError('client-name-input', 'El nombre del cliente es requerido');
      cy.checkValidationError('street-input', 'La calle es requerida');
      cy.checkValidationError('city-input', 'La ciudad es requerida');
      cy.checkValidationError('state-input', 'El estado es requerido');
      cy.checkValidationError('postal-code-input', 'El código postal es requerido');
    });

    it('should validate email format in contacts', () => {
      cy.get('[data-testid="contact-email-0"]').type('invalid-email');
      cy.get('[data-testid="save-client-button"]').click();
      
      cy.checkValidationError('contact-email-0', 'Correo electrónico inválido');
    });

    it('should validate postal code format', () => {
      cy.get('[data-testid="postal-code-input"]').type('123');
      cy.get('[data-testid="save-client-button"]').click();
      
      cy.checkValidationError('postal-code-input', 'debe tener exactamente 5 dígitos');
    });

    it('should add and remove contacts', () => {
      // Initially should have one contact
      cy.get('[data-testid="contact-0"]').should('exist');
      cy.get('[data-testid="contact-1"]').should('not.exist');
      
      // Add contact
      cy.get('[data-testid="add-contact-button"]').click();
      cy.get('[data-testid="contact-1"]').should('exist');
      
      // Remove contact
      cy.get('[data-testid="remove-contact-1"]').click();
      cy.get('[data-testid="contact-1"]').should('not.exist');
    });

    it('should not allow removing the last contact', () => {
      cy.get('[data-testid="remove-contact-0"]').click();
      cy.get('[data-testid="contact-0"]').should('exist');
      cy.get('[data-testid="warning-message"]').should('contain', 'Debe mantener al menos un contacto');
    });

    it('should set primary contact', () => {
      // Add second contact
      cy.get('[data-testid="add-contact-button"]').click();
      
      // First contact should be primary by default
      cy.get('[data-testid="primary-contact-0"]').should('be.checked');
      cy.get('[data-testid="primary-contact-1"]').should('not.be.checked');
      
      // Set second contact as primary
      cy.get('[data-testid="primary-contact-1"]').click();
      cy.get('[data-testid="primary-contact-0"]').should('not.be.checked');
      cy.get('[data-testid="primary-contact-1"]').should('be.checked');
    });

    it('should successfully create client', () => {
      cy.get('[data-testid="client-name-input"]').type('Test Client');
      cy.get('[data-testid="business-name-input"]').type('Test Business S.A. de C.V.');
      cy.get('[data-testid="tax-id-input"]').type('ABC123456XYZ');
      
      cy.get('[data-testid="street-input"]').type('Calle Principal 123');
      cy.get('[data-testid="city-input"]').type('Ciudad de México');
      cy.get('[data-testid="state-input"]').type('Ciudad de México');
      cy.get('[data-testid="postal-code-input"]').type('12345');
      
      cy.get('[data-testid="contact-name-0"]').type('Juan Pérez');
      cy.get('[data-testid="contact-email-0"]').type('juan@testclient.com');
      cy.get('[data-testid="contact-phone-0"]').type('5551234567');
      cy.get('[data-testid="contact-role-0"]').type('Gerente');
      
      cy.get('[data-testid="save-client-button"]').click();
      
      cy.get('[data-testid="success-message"]').should('be.visible');
      cy.url().should('include', '/clients');
    });
  });

  describe('Client Listing', () => {
    beforeEach(() => {
      cy.visit('/clients');
    });

    it('should display clients list', () => {
      cy.get('[data-testid="clients-table"]').should('be.visible');
      cy.get('[data-testid="new-client-button"]').should('be.visible');
      cy.get('[data-testid="search-input"]').should('be.visible');
    });

    it('should filter clients by search', () => {
      cy.get('[data-testid="search-input"]').type('Test Client');
      cy.get('[data-testid="client-row"]').should('contain', 'Test Client');
    });

    it('should navigate to client details', () => {
      cy.get('[data-testid="client-row"]').first().click();
      cy.url().should('include', '/clients/');
    });

    it('should navigate to new client form', () => {
      cy.get('[data-testid="new-client-button"]').click();
      cy.url().should('include', '/clients/new');
    });
  });

  describe('Client Editing', () => {
    beforeEach(() => {
      // Mock existing client data
      cy.window().then((win) => {
        win.firestore.collection().doc().get = cy.stub().resolves({
          exists: true,
          data: () => ({
            name: 'Existing Client',
            businessName: 'Existing Business',
            taxId: 'EXI123456STI',
            address: {
              street: 'Existing Street 456',
              city: 'Existing City',
              state: 'Existing State',
              zipCode: '54321',
              country: 'México'
            },
            contacts: [{
              name: 'Jane Doe',
              email: 'jane@existing.com',
              phone: '5559876543',
              role: 'Manager'
            }]
          })
        });
      });
      
      cy.visit('/clients/existing-client-id');
    });

    it('should load existing client data', () => {
      cy.get('[data-testid="client-name-input"]').should('have.value', 'Existing Client');
      cy.get('[data-testid="business-name-input"]').should('have.value', 'Existing Business');
      cy.get('[data-testid="tax-id-input"]').should('have.value', 'EXI123456STI');
      cy.get('[data-testid="contact-name-0"]').should('have.value', 'Jane Doe');
    });

    it('should update client successfully', () => {
      cy.get('[data-testid="client-name-input"]').clear().type('Updated Client');
      cy.get('[data-testid="update-client-button"]').click();
      
      cy.get('[data-testid="success-message"]').should('be.visible');
      cy.get('[data-testid="success-message"]').should('contain', 'Cliente actualizado');
    });
  });
});
