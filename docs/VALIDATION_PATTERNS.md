# Patrones de Validación y Manejo de Errores

## Resumen

Este documento describe los patrones implementados para validación de formularios y manejo de errores en la aplicación Comercializadora CF, utilizando Zod para esquemas de validación, React Hook Form para manejo de formularios, y Error Boundaries para captura de errores.

## Arquitectura de Validación

### 1. Validación del Cliente (Frontend)

#### Esquemas Zod
- **Ubicación**: `src/schemas/validation.ts` y `src/schemas/serviceValidation.ts`
- **Propósito**: Definir esquemas de validación reutilizables y type-safe
- **Características**:
  - Validación de tipos TypeScript automática
  - Mensajes de error personalizados en español
  - Validaciones complejas (fechas, RFC, emails, etc.)
  - Esquemas anidados para objetos complejos

```typescript
// Ejemplo de esquema
export const clientSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es requerido'),
  taxId: z.string().regex(/^[A-Z]{4}\d{6}[A-Z0-9]{3}$/, 'RFC inválido').optional(),
  address: addressSchema,
  contacts: z.array(contactSchema).min(1, 'Debe tener al menos un contacto'),
});
```

#### Hooks de Formulario
- **Ubicación**: `src/hooks/useFormValidation.ts`, `src/hooks/useServiceForm.ts`, `src/hooks/useClientForm.ts`
- **Propósito**: Integrar Zod con React Hook Form
- **Características**:
  - Validación en tiempo real
  - Manejo de errores integrado con notistack
  - Funciones auxiliares para acceso a errores
  - Soporte para validación asíncrona

```typescript
// Uso del hook
const {
  register,
  handleSubmit,
  errors,
  isValid,
  getFieldError,
  hasFieldError,
} = useClientForm();
```

### 2. Validación del Servidor (Backend)

#### Firebase Functions
- **Ubicación**: `functions/src/validation.ts` y `functions/src/schemas/validation.ts`
- **Propósito**: Validar datos antes de escribir a Firestore
- **Características**:
  - Esquemas espejo de los del cliente
  - Validaciones adicionales del lado servidor
  - Verificación de integridad referencial
  - Prevención de duplicados

```typescript
// Cloud Function de validación
export const validateClient = https.onCall(async (data, context) => {
  const validatedData = clientSchema.parse(data);
  // Validaciones adicionales...
  return { success: true, data: validatedData };
});
```

#### Triggers Automáticos
- **Trigger**: `validateOnWrite`
- **Propósito**: Validar automáticamente al escribir en Firestore
- **Características**:
  - Validación transparente
  - Logging de errores de validación
  - Marcado de documentos con errores

### 3. Manejo de Errores

#### Error Boundaries
- **Ubicación**: `src/components/error/ErrorBoundary.tsx`
- **Propósito**: Capturar errores de React y mostrar UI de fallback
- **Tipos**:
  - `ErrorBoundary`: Boundary general
  - `RouteErrorBoundary`: Para rutas específicas
  - `FormErrorBoundary`: Para formularios
  - `ChartErrorBoundary`: Para componentes de gráficos

```tsx
// Uso de Error Boundary
<FormErrorBoundary>
  <MyForm />
</FormErrorBoundary>
```

#### Sistema de Notificaciones
- **Ubicación**: `src/hooks/useErrorNotification.ts`
- **Propósito**: Mostrar notificaciones de error consistentes
- **Características**:
  - Diferentes tipos de notificación (error, warning, success, info)
  - Manejo específico de errores de Firebase
  - Notificaciones de errores de validación
  - Control de duplicados y persistencia

```typescript
// Uso del hook de notificaciones
const { showError, showValidationErrors, showFirebaseError } = useErrorNotification();

showValidationErrors(errors, 'Errores en el formulario');
showFirebaseError(error, 'Guardando cliente');
```

## Patrones de Implementación

### 1. Formularios con Validación

```tsx
export default function MyFormPage() {
  const {
    register,
    handleSubmit,
    errors,
    isValid,
    isSubmitting,
    getFieldError,
    hasFieldError,
  } = useMyForm();

  const onSubmit = handleSubmit(async (data) => {
    // Lógica de envío
  });

  return (
    <FormErrorBoundary>
      <form onSubmit={onSubmit}>
        <TextField
          {...register('fieldName')}
          error={hasFieldError('fieldName')}
          helperText={getFieldError('fieldName')}
        />
        <Button 
          type="submit" 
          disabled={!isValid || isSubmitting}
        >
          Guardar
        </Button>
      </form>
    </FormErrorBoundary>
  );
}
```

### 2. Validación del Lado Servidor

