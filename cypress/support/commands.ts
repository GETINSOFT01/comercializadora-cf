/// <reference types="cypress" />
export {};
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Mock Firebase Authentication for E2E tests
Cypress.Commands.add('mockFirebaseAuth', () => {
  cy.window().then((win: any) => {
    // Mock Firebase auth object
    win.firebase = {
      auth: () => ({
        currentUser: {
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        },
        signInWithEmailAndPassword: cy.stub().resolves({
          user: {
            uid: 'test-user-id',
            email: 'test@example.com'
          }
        }),
        signOut: cy.stub().resolves(),
        onAuthStateChanged: cy.stub()
      })
    };
  });
});

// Mock Firestore for E2E tests
Cypress.Commands.add('mockFirestore', () => {
  cy.window().then((win: any) => {
    win.firestore = {
      collection: cy.stub().returns({
        add: cy.stub().resolves({ id: 'mock-doc-id' }),
        doc: cy.stub().returns({
          get: cy.stub().resolves({
            exists: true,
            data: () => ({ name: 'Mock Data' })
          }),
          set: cy.stub().resolves(),
          update: cy.stub().resolves()
        })
      })
    };
  });
});

// Wait for page to be fully loaded
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-testid="app-loaded"]', { timeout: 10000 }).should('exist');
});

// Clear all form fields
Cypress.Commands.add('clearForm', () => {
  cy.get('input, textarea, select').each(($el) => {
    cy.wrap($el).clear();
  });
});

// Check for validation errors
Cypress.Commands.add('checkValidationError', (fieldTestId: string, errorMessage: string) => {
  // Map legacy data-testids used in specs to current form field names
  const mapField = (id: string): string | null => {
    const simpleMap: Record<string, string> = {
      'description-input': 'description',
      'duration-input': 'estimatedDuration',
      'start-date-input': 'estimatedStartDate',
      'location-input': 'location',
      'contact-name-input': 'contactName',
      'contact-phone-input': 'contactPhone',
      'postal-code-input': 'address.zipCode',
      'street-input': 'address.street',
      'city-input': 'address.city',
      'state-input': 'address.state',
      'client-name-input': 'name',
      'email-input': 'email',
      'password-input': 'password',
    };
    if (simpleMap[id]) return simpleMap[id];
    // Contacts pattern: contact-email-0 -> contacts.0.email
    const contactEmail = id.match(/^contact-email-(\d+)$/);
    if (contactEmail) return `contacts.${contactEmail[1]}.email`;
    const contactName = id.match(/^contact-name-(\d+)$/);
    if (contactName) return `contacts.${contactName[1]}.name`;
    const contactPhone = id.match(/^contact-phone-(\d+)$/);
    if (contactPhone) return `contacts.${contactPhone[1]}.phone`;
    const contactRole = id.match(/^contact-role-(\d+)$/);
    if (contactRole) return `contacts.${contactRole[1]}.role`;
    return null;
  };

  const fieldName = mapField(fieldTestId);

  if (fieldName) {
    cy.get(`[name="${fieldName}"]`).parent().should('contain.text', errorMessage);
  } else {
    // Fallback to data-testid if present
    cy.get(`[data-testid="${fieldTestId}"]`).parent().should('contain.text', errorMessage);
  }
});

// Fill date input (handles different date input types)
Cypress.Commands.add('fillDate', (selector: string, date: string) => {
  cy.get(selector).then(($input) => {
    if ($input.attr('type') === 'date') {
      cy.wrap($input).type(date);
    } else {
      cy.wrap($input).click();
      cy.get('.MuiPickersDay-root').contains(date.split('-')[2]).click();
    }
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable;
      logout(): Chainable;
      mockFirebaseAuth(): Chainable;
      mockFirestore(): Chainable;
      waitForPageLoad(): Chainable;
      clearForm(): Chainable;
      checkValidationError(fieldTestId: string, errorMessage: string): Chainable;
      fillDate(selector: string, date: string): Chainable;
      selectClientByName(name: string): Chainable;
      selectServiceType(type: string): Chainable;
      selectPriority(priority: 'baja'|'media'|'alta'|'urgente'): Chainable;
      fillServiceForm(data: {
        clientId?: string;
        serviceType?: string;
        description?: string;
        estimatedDuration?: string;
        estimatedStartDate?: string;
        location?: string;
        contactName?: string;
        contactPhone?: string;
        additionalNotes?: string;
      }): Chainable;
    }
  }
}

// Select client from the list by visible text (matches Mock Client 1 from intercepts)
Cypress.Commands.add('selectClientByName', (name: string) => {
  // Wait for potential loading spinner to disappear
  cy.get('body').then(($body) => {
    if ($body.find('.MuiCircularProgress-root').length) {
      cy.get('.MuiCircularProgress-root', { timeout: 10000 }).should('not.exist');
    }
  });
  // Click the first available client in the list
  cy.get('li .MuiListItemButton-root', { timeout: 10000 }).first().click({ force: true });
});

// Select service type using MUI Select with labelId
Cypress.Commands.add('selectServiceType', (type: string) => {
  cy.get('#service-type-label')
    .parents('.MuiFormControl-root')
    .find('[role="button"]')
    .first()
    .click();
  cy.get('li').contains(type).click();
});

// Select priority using MUI Select with labelId
Cypress.Commands.add('selectPriority', (priority: 'baja'|'media'|'alta'|'urgente') => {
  cy.get('#priority-label')
    .parents('.MuiFormControl-root')
    .find('[role="button"]')
    .first()
    .click();
  cy.get('li').contains(new RegExp(`^${priority}$`, 'i')).click();
});

// Fill service form fields using name attributes
Cypress.Commands.add('fillServiceForm', (data) => {
  if (data.serviceType) cy.selectServiceType(data.serviceType);
  if (data.description) cy.get('[name="description"]').type(data.description, { delay: 0 });
  if (data.estimatedDuration) cy.get('[name="estimatedDuration"]').type(data.estimatedDuration, { delay: 0 });
  if (data.estimatedStartDate) cy.get('[name="estimatedStartDate"]').type(data.estimatedStartDate);
  if (data.location) cy.get('[name="location"]').type(data.location, { delay: 0 });
  if (data.contactName) cy.get('[name="contactName"]').type(data.contactName, { delay: 0 });
  if (data.contactPhone) cy.get('[name="contactPhone"]').type(data.contactPhone, { delay: 0 });
  if (data.additionalNotes) cy.get('[name="additionalNotes"]').type(data.additionalNotes, { delay: 0 });
});
