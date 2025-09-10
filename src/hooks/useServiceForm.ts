import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSnackbar } from 'notistack';
import { serviceRequestFormSchema, type ServiceRequestFormData } from '../schemas/serviceValidation';

export function useServiceForm() {
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm<ServiceRequestFormData>({
    resolver: zodResolver(serviceRequestFormSchema),
    mode: 'onChange',
    defaultValues: {
      clientId: '',
      serviceType: '',
      description: '',
      priority: 'media',
      estimatedDuration: '',
      estimatedStartDate: new Date().toISOString().split('T')[0],
      location: '',
      contactName: '',
      contactPhone: '',
      additionalNotes: '',
      termsAccepted: false,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty, isSubmitting },
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
  } = form;

  const onSubmit = (submitFn: (data: ServiceRequestFormData) => Promise<void>) =>
    handleSubmit(async (data: ServiceRequestFormData) => {
      try {
        await submitFn(data);
        enqueueSnackbar('Solicitud de servicio creada exitosamente', { 
          variant: 'success' 
        });
      } catch (error) {
        console.error('Form submission error:', error);
        
        if (error instanceof Error) {
          enqueueSnackbar(
            error.message || 'Ha ocurrido un error inesperado', 
            { variant: 'error' }
          );
        } else {
          enqueueSnackbar('Ha ocurrido un error inesperado', { 
            variant: 'error' 
          });
        }
      }
    });

  const getFieldError = (fieldName: keyof ServiceRequestFormData) => {
    return errors[fieldName]?.message;
  };

  const hasFieldError = (fieldName: keyof ServiceRequestFormData) => {
    return !!errors[fieldName];
  };

  return {
    register,
    handleSubmit: onSubmit,
    errors,
    isValid,
    isDirty,
    isSubmitting,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    getFieldError,
    hasFieldError,
  };
}
