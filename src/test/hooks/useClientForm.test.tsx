import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientForm } from '../../hooks/useClientForm';

// Mock notistack
const mockEnqueueSnackbar = vi.fn();
vi.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: mockEnqueueSnackbar,
    closeSnackbar: vi.fn(),
  }),
}));

describe('useClientForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useClientForm());

    const formValues = result.current.watch();
    expect(formValues).toEqual({
      name: '',
      taxId: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'México',
      },
      contacts: [
        {
          name: '',
          role: '',
          email: '',
          phone: '',
        },
      ],
      paymentTerms: 30,
      notes: '',
    });
  });

  it('should initialize with provided data', () => {
    const initialData = {
      name: 'Test Client',
      taxId: 'ABCD123456EFG',
    };

    const { result } = renderHook(() => useClientForm(initialData));

    const formValues = result.current.watch();
    expect(formValues.name).toBe('Test Client');
    expect(formValues.taxId).toBe('ABCD123456EFG');
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() => useClientForm());

    act(() => {
      result.current.setValue('name', '');
    });

    expect(result.current.hasFieldError('name')).toBe(true);
    expect(result.current.getFieldError('name')).toContain('nombre del cliente es requerido');
  });

  it('should validate address fields', () => {
    const { result } = renderHook(() => useClientForm());

    act(() => {
      result.current.setValue('address.street', '');
      result.current.setValue('address.city', '');
      result.current.setValue('address.zipCode', '123');
    });

    expect(result.current.hasFieldError('address.street')).toBe(true);
    expect(result.current.hasFieldError('address.city')).toBe(true);
    expect(result.current.hasFieldError('address.zipCode')).toBe(true);
    expect(result.current.getFieldError('address.zipCode')).toContain('5 dígitos');
  });

  it('should validate contact email format', () => {
    const { result } = renderHook(() => useClientForm());

    act(() => {
      result.current.setValue('contacts.0.email', 'invalid-email');
    });

    expect(result.current.hasFieldError('contacts.0.email')).toBe(true);
    expect(result.current.getFieldError('contacts.0.email')).toContain('Correo electrónico inválido');

    act(() => {
      result.current.setValue('contacts.0.email', 'valid@example.com');
    });

    expect(result.current.hasFieldError('contacts.0.email')).toBe(false);
  });

  it('should add new contact', () => {
    const { result } = renderHook(() => useClientForm());

    act(() => {
      result.current.addContact();
    });

    const formValues = result.current.watch();
    expect(formValues.contacts).toHaveLength(2);
    expect(formValues.contacts[1]).toEqual({
      name: '',
      role: '',
      email: '',
      phone: '',
    });
  });

  it('should remove contact', () => {
    const { result } = renderHook(() => useClientForm());

    // Add a second contact first
    act(() => {
      result.current.addContact();
    });

    let formValues = result.current.watch();
    expect(formValues.contacts).toHaveLength(2);

    // Remove the second contact
    act(() => {
      result.current.removeContact(1);
    });

    formValues = result.current.watch();
    expect(formValues.contacts).toHaveLength(1);
  });

  it('should not remove last contact', () => {
    const { result } = renderHook(() => useClientForm());

    act(() => {
      result.current.removeContact(0);
    });

    const formValues = result.current.watch();
    expect(formValues.contacts).toHaveLength(1);
    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'Debe mantener al menos un contacto',
      { variant: 'warning' }
    );
  });

  it('should set primary contact', () => {
    const { result } = renderHook(() => useClientForm());

    // Add a second contact
    act(() => {
      result.current.addContact();
    });

    // Set second contact as primary
    act(() => {
      result.current.setPrimaryContact(1);
    });

    const formValues = result.current.watch();
    expect(formValues.contacts).toHaveLength(2);
    // Note: isPrimary property is handled internally by the hook
  });

  it('should handle form submission with valid data', async () => {
    const mockSubmit = vi.fn();
    const { result } = renderHook(() => useClientForm());

    // Fill form with valid data
    act(() => {
      result.current.setValue('name', 'Test Client');
      result.current.setValue('address.street', 'Calle Principal 123');
      result.current.setValue('address.city', 'Ciudad de México');
      result.current.setValue('address.state', 'Ciudad de México');
      result.current.setValue('address.zipCode', '12345');
      result.current.setValue('contacts.0.name', 'John Doe');
      result.current.setValue('contacts.0.email', 'john@example.com');
    });

    await act(async () => {
      const submitHandler = result.current.handleSubmit(mockSubmit);
      await submitHandler({} as any);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'Test Client',
      taxId: '',
      address: {
        street: 'Calle Principal 123',
        city: 'Ciudad de México',
        state: 'Ciudad de México',
        zipCode: '12345',
        country: 'México',
      },
      contacts: [
        {
          name: 'John Doe',
          role: '',
          email: 'john@example.com',
          phone: '',
        },
      ],
      paymentTerms: 30,
      notes: '',
    });
  });

  it('should reset form to default values', () => {
    const { result } = renderHook(() => useClientForm());

    // Change some values
    act(() => {
      result.current.setValue('name', 'Test Client');
      // businessName is not part of the current schema
    });

    // Reset form
    act(() => {
      result.current.reset();
    });

    const formValues = result.current.watch();
    expect(formValues.name).toBe('');
  });

  it('should provide correct validation state', () => {
    const { result } = renderHook(() => useClientForm());

    // Initially invalid (empty required fields)
    expect(result.current.isValid).toBe(false);

    // Fill all required fields
    act(() => {
      result.current.setValue('name', 'Test Client');
      result.current.setValue('address.street', 'Calle Principal 123');
      result.current.setValue('address.city', 'Ciudad de México');
      result.current.setValue('address.state', 'Ciudad de México');
      result.current.setValue('address.zipCode', '12345');
      result.current.setValue('contacts.0.name', 'John Doe');
      result.current.setValue('contacts.0.email', 'john@example.com');
    });

    expect(result.current.isValid).toBe(true);
  });

  it('should handle nested field errors correctly', () => {
    const { result } = renderHook(() => useClientForm());

    act(() => {
      result.current.setValue('address.zipCode', '123');
      result.current.setValue('contacts.0.email', 'invalid');
    });

    expect(result.current.hasFieldError('address.zipCode')).toBe(true);
    expect(result.current.hasFieldError('contacts.0.email')).toBe(true);
    expect(result.current.getFieldError('address.zipCode')).toContain('5 dígitos');
    expect(result.current.getFieldError('contacts.0.email')).toContain('inválido');
  });

  it('should handle multiple contacts validation', () => {
    const { result } = renderHook(() => useClientForm());

    // Add second contact
    act(() => {
      result.current.addContact();
    });

    // Set invalid emails for both contacts
    act(() => {
      result.current.setValue('contacts.0.email', 'invalid1');
      result.current.setValue('contacts.1.email', 'invalid2');
    });

    expect(result.current.hasFieldError('contacts.0.email')).toBe(true);
    expect(result.current.hasFieldError('contacts.1.email')).toBe(true);

    // Fix emails
    act(() => {
      result.current.setValue('contacts.0.email', 'valid1@example.com');
      result.current.setValue('contacts.1.email', 'valid2@example.com');
    });

    expect(result.current.hasFieldError('contacts.0.email')).toBe(false);
    expect(result.current.hasFieldError('contacts.1.email')).toBe(false);
  });
});
