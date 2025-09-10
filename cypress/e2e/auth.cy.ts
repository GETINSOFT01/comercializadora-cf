describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.wait(2000); // Wait for page to load completely
  });

  it('should display login form', () => {
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
    cy.contains('Iniciar Sesión').should('be.visible');
  });

  it('should show validation errors for empty fields', () => {
    cy.get('button[type="submit"]').click();
    cy.wait(500);
    cy.get('#email-helper-text').should('contain', 'String must contain at least 1 character(s)');
    cy.get('#password-helper-text').should('contain', 'String must contain at least 6 character(s)');
  });

  it('should show error for invalid email format', () => {
    cy.get('#email').type('invalid-email');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait(500);
    cy.get('#email-helper-text').should('contain', 'Invalid email');
  });

  it('should show error for short password', () => {
    cy.get('#email').clear().type('test@example.com');
    cy.get('#password').clear().type('123');
    cy.get('button[type="submit"]').click();
    cy.wait(500);
    cy.get('#password-helper-text').should('contain', 'String must contain at least 6 character(s)');
  });

  it('should successfully login with valid credentials', () => {
    cy.get('#email').type('test@example.com');
    cy.get('#password').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Should redirect to dashboard or home
    cy.url().should('not.include', '/login');
    cy.wait(2000);
    cy.url().should('match', /\/(dashboard|$)/);
  });

  it('should redirect to login when accessing protected route without auth', () => {
    cy.window().then((win) => {
      // Clear any existing auth state
      win.localStorage.clear();
      win.sessionStorage.clear();
    });
    cy.visit('/services');
    cy.wait(2000);
    cy.url().should('include', '/login');
  });
});
