describe('Basic Navigation', () => {
  it('should load the application', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.title().should('not.be.empty');
  });

  it('should navigate to login page', () => {
    cy.visit('/login');
    cy.url().should('include', '/login');
    cy.get('body').should('be.visible');
    
    // Debug: log what's actually on the page
    cy.get('body').then(($body) => {
      cy.log('Page content:', $body.text());
    });
    
    // Look for any form elements
    cy.get('form').should('exist');
    cy.get('input').should('have.length.at.least', 2);
    cy.get('button').should('exist');
  });

  it('should show login form elements', () => {
    cy.visit('/login');
    cy.wait(3000); // Give more time for loading
    
    // Try different selectors
    cy.get('input[name="email"], input[id="email"], input[type="email"]').should('exist');
    cy.get('input[name="password"], input[id="password"], input[type="password"]').should('exist');
    cy.get('button[type="submit"], button:contains("Iniciar")').should('exist');
  });
});
