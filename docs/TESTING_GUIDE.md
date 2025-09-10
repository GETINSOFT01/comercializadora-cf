# Testing Guide

## Overview

This document provides comprehensive guidelines for testing in the Comercializadora CF application. Our testing strategy includes unit tests, integration tests, and end-to-end (E2E) tests to ensure code quality, reliability, and maintainability.

## Testing Stack

### Unit & Integration Testing
- **Vitest**: Fast unit test runner with native ESM support
- **React Testing Library**: Testing utilities for React components
- **@testing-library/jest-dom**: Custom Jest matchers for DOM assertions
- **@testing-library/user-event**: User interaction simulation

### E2E Testing
- **Cypress**: End-to-end testing framework
- **Custom commands**: Reusable test utilities

### Code Quality
- **ESLint**: Static code analysis with strict rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files

## Project Structure

```
src/
├── test/
│   ├── setup.ts                 # Test configuration
│   ├── schemas/                 # Schema validation tests
│   ├── hooks/                   # Custom hook tests
│   └── components/              # Component integration tests
cypress/
├── e2e/                         # End-to-end tests
├── support/
│   ├── commands.ts              # Custom Cypress commands
│   └── e2e.ts                   # E2E test setup
└── fixtures/                    # Test data
```

## Unit Testing

### Schema Validation Tests

Test Zod schemas to ensure proper validation:

```typescript
import { describe, it, expect } from 'vitest';
import { loginSchema } from '../../schemas/validation';

describe('loginSchema', () => {
  it('should validate correct login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };
    
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'password123',
    };
    
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

### Custom Hook Tests

Test React hooks using `renderHook`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useServiceForm } from '../../hooks/useServiceForm';

describe('useServiceForm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useServiceForm());
    
    expect(result.current.watch()).toEqual({
      clientId: '',
      serviceType: '',
      // ... other default values
    });
  });

  it('should validate required fields', async () => {
    const { result } = renderHook(() => useServiceForm());

    await act(async () => {
      const submitHandler = result.current.handleSubmit(() => {});
      await submitHandler({} as any);
    });

    expect(result.current.isValid).toBe(false);
  });
});
```

## Integration Testing

### Component Tests

Test complete component behavior including user interactions:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import NewServicePageValidated from '../../pages/services/NewServicePageValidated';

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <SnackbarProvider maxSnack={3}>
      {children}
    </SnackbarProvider>
  </BrowserRouter>
);

describe('NewServicePageValidated', () => {
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/seleccione un cliente/i)).toBeInTheDocument();
    });
  });
});
```

## E2E Testing

### Authentication Flow

```typescript
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should successfully login with valid credentials', () => {
    cy.mockFirebaseAuth();
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
  });
});
```

### Custom Cypress Commands

```typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('fillServiceForm', (serviceData: any) => {
  cy.get('[data-testid="client-select"]').click();
  cy.get(`[data-value="${serviceData.clientId}"]`).click();
  // ... fill other fields
});
```

## Test Data Management

### Mocking Firebase

```typescript
// Mock Firebase Authentication
cy.mockFirebaseAuth();

// Mock Firestore
cy.mockFirestore();

// Mock specific responses
cy.window().then((win) => {
  win.firestore.collection().add = cy.stub().resolves({ id: 'mock-id' });
});
```

### Test Data Attributes

Use `data-testid` attributes for reliable element selection:

```jsx
<TextField
  data-testid="email-input"
  label="Email"
  type="email"
/>

<Button
  data-testid="submit-button"
  type="submit"
>
  Submit
</Button>
```

## Running Tests

### Unit Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### E2E Tests

```bash
# Run E2E tests headlessly
npm run test:e2e

# Open Cypress UI
npm run test:e2e:open
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Check Prettier formatting
npm run format:check

# Format code with Prettier
npm run format
```

## CI/CD Integration

### GitHub Actions

Our CI pipeline runs:

1. **Linting**: ESLint and Prettier checks
2. **Type Checking**: TypeScript compilation
3. **Unit Tests**: Vitest with coverage
4. **E2E Tests**: Cypress tests
5. **Security Scan**: npm audit and dependency checks
6. **Build**: Production build verification

### Pre-commit Hooks

Husky runs these checks before each commit:

1. **lint-staged**: Lint and format staged files
2. **Type checking**: Ensure no TypeScript errors
3. **Tests**: Run tests for changed files
4. **Commit message**: Validate conventional commit format

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use descriptive test names**: Describe what the test does
3. **Test behavior, not implementation**: Focus on user interactions
4. **Keep tests isolated**: Each test should be independent
5. **Use realistic test data**: Mirror production scenarios

### Test Organization

1. **Group related tests**: Use `describe` blocks effectively
2. **Setup and teardown**: Use `beforeEach`/`afterEach` appropriately
3. **Shared utilities**: Create reusable test helpers
4. **Mock external dependencies**: Isolate units under test

### Performance

1. **Parallel execution**: Vitest runs tests in parallel by default
2. **Selective testing**: Use `--findRelatedTests` for changed files
3. **Efficient mocking**: Mock only what's necessary
4. **Clean up**: Properly clean up after tests

## Debugging Tests

### Vitest Debugging

```typescript
// Add debug statements
console.log('Current form state:', result.current.watch());

// Use debugger
debugger;

// Check component state
screen.debug(); // Prints current DOM
```

### Cypress Debugging

```typescript
// Pause execution
cy.pause();

// Debug commands
cy.debug();

// Take screenshots
cy.screenshot('debug-state');

// Log to console
cy.log('Current URL:', cy.url());
```

## Coverage Requirements

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

Critical paths (authentication, form validation, data persistence) should have > 90% coverage.

## Troubleshooting

### Common Issues

1. **Test timeouts**: Increase timeout for async operations
2. **Mock issues**: Ensure mocks are properly reset between tests
3. **DOM cleanup**: Use proper cleanup in React Testing Library
4. **Cypress flakiness**: Add proper waits and assertions

### Performance Issues

1. **Slow tests**: Profile and optimize heavy operations
2. **Memory leaks**: Ensure proper cleanup
3. **Large test suites**: Consider test splitting

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
