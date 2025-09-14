import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServiceForm } from '../../hooks/useServiceForm';

// Mock notistack
const mockEnqueueSnackbar = vi.fn();
vi.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: mockEnqueueSnackbar,
    closeSnackbar: vi.fn(),
  }),
}));

describe('useServiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useServiceForm());

    expect(result.current.watch()).toEqual({
      clientId: '',
      serviceType: '',
      description: '',
      priority: 'media',
      estimatedDuration: '',
      estimatedStartDate: expect.any(String),
      location: '',
      contactName: '',
      contactPhone: '',
      additionalNotes: '',
      termsAccepted: false,
    });
  });

  it('should validate required fields', async () => {
    const { result } = renderHook(() => useServiceForm());

    // Try to submit empty form
    await act(async () => {
      const submitHandler = result.current.handleSubmit(async () => {});
      await submitHandler();
    });

    expect(result.current.isValid).toBe(false);
    expect(Object.keys(result.current.errors)).toContain('clientId');
    expect(Object.keys(result.current.errors)).toContain('serviceType');
    expect(Object.keys(result.current.errors)).toContain('description');
  });

  it('should validate field errors correctly', () => {
    const { result } = renderHook(() => useServiceForm());

    act(() => {
      result.current.setValue('clientId', '');
    });

    expect(result.current.hasFieldError('clientId')).toBe(true);
    expect(result.current.getFieldError('clientId')).toContain('Seleccione un cliente');
  });

  it('should update form values correctly', () => {
    const { result } = renderHook(() => useServiceForm());

    act(() => {
      result.current.setValue('clientId', 'client123');
      result.current.setValue('serviceType', 'Fumigación');
      result.current.setValue('priority', 'alta');
    });

    const formValues = result.current.watch();
    expect(formValues.clientId).toBe('client123');
    expect(formValues.serviceType).toBe('Fumigación');
    expect(formValues.priority).toBe('alta');
  });

  it('should validate service type enum', () => {
    const { result } = renderHook(() => useServiceForm());

    act(() => {
      result.current.setValue('serviceType', 'Otro');
    });

    expect(result.current.hasFieldError('serviceType')).toBe(true);

    act(() => {
      result.current.setValue('serviceType', 'Fumigación');
    });

    expect(result.current.hasFieldError('serviceType')).toBe(false);
  });

  it('should validate description length', () => {
    const { result } = renderHook(() => useServiceForm());

    act(() => {
      result.current.setValue('description', 'Short');
    });

    expect(result.current.hasFieldError('description')).toBe(true);
    expect(result.current.getFieldError('description')).toContain('al menos 10 caracteres');

    act(() => {
      result.current.setValue('description', 'This is a valid description with enough characters');
    });

    expect(result.current.hasFieldError('description')).toBe(false);
  });

  it('should validate estimated duration', () => {
    const { result } = renderHook(() => useServiceForm());

    // Test invalid duration
    act(() => {
      result.current.setValue('estimatedDuration', 'abc');
    });

    expect(result.current.hasFieldError('estimatedDuration')).toBe(true);

    // Test negative duration
    act(() => {
      result.current.setValue('estimatedDuration', '-5');
    });

    expect(result.current.hasFieldError('estimatedDuration')).toBe(true);

    // Test valid duration
    act(() => {
      result.current.setValue('estimatedDuration', '8');
    });

    expect(result.current.hasFieldError('estimatedDuration')).toBe(false);
  });

  it('should validate terms acceptance', () => {
    const { result } = renderHook(() => useServiceForm());

    act(() => {
      result.current.setValue('termsAccepted', false);
    });

    expect(result.current.hasFieldError('termsAccepted')).toBe(true);

    act(() => {
      result.current.setValue('termsAccepted', true);
    });

    expect(result.current.hasFieldError('termsAccepted')).toBe(false);
  });

  it('should handle form submission with valid data', async () => {
    const mockSubmit = vi.fn();
    const { result } = renderHook(() => useServiceForm());

    // Fill form with valid data
    act(() => {
      result.current.setValue('clientId', 'client123');
      result.current.setValue('serviceType', 'Fumigación');
      result.current.setValue('description', 'Valid description with enough characters');
      result.current.setValue('priority', 'media');
      result.current.setValue('estimatedDuration', '8');
      result.current.setValue('estimatedStartDate', '2024-12-01');
      result.current.setValue('location', 'Test Location');
      result.current.setValue('contactName', 'John Doe');
      result.current.setValue('contactPhone', '5551234567');
      result.current.setValue('termsAccepted', true);
    });

    await act(async () => {
      const submitHandler = result.current.handleSubmit(mockSubmit);
      await submitHandler({} as any);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      clientId: 'client123',
      serviceType: 'Fumigación',
      description: 'Valid description with enough characters',
      priority: 'media',
      estimatedDuration: '8',
      estimatedStartDate: '2024-12-01',
      location: 'Test Location',
      contactName: 'John Doe',
      contactPhone: '5551234567',
      additionalNotes: '',
      termsAccepted: true,
    });
  });

  it('should handle form submission errors', async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
    const { result } = renderHook(() => useServiceForm());

    // Fill form with valid data
    act(() => {
      result.current.setValue('clientId', 'client123');
      result.current.setValue('serviceType', 'Fumigación');
      result.current.setValue('description', 'Valid description with enough characters');
      result.current.setValue('priority', 'media');
      result.current.setValue('estimatedDuration', '8');
      result.current.setValue('estimatedStartDate', '2024-12-01');
      result.current.setValue('location', 'Test Location');
      result.current.setValue('contactName', 'John Doe');
      result.current.setValue('contactPhone', '5551234567');
      result.current.setValue('termsAccepted', true);
    });

    await act(async () => {
      const submitHandler = result.current.handleSubmit(mockSubmit);
      await submitHandler({} as any);
    });

    expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
      'Error al enviar el formulario',
      { variant: 'error' }
    );
  });

  it('should reset form to default values', () => {
    const { result } = renderHook(() => useServiceForm());

    // Change some values
    act(() => {
      result.current.setValue('clientId', 'client123');
      result.current.setValue('serviceType', 'Fumigación');
    });

    // Reset form
    act(() => {
      result.current.reset();
    });

    const formValues = result.current.watch();
    expect(formValues.clientId).toBe('');
    expect(formValues.serviceType).toBe('');
  });

  it('should provide correct validation state', () => {
    const { result } = renderHook(() => useServiceForm());

    // Initially invalid (empty required fields)
    expect(result.current.isValid).toBe(false);

    // Fill all required fields
    act(() => {
      result.current.setValue('clientId', 'client123');
      result.current.setValue('serviceType', 'Fumigación');
      result.current.setValue('description', 'Valid description with enough characters');
      result.current.setValue('priority', 'media');
      result.current.setValue('estimatedDuration', '8');
      result.current.setValue('estimatedStartDate', '2024-12-01');
      result.current.setValue('location', 'Test Location');
      result.current.setValue('contactName', 'John Doe');
      result.current.setValue('contactPhone', '5551234567');
      result.current.setValue('termsAccepted', true);
    });

    expect(result.current.isValid).toBe(true);
  });
});
