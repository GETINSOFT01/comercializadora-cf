import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NewClientPage from '../../pages/clients/NewClientPage';

// Mock Firebase
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockCollection = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  doc: mockDoc,
  getDoc: mockGetDoc,
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

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
const mockParams = { id: undefined as string | undefined };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
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

describe('NewClientPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue({});
    mockParams.id = undefined;
  });

  it('should render client form with all required fields', () => {
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Check main form fields
    expect(screen.getByLabelText(/nombre del cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/razón social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rfc/i)).toBeInTheDocument();

    // Check address section
    expect(screen.getByText(/dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/calle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/código postal/i)).toBeInTheDocument();

    // Check contacts section
    expect(screen.getByText(/contactos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del contacto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /guardar cliente/i });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/nombre del cliente es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/calle es requerida/i)).toBeInTheDocument();
      expect(screen.getByText(/ciudad es requerida/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    const emailField = screen.getByLabelText(/correo electrónico/i);
    await user.type(emailField, 'invalid-email');

    // Trigger validation by clicking outside
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.getByText(/correo electrónico inválido/i)).toBeInTheDocument();
    });
  });

  it('should validate postal code format', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    const postalCodeField = screen.getByLabelText(/código postal/i);
    await user.type(postalCodeField, '123');

    await user.click(document.body);

    await waitFor(() => {
      expect(screen.getByText(/debe tener exactamente 5 dígitos/i)).toBeInTheDocument();
    });
  });

  it('should add new contact', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    const addContactButton = screen.getByRole('button', { name: /agregar contacto/i });
    await user.click(addContactButton);

    // Should have two contact sections now
    const contactNames = screen.getAllByLabelText(/nombre del contacto/i);
    expect(contactNames).toHaveLength(2);

    // Second contact should not be primary
    const primaryCheckboxes = screen.getAllByLabelText(/contacto principal/i);
    expect(primaryCheckboxes).toHaveLength(2);
    expect(primaryCheckboxes[0]).toBeChecked();
    expect(primaryCheckboxes[1]).not.toBeChecked();
  });

  it('should remove contact', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Add a second contact first
    const addContactButton = screen.getByRole('button', { name: /agregar contacto/i });
    await user.click(addContactButton);

    // Remove the second contact
    const removeButtons = screen.getAllByLabelText(/eliminar contacto/i);
    await user.click(removeButtons[1]);

    // Should be back to one contact
    const contactNames = screen.getAllByLabelText(/nombre del contacto/i);
    expect(contactNames).toHaveLength(1);
  });

  it('should not allow removing the last contact', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Try to remove the only contact
    const removeButton = screen.getByLabelText(/eliminar contacto/i);
    await user.click(removeButton);

    // Should still have one contact and show warning
    const contactNames = screen.getAllByLabelText(/nombre del contacto/i);
    expect(contactNames).toHaveLength(1);
  });

  it('should set primary contact', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Add a second contact
    const addContactButton = screen.getByRole('button', { name: /agregar contacto/i });
    await user.click(addContactButton);

    // Set second contact as primary
    const primaryCheckboxes = screen.getAllByLabelText(/contacto principal/i);
    await user.click(primaryCheckboxes[1]);

    // First should be unchecked, second should be checked
    expect(primaryCheckboxes[0]).not.toBeChecked();
    expect(primaryCheckboxes[1]).toBeChecked();
  });

  it('should submit new client successfully', async () => {
    const user = userEvent.setup();
    mockAddDoc.mockResolvedValue({ id: 'new-client-id' });

    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Fill required fields
    await user.type(screen.getByLabelText(/nombre del cliente/i), 'Test Client');
    await user.type(screen.getByLabelText(/calle/i), 'Calle Principal 123');
    await user.type(screen.getByLabelText(/ciudad/i), 'Ciudad de México');
    await user.type(screen.getByLabelText(/estado/i), 'Ciudad de México');
    await user.type(screen.getByLabelText(/código postal/i), '12345');
    await user.type(screen.getByLabelText(/nombre del contacto/i), 'John Doe');
    await user.type(screen.getByLabelText(/correo electrónico/i), 'john@example.com');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /guardar cliente/i });
    await user.click(submitButton);

    // Should call Firebase addDoc
    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          name: 'Test Client',
          address: expect.objectContaining({
            street: 'Calle Principal 123',
            city: 'Ciudad de México',
            state: 'Ciudad de México',
            postalCode: '12345',
            country: 'México',
          }),
          contacts: expect.arrayContaining([
            expect.objectContaining({
              name: 'John Doe',
              email: 'john@example.com',
              isPrimary: true,
            }),
          ]),
          createdBy: 'test-user-id',
        })
      );
    });

    // Should navigate to clients page
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('should load existing client for editing', async () => {
    mockParams.id = 'existing-client-id';
    const existingClient = {
      name: 'Existing Client',
      businessName: 'Existing Business',
      address: {
        street: 'Existing Street 456',
        city: 'Existing City',
        state: 'Existing State',
        postalCode: '54321',
        country: 'México',
      },
      contacts: [
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '5559876543',
          role: 'Manager',
          isPrimary: true,
        },
      ],
    };

    mockDoc.mockReturnValue({});
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => existingClient,
    });

    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Should load existing data
    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Client')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Business')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Street 456')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    });

    // Button should say "Actualizar Cliente"
    expect(screen.getByRole('button', { name: /actualizar cliente/i })).toBeInTheDocument();
  });

  it('should update existing client', async () => {
    const user = userEvent.setup();
    mockParams.id = 'existing-client-id';
    mockUpdateDoc.mockResolvedValue({});
    mockDoc.mockReturnValue({});
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'Existing Client',
        address: { street: 'Old Street', city: 'Old City', state: 'Old State', postalCode: '12345', country: 'México' },
        contacts: [{ name: 'Old Contact', email: 'old@example.com', isPrimary: true }],
      }),
    });

    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Wait for data to load and modify
    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Client')).toBeInTheDocument();
    });

    const nameField = screen.getByDisplayValue('Existing Client');
    await user.clear(nameField);
    await user.type(nameField, 'Updated Client');

    // Submit update
    const updateButton = screen.getByRole('button', { name: /actualizar cliente/i });
    await user.click(updateButton);

    // Should call Firebase updateDoc
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          name: 'Updated Client',
          updatedAt: expect.any(Object),
        })
      );
    });
  });

  it('should handle form submission errors', async () => {
    const user = userEvent.setup();
    mockAddDoc.mockRejectedValue(new Error('Firebase error'));

    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Fill and submit form
    await user.type(screen.getByLabelText(/nombre del cliente/i), 'Test Client');
    await user.type(screen.getByLabelText(/calle/i), 'Test Street');
    await user.type(screen.getByLabelText(/ciudad/i), 'Test City');
    await user.type(screen.getByLabelText(/estado/i), 'Test State');
    await user.type(screen.getByLabelText(/código postal/i), '12345');
    await user.type(screen.getByLabelText(/nombre del contacto/i), 'Test Contact');
    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /guardar cliente/i });
    await user.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error al guardar el cliente/i)).toBeInTheDocument();
    });
  });

  it('should handle multiple contacts with validation', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <NewClientPage />
      </TestWrapper>
    );

    // Add second contact
    const addContactButton = screen.getByRole('button', { name: /agregar contacto/i });
    await user.click(addContactButton);

    // Fill first contact with valid data
    const contactNames = screen.getAllByLabelText(/nombre del contacto/i);
    const contactEmails = screen.getAllByLabelText(/correo electrónico/i);

    await user.type(contactNames[0], 'First Contact');
    await user.type(contactEmails[0], 'first@example.com');

    // Fill second contact with invalid email
    await user.type(contactNames[1], 'Second Contact');
    await user.type(contactEmails[1], 'invalid-email');

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /guardar cliente/i });
    await user.click(submitButton);

    // Should show validation error for second contact
    await waitFor(() => {
      expect(screen.getByText(/correo electrónico inválido/i)).toBeInTheDocument();
    });
  });
});
