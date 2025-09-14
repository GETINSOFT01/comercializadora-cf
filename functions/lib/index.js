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
exports.setRole = exports.sendEmail = exports.lookupUserByEmail = exports.onServiceStatusChange = exports.setCustomUserClaims = exports.validateOnWrite = exports.validateInvoice = exports.validateServiceProposal = exports.validateDailyReport = exports.validateServiceRequest = exports.validateClient = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const resend_1 = require("resend");
// Import validation functions
const validation_1 = require("./validation");
Object.defineProperty(exports, "validateClient", { enumerable: true, get: function () { return validation_1.validateClient; } });
Object.defineProperty(exports, "validateServiceRequest", { enumerable: true, get: function () { return validation_1.validateServiceRequest; } });
Object.defineProperty(exports, "validateDailyReport", { enumerable: true, get: function () { return validation_1.validateDailyReport; } });
Object.defineProperty(exports, "validateServiceProposal", { enumerable: true, get: function () { return validation_1.validateServiceProposal; } });
Object.defineProperty(exports, "validateInvoice", { enumerable: true, get: function () { return validation_1.validateInvoice; } });
Object.defineProperty(exports, "validateOnWrite", { enumerable: true, get: function () { return validation_1.validateOnWrite; } });
admin.initializeApp();
// Helper to verify caller has admin role
async function assertAdmin(context) {
    const auth = context.auth || context.rawRequest?.auth;
    // For callable: context.auth; For Express-like: decode from Authorization header
    if (context.auth) {
        const claims = context.auth?.token;
        if (!claims || claims.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Only admin can assign roles');
        }
        return;
    }
    // HTTP with Bearer token
    const req = context;
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        throw new functions.https.HttpsError('unauthenticated', 'Missing bearer token');
    }
    const idToken = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admin can assign roles');
    }
}
// Callable Function: setCustomUserClaims({ uid, role })
exports.setCustomUserClaims = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { uid, role } = data;
    if (!uid || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'uid and role are required');
    }
    await admin.auth().setCustomUserClaims(uid, { role });
    return { success: true };
});
// Firestore Trigger: notify on services status change
exports.onServiceStatusChange = functions.firestore
    .document('services/{serviceId}')
    .onUpdate(async (change, context) => {
    try {
        const before = change.before.data();
        const after = change.after.data();
        if (!before || !after)
            return;
        const oldStatus = before.status;
        const newStatus = after.status;
        if (oldStatus === newStatus) {
            // no status change
            return;
        }
        const cfg = functions.config();
        const resendKey = functions.config().resend?.key;
        const fallbackList = functions.config().notify?.fallback_emails?.split(',') || [];
        if (!resendKey) {
            console.log('[onServiceStatusChange] Missing RESEND key. Logging only.', { oldStatus, newStatus });
            return;
        }
        const resend = new resend_1.Resend(resendKey);
        // Build recipients list
        const recipients = new Set();
        // Optional: resolve assignedTeam UIDs to emails from Firestore users collection
        try {
            const assigned = after.assignedTeam || [];
            if (assigned.length > 0) {
                const usersSnap = await admin
                    .firestore()
                    .collection('users')
                    .where(admin.firestore.FieldPath.documentId(), 'in', assigned.slice(0, 10)) // Firestore 'in' limit 10
                    .get();
                usersSnap.forEach((doc) => {
                    const email = doc.data().email;
                    if (email)
                        recipients.add(email);
                });
            }
        }
        catch (e) {
            console.warn('Could not resolve assignedTeam emails', e);
        }
        if (fallbackList) {
            fallbackList.forEach((e) => recipients.add(e));
        }
        if (recipients.size === 0) {
            console.log('[onServiceStatusChange] No recipients. Skipping email.');
            return;
        }
        const serviceId = context.params.serviceId;
        const emailData = {
            from: functions.config().notify?.from || 'onboarding@resend.dev',
            to: Array.from(recipients),
            subject: `Service Status Changed: ${after.serviceType || 'Unknown'} (${after.id || context.params.serviceId})`,
            html: `
          <h2>Service Status Update</h2>
          <p><strong>Service ID:</strong> ${after.id || context.params.serviceId}</p>
          <p><strong>Service Type:</strong> ${after.serviceType || 'Unknown'}</p>
          <p><strong>Client:</strong> ${after.clientName || 'Unknown'}</p>
          <p><strong>Previous Status:</strong> ${oldStatus}</p>
          <p><strong>New Status:</strong> ${newStatus}</p>
          <p><strong>Changed At:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Changed By:</strong> ${after.lastModifiedBy || 'System'}</p>
        `,
        };
        await resend.emails.send(emailData);
        // Write audit log
        try {
            const statusHistory = Array.isArray(after.statusHistory) ? after.statusHistory : [];
            // Try to find latest entry with the new status
            let changedBy = 'system';
            let notes = '';
            if (statusHistory.length > 0) {
                const last = statusHistory[statusHistory.length - 1];
                changedBy = last?.changedBy || 'system';
                notes = last?.notes || '';
            }
            const auditDoc = {
                type: 'service_status_change',
                serviceId,
                folio: after.folio || serviceId,
                clientId: after.clientId || '',
                oldStatus,
                newStatus,
                notes,
                changedBy,
                changedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await admin.firestore().collection('audit_logs').add(auditDoc);
        }
        catch (e) {
            console.warn('[onServiceStatusChange] Failed to write audit_logs', e);
        }
    }
    catch (err) {
        console.error('[onServiceStatusChange] Error', err);
    }
});
// Callable: lookup user by email (admin only)
exports.lookupUserByEmail = functions.https.onCall(async (data, context) => {
    await assertAdmin(context);
    const { email } = data;
    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'email is required');
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || null,
            disabled: user.disabled || false,
            customClaims: user.customClaims || {},
        };
    }
    catch (err) {
        throw new functions.https.HttpsError('not-found', err?.message || 'User not found');
    }
});
// Callable: send email with Resend
exports.sendEmail = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { to, subject, html, attachments } = data;
    if (!to || !subject || !html) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: to, subject, html');
    }
    try {
        // Get Resend API key from environment
        const resendKey = functions.config().resend?.key;
        const fromEmail = functions.config().notify?.from || 'onboarding@resend.dev';
        if (!resendKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Resend API key not configured');
        }
        const resend = new resend_1.Resend(resendKey);
        const emailData = {
            from: fromEmail,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        };
        // Add attachments if provided
        if (attachments && Array.isArray(attachments)) {
            emailData.attachments = attachments.map((att) => ({
                content: att.content,
                filename: att.filename,
            }));
        }
        const result = await resend.emails.send(emailData);
        // Log email send
        await admin.firestore().collection('email_logs').add({
            to: emailData.to,
            subject,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentBy: context.auth.uid,
            status: 'sent',
            emailId: result.data?.id,
        });
        return { success: true, message: 'Email sent successfully', emailId: result.data?.id };
    }
    catch (error) {
        console.error('Error sending email:', error);
        // Log email failure
        await admin.firestore().collection('email_logs').add({
            to,
            subject,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentBy: context.auth.uid,
            status: 'failed',
            error: error.message,
        });
        throw new functions.https.HttpsError('internal', 'Failed to send email');
    }
});
// HTTP Function alternative (e.g. for REST clients)
exports.setRole = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        await assertAdmin(req);
        const { uid, role } = req.body;
        if (!uid || !role) {
            res.status(400).json({ error: 'uid and role are required' });
            return;
        }
        await admin.auth().setCustomUserClaims(uid, { role });
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        const code = err?.code === 'permission-denied' ? 403 : err?.code === 'unauthenticated' ? 401 : 500;
        res.status(code).json({ error: err?.message || 'Internal error' });
    }
});
