/// <reference types="cypress" />
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
  cy.window().then((win) => {
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
  cy.window().then((win) => {
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
  cy.get(`[data-testid="${fieldTestId}"]`)
    .parent()
    .should('contain.text', errorMessage);
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
      mockFirebaseAuth(): Chainable<void>;
      mockFirestore(): Chainable<void>;
      waitForPageLoad(): Chainable<void>;
      clearForm(): Chainable<void>;
      checkValidationError(fieldTestId: string, errorMessage: string): Chainable<void>;
      fillDate(selector: string, date: string): Chainable<void>;
    }
  }
}
