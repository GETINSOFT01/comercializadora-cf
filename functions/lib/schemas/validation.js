"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceSchema = exports.serviceProposalSchema = exports.dailyReportSchema = exports.serviceRequestSchema = exports.clientSchema = void 0;
const zod_1 = require("zod");
// Esquemas de validación del lado servidor (espejo de los del cliente)
// Esquema de dirección
const addressSchema = zod_1.z.object({
    street: zod_1.z.string().min(1, 'La calle es requerida'),
    city: zod_1.z.string().min(1, 'La ciudad es requerida'),
    state: zod_1.z.string().min(1, 'El estado es requerido'),
    postalCode: zod_1.z.string().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
    country: zod_1.z.string().default('México'),
});
// Esquema de contacto
const contactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre del contacto es requerido'),
    role: zod_1.z.string().optional(),
    email: zod_1.z.string().email('Correo electrónico inválido'),
    phone: zod_1.z.string().optional(),
    isPrimary: zod_1.z.boolean().default(false),
});
// Esquema de cliente
exports.clientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre del cliente es requerido'),
    businessName: zod_1.z.string().optional(),
    taxId: zod_1.z.string().optional(),
    address: addressSchema,
    contacts: zod_1.z.array(contactSchema).min(1, 'Debe tener al menos un contacto'),
    isActive: zod_1.z.boolean().default(true),
    notes: zod_1.z.string().optional(),
});
// Esquema de solicitud de servicio
exports.serviceRequestSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, 'Debe seleccionar un cliente'),
    serviceType: zod_1.z.enum([
        'Mantenimiento Agrícola',
        'Fumigación',
        'Cosecha',
        'Siembra',
        'Preparación de Terreno',
        'Riego',
        'Otro',
    ], { required_error: 'Debe seleccionar un tipo de servicio' }),
    description: zod_1.z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    priority: zod_1.z.enum(['baja', 'media', 'alta', 'urgente'], {
        required_error: 'Debe seleccionar una prioridad',
    }),
    estimatedDuration: zod_1.z.number().positive('La duración debe ser un número positivo'),
    estimatedStartDate: zod_1.z.date(),
    location: zod_1.z.string().min(1, 'La ubicación es requerida'),
    contactName: zod_1.z.string().min(1, 'El nombre del contacto es requerido'),
    contactPhone: zod_1.z.string().min(1, 'El teléfono de contacto es requerido'),
    additionalNotes: zod_1.z.string().optional(),
    termsAccepted: zod_1.z.boolean().refine(val => val === true, {
        message: 'Debe aceptar los términos y condiciones',
    }),
});
// Esquema de reporte diario (RAD)
exports.dailyReportSchema = zod_1.z.object({
    serviceId: zod_1.z.string().min(1, 'El ID del servicio es requerido'),
    date: zod_1.z.date(),
    progress: zod_1.z.object({
        hectares: zod_1.z.number().min(0, 'Las hectáreas no pueden ser negativas').optional(),
        hours: zod_1.z.number().min(0, 'Las horas no pueden ser negativas').optional(),
        percentage: zod_1.z.number().min(0).max(100, 'El porcentaje debe estar entre 0 y 100').optional(),
    }),
    consumables: zod_1.z.object({
        fuel: zod_1.z.number().min(0, 'El combustible no puede ser negativo').optional(),
        fertilizer: zod_1.z.number().min(0, 'El fertilizante no puede ser negativo').optional(),
        seeds: zod_1.z.number().min(0, 'Las semillas no pueden ser negativas').optional(),
        pesticides: zod_1.z.number().min(0, 'Los pesticidas no pueden ser negativos').optional(),
    }),
    incidents: zod_1.z.string().optional(),
    evidenceURLs: zod_1.z.array(zod_1.z.string().url('URL de evidencia inválida')).optional(),
    weather: zod_1.z.object({
        temperature: zod_1.z.number().optional(),
        humidity: zod_1.z.number().min(0).max(100).optional(),
        conditions: zod_1.z.string().optional(),
    }).optional(),
});
// Esquema de propuesta de servicio
exports.serviceProposalSchema = zod_1.z.object({
    serviceId: zod_1.z.string().min(1, 'El ID del servicio es requerido'),
    title: zod_1.z.string().min(1, 'El título es requerido'),
    description: zod_1.z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    scope: zod_1.z.string().min(10, 'El alcance debe tener al menos 10 caracteres'),
    timeline: zod_1.z.object({
        startDate: zod_1.z.date(),
        endDate: zod_1.z.date(),
        milestones: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().min(1, 'El nombre del hito es requerido'),
            date: zod_1.z.date(),
            description: zod_1.z.string().optional(),
        })).optional(),
    }),
    pricing: zod_1.z.object({
        subtotal: zod_1.z.number().positive('El subtotal debe ser positivo'),
        tax: zod_1.z.number().min(0, 'El impuesto no puede ser negativo'),
        total: zod_1.z.number().positive('El total debe ser positivo'),
        currency: zod_1.z.string().default('MXN'),
    }),
    terms: zod_1.z.string().min(10, 'Los términos deben tener al menos 10 caracteres'),
    validUntil: zod_1.z.date(),
});
// Esquema de factura
exports.invoiceSchema = zod_1.z.object({
    serviceId: zod_1.z.string().min(1, 'El ID del servicio es requerido'),
    clientId: zod_1.z.string().min(1, 'El ID del cliente es requerido'),
    invoiceNumber: zod_1.z.string().min(1, 'El número de factura es requerido'),
    issueDate: zod_1.z.date(),
    dueDate: zod_1.z.date(),
    items: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string().min(1, 'La descripción del item es requerida'),
        quantity: zod_1.z.number().positive('La cantidad debe ser positiva'),
        unitPrice: zod_1.z.number().positive('El precio unitario debe ser positivo'),
        total: zod_1.z.number().positive('El total debe ser positivo'),
    })).min(1, 'Debe tener al menos un item'),
    subtotal: zod_1.z.number().positive('El subtotal debe ser positivo'),
    tax: zod_1.z.number().min(0, 'El impuesto no puede ser negativo'),
    total: zod_1.z.number().positive('El total debe ser positivo'),
    currency: zod_1.z.string().default('MXN'),
    status: zod_1.z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
    paymentTerms: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
