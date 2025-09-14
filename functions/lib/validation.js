"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOnWrite = exports.validateInvoice = exports.validateServiceProposal = exports.validateDailyReport = exports.validateServiceRequest = exports.validateClient = void 0;
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const validation_1 = require("./schemas/validation");
// Get Firestore instance (admin is initialized in index.ts)
const getDb = () => admin.firestore();
// Función auxiliar para manejar errores de validación
const handleValidationError = (error) => {
    if (error.errors) {
        const validationErrors = error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
        }));
        return {
            success: false,
            error: 'Validation failed',
            details: validationErrors,
        };
    }
    return {
        success: false,
        error: error.message || 'Unknown validation error',
    };
};
// Cloud Function para validar clientes antes de crear/actualizar
exports.validateClient = firebase_functions_1.https.onCall(async (data, context) => {
    try {
        // Verificar autenticación
        if (!context.auth) {
            throw new firebase_functions_1.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Validar datos con Zod
        const validatedData = validation_1.clientSchema.parse(data);
        // Validaciones adicionales del lado servidor
        if (validatedData.taxId) {
            // Verificar que el RFC no esté duplicado (excepto para actualizaciones)
            const existingClient = await getDb()
                .collection('clients')
                .where('taxId', '==', validatedData.taxId)
                .get();
            if (!existingClient.empty && (!data.id || existingClient.docs[0].id !== data.id)) {
                throw new firebase_functions_1.https.HttpsError('already-exists', 'RFC ya está registrado');
            }
        }
        // Verificar que al menos un contacto sea principal
        const primaryContacts = validatedData.contacts.filter(contact => contact.isPrimary);
        if (primaryContacts.length === 0) {
            validatedData.contacts[0].isPrimary = true;
        }
        else if (primaryContacts.length > 1) {
            // Solo el primer contacto principal mantiene el flag
            validatedData.contacts.forEach((contact, index) => {
                contact.isPrimary = index === validatedData.contacts.findIndex(c => c.isPrimary);
            });
        }
        return {
            success: true,
            data: validatedData,
        };
    }
    catch (error) {
        console.error('Client validation error:', error);
        return handleValidationError(error);
    }
});
// Cloud Function para validar solicitudes de servicio
exports.validateServiceRequest = firebase_functions_1.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new firebase_functions_1.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Convertir fecha string a Date si es necesario
        if (typeof data.estimatedStartDate === 'string') {
            data.estimatedStartDate = new Date(data.estimatedStartDate);
        }
        const validatedData = validation_1.serviceRequestSchema.parse(data);
        // Verificar que el cliente existe
        const clientDoc = await getDb().collection('clients').doc(validatedData.clientId).get();
        if (!clientDoc.exists) {
            throw new firebase_functions_1.https.HttpsError('not-found', 'Cliente no encontrado');
        }
        // Verificar que la fecha de inicio no sea en el pasado (con margen de 1 día)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        if (validatedData.estimatedStartDate < tomorrow) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'La fecha de inicio debe ser al menos mañana');
        }
        return {
            success: true,
            data: validatedData,
        };
    }
    catch (error) {
        console.error('Service request validation error:', error);
        return handleValidationError(error);
    }
});
// Cloud Function para validar reportes diarios (RADs)
exports.validateDailyReport = firebase_functions_1.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new firebase_functions_1.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Convertir fecha string a Date si es necesario
        if (typeof data.date === 'string') {
            data.date = new Date(data.date);
        }
        const validatedData = validation_1.dailyReportSchema.parse(data);
        // Verificar que el servicio existe
        const serviceDoc = await getDb().collection('services').doc(validatedData.serviceId).get();
        if (!serviceDoc.exists) {
            throw new firebase_functions_1.https.HttpsError('not-found', 'Servicio no encontrado');
        }
        // Verificar que la fecha del reporte no sea futura
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (validatedData.date > today) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'No se pueden crear reportes de fechas futuras');
        }
        // Verificar que no exista ya un reporte para esta fecha y servicio
        const existingReport = await getDb()
            .collection('daily_reports')
            .where('serviceId', '==', validatedData.serviceId)
            .where('date', '==', validatedData.date)
            .get();
        if (!existingReport.empty && (!data.id || existingReport.docs[0].id !== data.id)) {
            throw new firebase_functions_1.https.HttpsError('already-exists', 'Ya existe un reporte para esta fecha');
        }
        return {
            success: true,
            data: validatedData,
        };
    }
    catch (error) {
        console.error('Daily report validation error:', error);
        return handleValidationError(error);
    }
});
// Cloud Function para validar propuestas de servicio
exports.validateServiceProposal = firebase_functions_1.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new firebase_functions_1.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Convertir fechas string a Date si es necesario
        if (typeof data.timeline?.startDate === 'string') {
            data.timeline.startDate = new Date(data.timeline.startDate);
        }
        if (typeof data.timeline?.endDate === 'string') {
            data.timeline.endDate = new Date(data.timeline.endDate);
        }
        if (typeof data.validUntil === 'string') {
            data.validUntil = new Date(data.validUntil);
        }
        const validatedData = validation_1.serviceProposalSchema.parse(data);
        // Verificar que el servicio existe
        const serviceDoc = await getDb().collection('services').doc(validatedData.serviceId).get();
        if (!serviceDoc.exists) {
            throw new firebase_functions_1.https.HttpsError('not-found', 'Servicio no encontrado');
        }
        // Verificar que la fecha de fin sea posterior a la de inicio
        if (validatedData.timeline.endDate <= validatedData.timeline.startDate) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'La fecha de fin debe ser posterior a la de inicio');
        }
        // Verificar que la fecha de validez sea futura
        const today = new Date();
        if (validatedData.validUntil <= today) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'La fecha de validez debe ser futura');
        }
        // Verificar coherencia en precios
        const expectedTotal = validatedData.pricing.subtotal + validatedData.pricing.tax;
        if (Math.abs(expectedTotal - validatedData.pricing.total) > 0.01) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'El total no coincide con subtotal + impuestos');
        }
        return {
            success: true,
            data: validatedData,
        };
    }
    catch (error) {
        console.error('Service proposal validation error:', error);
        return handleValidationError(error);
    }
});
// Cloud Function para validar facturas
exports.validateInvoice = firebase_functions_1.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new firebase_functions_1.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Convertir fechas string a Date si es necesario
        if (typeof data.issueDate === 'string') {
            data.issueDate = new Date(data.issueDate);
        }
        if (typeof data.dueDate === 'string') {
            data.dueDate = new Date(data.dueDate);
        }
        const validatedData = validation_1.invoiceSchema.parse(data);
        // Verificar que el servicio y cliente existen
        const [serviceDoc, clientDoc] = await Promise.all([
            getDb().collection('services').doc(validatedData.serviceId).get(),
            getDb().collection('clients').doc(validatedData.clientId).get(),
        ]);
        if (!serviceDoc.exists) {
            throw new firebase_functions_1.https.HttpsError('not-found', 'Servicio no encontrado');
        }
        if (!clientDoc.exists) {
            throw new firebase_functions_1.https.HttpsError('not-found', 'Cliente no encontrado');
        }
        // Verificar que la fecha de vencimiento sea posterior a la de emisión
        if (validatedData.dueDate <= validatedData.issueDate) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'La fecha de vencimiento debe ser posterior a la de emisión');
        }
        // Verificar que el número de factura sea único
        const existingInvoice = await getDb()
            .collection('invoices')
            .where('invoiceNumber', '==', validatedData.invoiceNumber)
            .get();
        if (!existingInvoice.empty && (!data.id || existingInvoice.docs[0].id !== data.id)) {
            throw new firebase_functions_1.https.HttpsError('already-exists', 'El número de factura ya existe');
        }
        // Verificar coherencia en cálculos
        const calculatedSubtotal = validatedData.items.reduce((sum, item) => sum + item.total, 0);
        if (Math.abs(calculatedSubtotal - validatedData.subtotal) > 0.01) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'El subtotal no coincide con la suma de los items');
        }
        const expectedTotal = validatedData.subtotal + validatedData.tax;
        if (Math.abs(expectedTotal - validatedData.total) > 0.01) {
            throw new firebase_functions_1.https.HttpsError('invalid-argument', 'El total no coincide con subtotal + impuestos');
        }
        return {
            success: true,
            data: validatedData,
        };
    }
    catch (error) {
        console.error('Invoice validation error:', error);
        return handleValidationError(error);
    }
});
// Trigger para validar automáticamente al escribir en Firestore
exports.validateOnWrite = firebase_functions_1.firestore.document('{collection}/{docId}').onWrite(async (change, context) => {
    const collection = context.params.collection;
    const docId = context.params.docId;
    // Solo validar en colecciones específicas
    const validatedCollections = ['clients', 'services', 'daily_reports', 'service_proposals', 'invoices'];
    if (!validatedCollections.includes(collection)) {
        return null;
    }
    // Solo validar en creación y actualización, no en eliminación
    if (!change.after.exists) {
        return null;
    }
    const data = change.after.data();
    if (!data) {
        return null;
    }
    try {
        let validationResult;
        switch (collection) {
            case 'clients':
                validationResult = validation_1.clientSchema.safeParse(data);
                break;
            case 'services':
                // Para servicios, validamos solo si tiene datos de FSCF001
                if (data.fscf001_data) {
                    validationResult = validation_1.serviceRequestSchema.safeParse(data.fscf001_data);
                }
                break;
            case 'daily_reports':
                validationResult = validation_1.dailyReportSchema.safeParse(data);
                break;
            case 'service_proposals':
                validationResult = validation_1.serviceProposalSchema.safeParse(data);
                break;
            case 'invoices':
                validationResult = validation_1.invoiceSchema.safeParse(data);
                break;
        }
        if (validationResult && !validationResult.success) {
            console.error(`Validation failed for ${collection}/${docId}:`, validationResult.error);
            // Agregar un campo de error al documento para tracking
            await change.after.ref.update({
                _validationError: {
                    timestamp: new Date(),
                    errors: validationResult.error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                },
            });
        }
        else if (data._validationError) {
            // Limpiar errores de validación si la validación es exitosa
            await change.after.ref.update({
                _validationError: null,
            });
        }
    }
    catch (error) {
        console.error(`Error validating ${collection}/${docId}:`, error);
    }
    return null;
});
