import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Firebase
vi.mock('../firebase/config', () => ({
  db: {},
  auth: {},
  functions: {},
}));

// Mock notistack
vi.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: vi.fn(),
    closeSnackbar: vi.fn(),
  }),
  SnackbarProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: ({ children }: { children: React.ReactNode }) => children,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => 
    React.createElement('a', { href: to }, children),
}));

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
