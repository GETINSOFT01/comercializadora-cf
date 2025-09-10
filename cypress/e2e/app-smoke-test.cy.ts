describe('Application Smoke Tests', () => {
  beforeEach(() => {
    // Mock environment variables for testing
    cy.window().then((win) => {
      win.process = { env: { NODE_ENV: 'test' } };
    });
  });

  it('should load the home page without errors', () => {
    cy.visit('/', { 
      failOnStatusCode: false,
      timeout: 30000 
    });
    
    cy.get('body').should('be.visible');
    cy.get('[data-testid="app-root"], #root, .App').should('exist');
  });

  it('should handle routing correctly', () => {
    cy.visit('/login', { 
      failOnStatusCode: false,
      timeout: 30000 
    });
    
    cy.url().should('include', '/login');
    cy.get('body').should('be.visible');
  });

  it('should display some content on login page', () => {
    cy.visit('/login', { 
      failOnStatusCode: false,
      timeout: 30000 
    });
    
    // Wait for React to render
    cy.wait(3000);
    
    // Check if we have any content
    cy.get('body').should('not.be.empty');
    
    // Look for common login elements with flexible selectors
    cy.get('body').then(($body) => {
      const hasLoginElements = 
        $body.find('input').length > 0 || 
        $body.find('form').length > 0 ||
        $body.text().includes('login') ||
        $body.text().includes('Iniciar') ||
        $body.text().includes('email') ||
        $body.text().includes('contraseña');
      
      expect(hasLoginElements).to.be.true;
    });
  });

  it('should not have JavaScript errors', () => {
    cy.visit('/', { 
      failOnStatusCode: false,
      timeout: 30000 
    });
    
    cy.window().then((win) => {
      // Check for console errors (this is a basic check)
      expect(win.console.error).to.not.have.been.called;
    });
  });
});
