import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

// Import validation functions
import {
  validateClient,
  validateServiceRequest,
  validateDailyReport,
  validateServiceProposal,
  validateInvoice,
  validateOnWrite,
} from './validation';

admin.initializeApp();

// Export validation functions
export {
  validateClient,
  validateServiceRequest,
  validateDailyReport,
  validateServiceProposal,
  validateInvoice,
  validateOnWrite,
};

// Helper to verify caller has admin role
async function assertAdmin(context: functions.https.CallableContext | functions.https.Request) {
  const auth = (context as any).auth || (context as any).rawRequest?.auth;
  // For callable: context.auth; For Express-like: decode from Authorization header
  if ((context as functions.https.CallableContext).auth) {
    const claims = (context as functions.https.CallableContext).auth?.token as any;
    if (!claims || claims.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admin can assign roles');
    }
    return;
  }
  // HTTP with Bearer token
  const req = context as functions.https.Request;
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new functions.https.HttpsError('unauthenticated', 'Missing bearer token');
  }
  const idToken = authHeader.replace('Bearer ', '');
  const decoded = await admin.auth().verifyIdToken(idToken);
  if ((decoded as any).role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admin can assign roles');
  }
}

// Callable Function: setCustomUserClaims({ uid, role })
export const setCustomUserClaims = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const { uid, role } = data as { uid: string; role: 'admin' | 'manager' | 'supervisor' | 'finance' };
  if (!uid || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'uid and role are required');
  }

  await admin.auth().setCustomUserClaims(uid, { role });

// Firestore Trigger: notify on services status change
export const onServiceStatusChange = functions.firestore
  .document('services/{serviceId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      if (!before || !after) return;

      const oldStatus = before.status;
      const newStatus = after.status;
      if (oldStatus === newStatus) {
        // no status change
        return;
      }

      const cfg = functions.config();
      const sendgridKey: string | undefined = cfg?.sendgrid?.key || process.env.SENDGRID_API_KEY;
      const fromEmail: string = (cfg?.notify?.from || process.env.NOTIFY_FROM_EMAIL || 'no-reply@example.com') as string;
      const fallbackList: string = (cfg?.notify?.emails || process.env.NOTIFY_EMAILS || '') as string;

      if (!sendgridKey) {
        console.log('[onServiceStatusChange] Missing SENDGRID key. Logging only.', { oldStatus, newStatus });
        return;
      }

      sgMail.setApiKey(sendgridKey);

      // Build recipients list
      const recipients: Set<string> = new Set();

      // Optional: resolve assignedTeam UIDs to emails from Firestore users collection
      try {
        const assigned: string[] = after.assignedTeam || [];
        if (assigned.length > 0) {
          const usersSnap = await admin
            .firestore()
            .collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', assigned.slice(0, 10)) // Firestore 'in' limit 10
            .get();
          usersSnap.forEach((doc) => {
            const email = (doc.data() as any).email as string | undefined;
            if (email) recipients.add(email);
          });
        }
      } catch (e) {
        console.warn('Could not resolve assignedTeam emails', e);
      }

      if (fallbackList) {
        fallbackList.split(',').map((s) => s.trim()).filter(Boolean).forEach((e) => recipients.add(e));
      }

      if (recipients.size === 0) {
        console.log('[onServiceStatusChange] No recipients. Skipping email.');
        return;
      }

      const serviceId = context.params.serviceId;
      const folio = after.folio || serviceId;
      const clientId = after.clientId || '';
      const subject = `Servicio ${folio}: estado actualizado (${oldStatus} → ${newStatus})`;
      const html = `
        <div>
          <h2>Actualización de Estado</h2>
          <p><strong>Servicio:</strong> ${folio}</p>
          <p><strong>Cliente:</strong> ${clientId}</p>
          <p><strong>Estado anterior:</strong> ${oldStatus}</p>
          <p><strong>Nuevo estado:</strong> ${newStatus}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p>Accede al expediente para más detalles.</p>
        </div>
      `;

      const msg = {
        to: Array.from(recipients),
        from: fromEmail,
        subject,
        html,
      } as sgMail.MailDataRequired;

      await sgMail.sendMultiple(msg);
      console.log(`[onServiceStatusChange] Email sent to: ${Array.from(recipients).join(', ')}`);

      // Write audit log
      try {
        const statusHistory: any[] = Array.isArray(after.statusHistory) ? after.statusHistory : [];
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
          folio,
          clientId,
          oldStatus,
          newStatus,
          notes,
          changedBy,
          changedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await admin.firestore().collection('audit_logs').add(auditDoc);
      } catch (e) {
        console.warn('[onServiceStatusChange] Failed to write audit_logs', e);
      }
    } catch (err) {
      console.error('[onServiceStatusChange] Error', err);
    }
  });

  // Optionally force token refresh by updating a custom field in Firestore (if you track users)
  // await admin.firestore().collection('users').doc(uid).set({ role, claimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  return { success: true };
});

// Callable: lookup user by email (admin only)
export const lookupUserByEmail = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const { email } = data as { email: string };
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
  } catch (err: any) {
    throw new functions.https.HttpsError('not-found', err?.message || 'User not found');
  }
});

// HTTP Function alternative (e.g. for REST clients)
export const setRole = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    await assertAdmin(req);

    const { uid, role } = req.body as { uid: string; role: 'admin' | 'manager' | 'supervisor' | 'finance' };
    if (!uid || !role) {
      res.status(400).json({ error: 'uid and role are required' });
      return;
    }

    await admin.auth().setCustomUserClaims(uid, { role });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    const code = err?.code === 'permission-denied' ? 403 : err?.code === 'unauthenticated' ? 401 : 500;
    res.status(code).json({ error: err?.message || 'Internal error' });
  }
});
