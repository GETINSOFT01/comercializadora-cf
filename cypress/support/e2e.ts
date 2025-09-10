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
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

// Add custom commands for form interactions
Cypress.Commands.add('fillServiceForm', (serviceData: any) => {
  cy.get('[data-testid="client-select"]').click();
  cy.get(`[data-value="${serviceData.clientId}"]`).click();
  
  cy.get('[data-testid="service-type-select"]').click();
  cy.get(`[data-value="${serviceData.serviceType}"]`).click();
  
  cy.get('[data-testid="description-input"]').type(serviceData.description);
  cy.get('[data-testid="duration-input"]').type(serviceData.estimatedDuration);
  cy.get('[data-testid="location-input"]').type(serviceData.location);
  cy.get('[data-testid="contact-name-input"]').type(serviceData.contactName);
  cy.get('[data-testid="contact-phone-input"]').type(serviceData.contactPhone);
  
  if (serviceData.additionalNotes) {
    cy.get('[data-testid="notes-input"]').type(serviceData.additionalNotes);
  }
  
  cy.get('[data-testid="terms-checkbox"]').check();
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
