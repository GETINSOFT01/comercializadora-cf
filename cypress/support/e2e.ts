// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import { setupFirebaseMocks, interceptFirebaseRequests } from './firebase-mock'

// Prevent Firebase errors from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore Firebase configuration errors in E2E tests
  if (err.message.includes('Firebase') || 
      err.message.includes('auth/invalid-api-key') ||
      err.message.includes('auth/network-request-failed') ||
      err.message.includes('firestore')) {
    return false;
  }
  return true;
});

// Setup Firebase mocks before each test
beforeEach(() => {
  setupFirebaseMocks();
  interceptFirebaseRequests();
});

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for authentication
Cypress.Commands.add('login', (email: string, password: string) => {
  // In DEMO_MODE the app auto-authenticates. Go directly to home.
  cy.visit('/');
  // Confirm we are not on the login page
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Add custom commands for form interactions
Cypress.Commands.add('fillServiceForm', (serviceData: any) => {
  // Assumes we are already on the form. For step 1, select type and fill fields
  if (serviceData.serviceType) {
    cy.selectServiceType(serviceData.serviceType);
  }
  if (serviceData.description) {
    cy.get('[name="description"]').type(serviceData.description, { delay: 0 });
  }
  if (serviceData.estimatedDuration) {
    cy.get('[name="estimatedDuration"]').type(serviceData.estimatedDuration, { delay: 0 });
  }
  if (serviceData.estimatedStartDate) {
    cy.get('[name="estimatedStartDate"]').type(serviceData.estimatedStartDate);
  }
  if (serviceData.location) {
    cy.get('[name="location"]').type(serviceData.location, { delay: 0 });
  }
  if (serviceData.contactName) {
    cy.get('[name="contactName"]').type(serviceData.contactName, { delay: 0 });
  }
  if (serviceData.contactPhone) {
    cy.get('[name="contactPhone"]').type(serviceData.contactPhone, { delay: 0 });
  }
  if (serviceData.additionalNotes) {
    cy.get('[name="additionalNotes"]').type(serviceData.additionalNotes, { delay: 0 });
  }
});

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      fillServiceForm(serviceData: any): Chainable<void>;
    }
  }
}
