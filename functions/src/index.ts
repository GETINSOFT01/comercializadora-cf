import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

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

  return { success: true };
});

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
      const resendKey = functions.config().resend?.key;
      const fallbackList = functions.config().notify?.fallback_emails?.split(',') || [];

      if (!resendKey) {
        console.log('[onServiceStatusChange] Missing RESEND key. Logging only.', { oldStatus, newStatus });
        return;
      }

      const resend = new Resend(resendKey);

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
        fallbackList.forEach((e: string) => recipients.add(e));
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
          folio: after.folio || serviceId,
          clientId: after.clientId || '',
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

// Callable: send email with Resend
export const sendEmail = functions.https.onCall(async (data, context) => {
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

    const resend = new Resend(resendKey);

    const emailData: any = {
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    // Add attachments if provided
    if (attachments && Array.isArray(attachments)) {
      emailData.attachments = attachments.map((att: any) => ({
        content: att.content,
        filename: att.filename,
      }));
    }

    const result = await resend.emails.send(emailData);

    // Log email send - avoid undefined values completely
    try {
      const logData = {
        to: emailData.to,
        subject,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: context.auth.uid,
        status: 'sent',
        ...(result.data?.id && { emailId: result.data.id })
      };
      
      await admin.firestore().collection('email_logs').add(logData);
    } catch (logError) {
      console.warn('Failed to log email send:', logError);
      // Don't fail the entire operation if logging fails
    }

    return { 
      success: true, 
      message: 'Email sent successfully', 
      ...(result.data?.id && { emailId: result.data.id })
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    
    // Log email failure - avoid undefined values
    try {
      const errorLogData = {
        to: Array.isArray(to) ? to : [to],
        subject,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: context.auth.uid,
        status: 'failed',
        error: error.message || 'Unknown error',
      };
      
      await admin.firestore().collection('email_logs').add(errorLogData);
    } catch (logError) {
      console.warn('Failed to log email error:', logError);
    }

    throw new functions.https.HttpsError('internal', 'Failed to send email');
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
