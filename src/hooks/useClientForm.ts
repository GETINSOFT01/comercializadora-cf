import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSnackbar } from 'notistack';
import { clientSchema, type ClientFormData } from '../schemas/validation';

const defaultValues: ClientFormData = {
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
};

export const useClientForm = (initialData?: Partial<ClientFormData>) => {
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setValue,
    watch,
    control,
    reset,
    getValues,
  } = form;

  const getFieldError = (fieldName: keyof ClientFormData | string): string | undefined => {
    const fieldPath = fieldName.split('.');
    let error: any = errors;
    
    for (const path of fieldPath) {
      if (error && typeof error === 'object' && path in error) {
        error = error[path];
      } else {
        return undefined;
      }
    }
    
    return error?.message;
  };

  const hasFieldError = (fieldName: keyof ClientFormData | string): boolean => {
    return !!getFieldError(fieldName);
  };

  const addContact = () => {
    const currentContacts = getValues('contacts') || [];
    setValue('contacts', [
      ...currentContacts,
      {
        name: '',
        role: '',
        email: '',
        phone: '',
        // isPrimary is handled internally
      },
    ]);
  };

  const removeContact = (index: number) => {
    const currentContacts = getValues('contacts') || [];
    if (currentContacts.length > 1) {
      const newContacts = currentContacts.filter((_, i) => i !== index);
      setValue('contacts', newContacts);
    } else {
      enqueueSnackbar('Debe mantener al menos un contacto', { variant: 'warning' });
    }
  };

  const setPrimaryContact = (index: number) => {
    // Primary contact logic is handled internally
    // This function exists for compatibility but doesn't modify isPrimary
    // since it's not part of the current schema
    console.log(`Setting primary contact to index ${index}`);
  };

  return {
    register,
    handleSubmit,
    errors,
    isValid,
    isSubmitting,
    setValue,
    watch,
    control,
    reset,
    getValues,
    getFieldError,
    hasFieldError,
    addContact,
    removeContact,
    setPrimaryContact,
  };
};
