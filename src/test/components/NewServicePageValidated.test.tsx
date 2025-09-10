import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NewServicePageValidated from '../../pages/services/NewServicePageValidated';

// Mock Firebase
const mockAddDoc = vi.fn();
const mockCollection = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  addDoc: mockAddDoc,
  serverTimestamp: () => ({ seconds: 1234567890, nanoseconds: 0 }),
}));

vi.mock('../../config/firebase', () => ({
  db: {},
}));

// Mock AuthContext
const mockUser = { uid: 'test-user-id', email: 'test@example.com' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const theme = createTheme();

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3}>
        {children}
      </SnackbarProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('NewServicePageValidated Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue({});
  });

  it('should render all form steps', () => {
    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Check stepper is present
    expect(screen.getByText('Información del Servicio')).toBeInTheDocument();
    expect(screen.getByText('Detalles y Contacto')).toBeInTheDocument();
    expect(screen.getByText('Confirmación')).toBeInTheDocument();

    // Check first step form fields
    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de servicio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioridad/i)).toBeInTheDocument();
  });

  it('should validate required fields on first step', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Try to proceed without filling required fields
    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/seleccione un cliente/i)).toBeInTheDocument();
      expect(screen.getByText(/seleccione el tipo de servicio/i)).toBeInTheDocument();
    });
  });

  it('should proceed to next step when first step is valid', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Fill required fields in first step
    const clientSelect = screen.getByLabelText(/cliente/i);
    await user.click(clientSelect);
    await user.type(clientSelect, 'Test Client');

    const serviceTypeSelect = screen.getByLabelText(/tipo de servicio/i);
    await user.click(serviceTypeSelect);
    const fumigacionOption = screen.getByText('Fumigación');
    await user.click(fumigacionOption);

    const descriptionField = screen.getByLabelText(/descripción/i);
    await user.type(descriptionField, 'This is a valid description with enough characters');

    const durationField = screen.getByLabelText(/duración estimada/i);
    await user.type(durationField, '8');

    // Proceed to next step
    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Should show second step fields
    await waitFor(() => {
      expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre del contacto/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teléfono del contacto/i)).toBeInTheDocument();
    });
  });

  it('should validate second step fields', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Navigate to second step (assuming first step is filled)
    // Fill first step quickly
    const clientSelect = screen.getByLabelText(/cliente/i);
    await user.click(clientSelect);
    await user.type(clientSelect, 'Test Client');

    const serviceTypeSelect = screen.getByLabelText(/tipo de servicio/i);
    await user.click(serviceTypeSelect);
    const fumigacionOption = screen.getByText('Fumigación');
    await user.click(fumigacionOption);

    const descriptionField = screen.getByLabelText(/descripción/i);
    await user.type(descriptionField, 'Valid description with enough characters');

    const durationField = screen.getByLabelText(/duración estimada/i);
    await user.type(durationField, '8');

    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Now in second step, try to proceed without filling required fields
    await waitFor(() => {
      const nextButton2 = screen.getByRole('button', { name: /siguiente/i });
      user.click(nextButton2);
    });

    // Should show validation errors for second step
    await waitFor(() => {
      expect(screen.getByText(/ubicación es requerida/i)).toBeInTheDocument();
      expect(screen.getByText(/nombre del contacto es requerido/i)).toBeInTheDocument();
    });
  });

  it('should show confirmation step with form data', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Fill first step
    const clientSelect = screen.getByLabelText(/cliente/i);
    await user.click(clientSelect);
    await user.type(clientSelect, 'Test Client');

    const serviceTypeSelect = screen.getByLabelText(/tipo de servicio/i);
    await user.click(serviceTypeSelect);
    const fumigacionOption = screen.getByText('Fumigación');
    await user.click(fumigacionOption);

    const descriptionField = screen.getByLabelText(/descripción/i);
    await user.type(descriptionField, 'Valid description with enough characters');

    const durationField = screen.getByLabelText(/duración estimada/i);
    await user.type(durationField, '8');

    let nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Fill second step
    await waitFor(async () => {
      const locationField = screen.getByLabelText(/ubicación/i);
      await user.type(locationField, 'Test Location');

      const contactNameField = screen.getByLabelText(/nombre del contacto/i);
      await user.type(contactNameField, 'John Doe');

      const contactPhoneField = screen.getByLabelText(/teléfono del contacto/i);
      await user.type(contactPhoneField, '5551234567');

      const termsCheckbox = screen.getByLabelText(/acepto los términos/i);
      await user.click(termsCheckbox);
    });

    nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Should show confirmation step
    await waitFor(() => {
      expect(screen.getByText(/confirmación/i)).toBeInTheDocument();
      expect(screen.getByText('Fumigación')).toBeInTheDocument();
      expect(screen.getByText('Valid description with enough characters')).toBeInTheDocument();
      expect(screen.getByText('Test Location')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should submit form successfully', async () => {
    const user = userEvent.setup();
    mockAddDoc.mockResolvedValue({ id: 'new-service-id' });

    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Fill complete form
    const clientSelect = screen.getByLabelText(/cliente/i);
    await user.click(clientSelect);
    await user.type(clientSelect, 'Test Client');

    const serviceTypeSelect = screen.getByLabelText(/tipo de servicio/i);
    await user.click(serviceTypeSelect);
    const fumigacionOption = screen.getByText('Fumigación');
    await user.click(fumigacionOption);

    const descriptionField = screen.getByLabelText(/descripción/i);
    await user.type(descriptionField, 'Valid description with enough characters');

    const durationField = screen.getByLabelText(/duración estimada/i);
    await user.type(durationField, '8');

    let nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Second step
    await waitFor(async () => {
      const locationField = screen.getByLabelText(/ubicación/i);
      await user.type(locationField, 'Test Location');

      const contactNameField = screen.getByLabelText(/nombre del contacto/i);
      await user.type(contactNameField, 'John Doe');

      const contactPhoneField = screen.getByLabelText(/teléfono del contacto/i);
      await user.type(contactPhoneField, '5551234567');

      const termsCheckbox = screen.getByLabelText(/acepto los términos/i);
      await user.click(termsCheckbox);
    });

    nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Submit form
    await waitFor(async () => {
      const submitButton = screen.getByRole('button', { name: /crear solicitud/i });
      await user.click(submitButton);
    });

    // Should call Firebase addDoc
    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          clientId: 'Test Client',
          serviceType: 'Fumigación',
          description: 'Valid description with enough characters',
          location: 'Test Location',
          contactName: 'John Doe',
          contactPhone: '5551234567',
          createdBy: 'test-user-id',
        })
      );
    });

    // Should navigate to services page
    expect(mockNavigate).toHaveBeenCalledWith('/services');
  });

  it('should handle form submission errors', async () => {
    const user = userEvent.setup();
    mockAddDoc.mockRejectedValue(new Error('Firebase error'));

    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Fill and submit form (abbreviated for test)
    const clientSelect = screen.getByLabelText(/cliente/i);
    await user.click(clientSelect);
    await user.type(clientSelect, 'Test Client');

    const serviceTypeSelect = screen.getByLabelText(/tipo de servicio/i);
    await user.click(serviceTypeSelect);
    const fumigacionOption = screen.getByText('Fumigación');
    await user.click(fumigacionOption);

    const descriptionField = screen.getByLabelText(/descripción/i);
    await user.type(descriptionField, 'Valid description');

    const durationField = screen.getByLabelText(/duración estimada/i);
    await user.type(durationField, '8');

    let nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    await waitFor(async () => {
      const locationField = screen.getByLabelText(/ubicación/i);
      await user.type(locationField, 'Test Location');

      const contactNameField = screen.getByLabelText(/nombre del contacto/i);
      await user.type(contactNameField, 'John Doe');

      const contactPhoneField = screen.getByLabelText(/teléfono del contacto/i);
      await user.type(contactPhoneField, '5551234567');

      const termsCheckbox = screen.getByLabelText(/acepto los términos/i);
      await user.click(termsCheckbox);
    });

    nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    await waitFor(async () => {
      const submitButton = screen.getByRole('button', { name: /crear solicitud/i });
      await user.click(submitButton);
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error al crear la solicitud/i)).toBeInTheDocument();
    });
  });

  it('should allow navigation between steps', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewServicePageValidated />
      </TestWrapper>
    );

    // Fill first step and proceed
    const clientSelect = screen.getByLabelText(/cliente/i);
    await user.click(clientSelect);
    await user.type(clientSelect, 'Test Client');

    const serviceTypeSelect = screen.getByLabelText(/tipo de servicio/i);
    await user.click(serviceTypeSelect);
    const fumigacionOption = screen.getByText('Fumigación');
    await user.click(fumigacionOption);

    const descriptionField = screen.getByLabelText(/descripción/i);
    await user.type(descriptionField, 'Valid description');

    const durationField = screen.getByLabelText(/duración estimada/i);
    await user.type(durationField, '8');

    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    await user.click(nextButton);

    // Should be in second step
    await waitFor(() => {
      expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
    });

    // Go back to first step
    const backButton = screen.getByRole('button', { name: /anterior/i });
    await user.click(backButton);

    // Should be back in first step
    await waitFor(() => {
      expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Client')).toBeInTheDocument();
    });
  });
});