```typescript
// En el cliente, antes de enviar
const validateOnServer = async (data) => {
  const validateFunction = httpsCallable(functions, 'validateClient');
  const result = await validateFunction(data);
  
  if (!result.data.success) {
    showValidationErrors(result.data.details);
    return false;
  }
  return true;
};
```

### 3. Manejo de Errores de Firebase

```typescript
const saveData = async (data) => {
  try {
    await addDoc(collection(db, 'clients'), data);
    showSuccess('Cliente guardado exitosamente');
  } catch (error) {
    showFirebaseError(error, 'Guardando cliente');
  }
};
```

## Mejores Prácticas

### 1. Esquemas de Validación
- Mantener esquemas DRY (Don't Repeat Yourself)
- Usar mensajes de error descriptivos en español
- Validar tanto formato como lógica de negocio
- Mantener sincronizados los esquemas cliente-servidor

### 2. Formularios
- Usar validación en tiempo real (`mode: 'onChange'`)
- Proporcionar feedback visual inmediato
- Deshabilitar envío cuando hay errores
- Mostrar indicadores de carga durante envío

### 3. Error Boundaries
- Usar boundaries específicos para diferentes tipos de componentes
- Proporcionar UI de fallback útil
- Logging de errores para debugging
- Botones de recuperación cuando sea posible

### 4. Notificaciones
- Usar tipos apropiados (error, warning, success, info)
- Evitar spam de notificaciones con `preventDuplicate`
- Usar persistencia solo para errores críticos
- Proporcionar acciones cuando sea relevante

## Estructura de Archivos

```
src/
├── schemas/
│   ├── validation.ts          # Esquemas principales
│   └── serviceValidation.ts   # Esquemas específicos de servicios
├── hooks/
│   ├── useFormValidation.ts   # Hook genérico de validación
│   ├── useServiceForm.ts      # Hook específico para servicios
│   ├── useClientForm.ts       # Hook específico para clientes
│   └── useErrorNotification.ts # Sistema de notificaciones
├── components/
│   └── error/
│       └── ErrorBoundary.tsx  # Error boundaries
└── pages/
    ├── services/
    │   ├── NewServicePageValidated.tsx
    │   └── ...
    ├── clients/
    │   ├── NewClientPage.tsx
    │   └── ...
    └── auth/
        ├── LoginPageValidated.tsx
        └── ...

functions/
├── src/
│   ├── schemas/
│   │   └── validation.ts      # Esquemas del servidor
│   ├── validation.ts          # Cloud Functions de validación
│   └── index.ts              # Exportación de funciones
└── package.json              # Dependencias incluyendo Zod
```

## Tipos de Validación Implementados

### 1. Clientes
- Información básica (nombre, razón social, RFC)
- Dirección completa con validación de código postal
- Múltiples contactos con validación de email
- Contacto principal obligatorio

### 2. Servicios
- Selección de cliente existente
- Tipos de servicio predefinidos
- Fechas con validación de rango
- Información de contacto
- Términos y condiciones obligatorios

### 3. Autenticación
- Email con formato válido
- Contraseña con requisitos mínimos
- Manejo específico de errores de Firebase Auth

### 4. Reportes Diarios (RADs)
- Progreso con validación numérica
- Consumibles con valores no negativos
- Evidencias con URLs válidas
- Fecha no futura

### 5. Propuestas e Invoices
- Cálculos coherentes (subtotal + impuestos = total)
- Fechas lógicas (fin > inicio, vencimiento > emisión)
- Números únicos (folios, números de factura)

## Monitoreo y Debugging

### 1. Logging
- Errores de validación se registran en console
- Triggers de Firestore marcan documentos con errores
- Error boundaries capturan y reportan errores de UI

### 2. Debugging
- Usar React DevTools para inspeccionar estado de formularios
- Verificar esquemas Zod con `.safeParse()` en desarrollo
- Revisar logs de Firebase Functions para errores del servidor

### 3. Testing
- Esquemas Zod son fáciles de testear unitariamente
- Hooks pueden testearse con React Testing Library
- Error boundaries pueden simularse con errores controlados

## Consideraciones de Performance

### 1. Validación Cliente
- Debounce en validación en tiempo real para campos complejos
- Lazy loading de esquemas grandes
- Memoización de funciones de validación

### 2. Validación Servidor
- Cacheo de validaciones repetitivas
- Batch processing para múltiples validaciones
- Timeouts apropiados para Cloud Functions

### 3. Notificaciones
- Throttling de notificaciones duplicadas
- Cleanup automático de notificaciones antiguas
- Optimización de re-renders con useCallback

Este sistema de validación proporciona una base sólida, type-safe y mantenible para el manejo de formularios y errores en toda la aplicación.
