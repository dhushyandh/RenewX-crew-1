import { env } from '../config/env';
import { WhatsAppMessageModel } from '../models/WhatsAppMessage';
import type { NotificationEvent } from './notificationService';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  chatId?: string;
  error?: string;
}

/**
 * Validates and normalizes Indian phone numbers into WhatsApp JID format.
 * Accepted formats:
 * - 10 digits: "9876543210" -> "919876543210@c.us"
 * - 11 digits with trunk 0: "09876543210" -> "919876543210@c.us"
 * - 12 digits starting with 91: "919876543210" -> "919876543210@c.us"
 * - With country code: "+91 98765 43210" -> "919876543210@c.us"
 * - Already in chatId form: "919876543210@c.us" -> "919876543210@c.us"
 */
export function normalizeIndianPhone(phone: unknown): PhoneValidationResult {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    return { isValid: false, error: 'Phone number is required' };
  }

  let clean = String(phone).trim();

  // Strip @c.us suffix if already provided
  if (clean.endsWith('@c.us')) {
    clean = clean.replace('@c.us', '');
  }

  // Remove whitespace, dashes, parens, dots, and leading +
  clean = clean.replace(/[\s\-\(\)\.]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }

  // Only digits are valid at this stage
  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'Phone number contains non-numeric characters' };
  }

  // Handle leading zero trunk prefix (e.g. 09876543210)
  if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }

  // Standard 10-digit Indian mobile number: starts with 6, 7, 8, or 9
  if (clean.length === 10) {
    if (!/^[6-9]\d{9}$/.test(clean)) {
      return { isValid: false, error: 'Invalid Indian mobile number: must start with 6, 7, 8, or 9' };
    }
    const normalized = `91${clean}`;
    return {
      isValid: true,
      normalized,
      chatId: `${normalized}@c.us`,
    };
  }

  // 12-digit number starting with 91 followed by valid 10-digit Indian mobile
  if (clean.length === 12 && clean.startsWith('91')) {
    const nationalNumber = clean.slice(2);
    if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
      return { isValid: false, error: 'Invalid Indian mobile number after country code 91' };
    }
    return {
      isValid: true,
      normalized: clean,
      chatId: `${clean}@c.us`,
    };
  }

  return {
    isValid: false,
    error: `Invalid phone number length (${clean.length} digits). Expected 10-digit Indian mobile number.`,
  };
}

export type WhatsAppTemplateAction =
  | 'order_placed_cod'
  | 'order_placed_online'
  | 'payment_successful'
  | 'order_processing'
  | 'order_shipped'
  | 'out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  | 'refund_completed'
  | 'refund_pending';

export interface WhatsAppTemplateData {
  customerName?: string;
  orderNumber: string;
  total?: number;
  paymentStatus?: string;
  courier?: string;
  trackingNumber?: string;
  reason?: string;
}

/**
 * Formats branded WhatsApp message templates for RenewX Crew.
 * Preserves privacy: does not include full personal address or payment secrets.
 */
export function formatWhatsAppMessage(action: WhatsAppTemplateAction, data: WhatsAppTemplateData): string {
  const customerName = (data.customerName || 'Customer').trim();
  const orderNumber = data.orderNumber.toUpperCase();
  const totalStr = data.total ? Number(data.total).toLocaleString('en-IN') : '0';

  switch (action) {
    case 'order_placed_cod':
      return `Hi ${customerName}, your RenewX Crew order #${orderNumber} has been placed successfully. Total: ₹${totalStr}. Payment: Cash on Delivery. Thank you for shopping with us!`;

    case 'order_placed_online':
      return `Hi ${customerName}, your RenewX Crew order #${orderNumber} has been placed successfully. Total: ₹${totalStr}. Payment: Paid via Razorpay. Thank you for shopping with us!`;

    case 'payment_successful':
      return `Hi ${customerName}, payment for RenewX Crew order #${orderNumber} has been verified successfully. Total: ₹${totalStr}. Thank you for choosing RenewX Crew!`;

    case 'order_processing':
      return `Hi ${customerName}, your RenewX Crew order #${orderNumber} is now processing. We're getting it ready for shipment.`;

    case 'order_shipped': {
      const courierDetail = data.courier ? ` via ${data.courier}` : '';
      const trackingDetail = data.trackingNumber ? ` (Tracking: ${data.trackingNumber})` : '';
      return `Hi ${customerName}, your RenewX Crew order #${orderNumber} has been shipped${courierDetail}.${trackingDetail} We'll keep you updated on its delivery.`;
    }

    case 'out_for_delivery':
      return `Hi ${customerName}, your RenewX Crew order #${orderNumber} is out for delivery.`;

    case 'order_delivered':
      return `Hi ${customerName}, your RenewX Crew order #${orderNumber} has been delivered. Thank you for choosing RenewX Crew!`;

    case 'order_cancelled': {
      const reasonStr = data.reason ? ` Reason: ${data.reason}.` : '';
      return `Hi ${customerName}, your RenewX Crew order #${orderNumber} has been cancelled.${reasonStr} Please contact our support team if you need assistance.`;
    }

    case 'refund_completed':
      return `Hi ${customerName}, a refund of ₹${totalStr} for your RenewX Crew order #${orderNumber} has been processed successfully. Thank you!`;

    case 'refund_pending':
      return `Hi ${customerName}, a refund of ₹${totalStr} for your RenewX Crew order #${orderNumber} is currently pending processing. We'll notify you once completed.`;

    default:
      return `Hi ${customerName}, update for your RenewX Crew order #${orderNumber}.`;
  }
}

// In-memory cache for resolved session UUID
let cachedSessionId: { id: string; expiresAt: number } | null = null;
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resolves the active OpenWA session UUID.
 * OpenWA routes strictly expect a UUID in the URL path.
 * If OPENWA_SESSION_ID is a UUID, it is returned directly.
 * Otherwise, queries GET /api/sessions with X-API-Key and selects the ready session.
 */
export async function getActiveOpenWASessionId(): Promise<string | null> {
  const configured = env.OPENWA_SESSION_ID?.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (configured && uuidRegex.test(configured)) {
    return configured;
  }

  const now = Date.now();
  if (cachedSessionId && cachedSessionId.expiresAt > now) {
    return cachedSessionId.id;
  }

  const baseUrl = (env.OPENWA_BASE_URL || 'http://localhost:2785').replace(/\/+$/, '');
  const apiKey = env.OPENWA_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[OpenWA] Failed to list sessions: HTTP ${res.status}`);
      return null;
    }

    const data = (await res.json()) as any;
    const sessions: any[] = Array.isArray(data) ? data : data?.data ? data.data : data?.id ? [data] : [];

    if (!sessions.length) {
      console.warn('[OpenWA] No active sessions found on OpenWA gateway.');
      return null;
    }

    // Match by configured name if specified, otherwise find first ready or engine-loaded session
    let matched = configured ? sessions.find((s) => s.name === configured || s.id === configured) : null;

    if (!matched) {
      matched = sessions.find((s) => s.status === 'ready' || s.engineLoaded === true) || sessions[0];
    }

    if (matched?.id && uuidRegex.test(matched.id)) {
      cachedSessionId = { id: matched.id, expiresAt: now + SESSION_CACHE_TTL_MS };
      return matched.id;
    }

    return null;
  } catch (err: any) {
    console.warn('[OpenWA] Unable to resolve active session:', err?.message || 'Network error');
    return null;
  }
}

export interface SendWhatsAppOrderMessageOptions {
  orderId: string;
  phone: string;
  action: WhatsAppTemplateAction;
  templateData: WhatsAppTemplateData;
  consent?: boolean;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  skipped?: boolean;
  replayed?: boolean;
  error?: string;
  reason?: string;
}

export const MAX_RETRY_ATTEMPTS = 5;
export const BASE_RETRY_DELAY_MS = 30 * 1000; // 30 seconds
export const MAX_RETRY_DELAY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Calculates exponential backoff retry time.
 * Attempt 1: +30s
 * Attempt 2: +60s
 * Attempt 3: +120s (2m)
 * Attempt 4: +240s (4m)
 * Attempt 5: +480s (8m, capped at 15m)
 * Attempt >= 5: null (terminal failure, do not retry further)
 */
export function calculateNextRetry(attempts: number): Date | null {
  if (attempts >= MAX_RETRY_ATTEMPTS) {
    return null;
  }
  const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(0, attempts - 1)), MAX_RETRY_DELAY_MS);
  return new Date(Date.now() + delay);
}

/**
 * Core HTTP dispatcher for an outbox message.
 * Handles OpenWA REST invocation, idempotency key header, and updates the outbox record
 * with attempt counts, status, and calculated next_retry_at on failure.
 */
export async function dispatchOutboxMessage(record: any): Promise<SendWhatsAppResult> {
  const recordId = record.id || record._id;
  const baseUrl = (env.OPENWA_BASE_URL || 'http://localhost:2785').replace(/\/+$/, '');
  const apiKey = env.OPENWA_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      skipped: true,
      reason: 'OPENWA_NOT_CONFIGURED',
    };
  }

  const sessionId = await getActiveOpenWASessionId();
  if (!sessionId) {
    const errorMsg = 'No active or ready OpenWA session available';
    console.warn(`[OpenWA] Order #${record.order_id}: ${errorMsg}`);
    const nextAttempts = (record.attempts || 0) + 1;
    const nextRetry = calculateNextRetry(nextAttempts);

    await WhatsAppMessageModel.updateOne(
      { _id: recordId },
      {
        $set: {
          status: 'failed',
          error_message: errorMsg,
          next_retry_at: nextRetry,
          attempts: nextAttempts,
        },
      }
    );
    return { success: false, error: errorMsg };
  }

  const targetUrl = `${baseUrl}/api/sessions/${sessionId}/messages/send-text`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-Key': apiKey,
        'Idempotency-Key': record.event_key,
      },
      body: JSON.stringify({
        chatId: record.chat_id,
        text: record.message_text,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (response.status === 200 || response.status === 201) {
      const messageId = responseData?.messageId || responseData?.id || 'openwa_ack';
      await WhatsAppMessageModel.updateOne(
        { _id: recordId },
        {
          $set: {
            status: 'sent',
            openwa_message_id: messageId,
            sent_at: new Date(),
            error_message: null,
            next_retry_at: null,
          },
          $inc: { attempts: 1 },
        }
      );

      return {
        success: true,
        messageId,
      };
    }

    const safeError = `HTTP ${response.status}: ${responseData?.message || responseData?.error || 'OpenWA rejected send'}`;
    console.warn(`[OpenWA] Order #${record.order_id} message delivery rejected: ${safeError}`);

    const nextAttempts = (record.attempts || 0) + 1;
    const nextRetry = calculateNextRetry(nextAttempts);

    await WhatsAppMessageModel.updateOne(
      { _id: recordId },
      {
        $set: {
          status: 'failed',
          error_message: safeError,
          next_retry_at: nextRetry,
          attempts: nextAttempts,
        },
      }
    );

    return {
      success: false,
      error: safeError,
    };
  } catch (netErr: any) {
    const safeError =
      netErr?.name === 'AbortError'
        ? 'Request timed out after 12s connecting to OpenWA'
        : netErr?.message || 'Network error connecting to OpenWA';

    console.warn(`[OpenWA] Order #${record.order_id} send failed: ${safeError}`);

    const nextAttempts = (record.attempts || 0) + 1;
    const nextRetry = calculateNextRetry(nextAttempts);

    await WhatsAppMessageModel.updateOne(
      { _id: recordId },
      {
        $set: {
          status: 'failed',
          error_message: safeError,
          next_retry_at: nextRetry,
          attempts: nextAttempts,
        },
      }
    );

    return {
      success: false,
      error: safeError,
    };
  }
}

/**
 * Sends a transactional WhatsApp message via OpenWA with:
 * - Robust phone normalization
 * - Database-backed event deduplication
 * - Outbox recording
 * - OpenWA Idempotency-Key support
 * - Safe error handling (never throws, never logs keys, never blocks caller)
 */
export async function sendWhatsAppOrderMessage(options: SendWhatsAppOrderMessageOptions): Promise<SendWhatsAppResult> {
  const { orderId, phone, action, templateData, consent } = options;

  // 1. Check user consent
  if (consent === false) {
    return {
      success: false,
      skipped: true,
      reason: 'USER_OPTED_OUT',
    };
  }

  // 2. Validate and normalize recipient phone
  const phoneValidation = normalizeIndianPhone(phone);
  if (!phoneValidation.isValid || !phoneValidation.chatId || !phoneValidation.normalized) {
    console.warn(`[OpenWA] Order #${orderId}: Refusing WhatsApp send due to invalid phone: ${phoneValidation.error}`);
    return {
      success: false,
      skipped: true,
      error: phoneValidation.error || 'Invalid phone number',
    };
  }

  // 3. Check OpenWA configuration
  const apiKey = env.OPENWA_API_KEY?.trim();
  if (!apiKey) {
    // Graceful skip when OpenWA is not configured in this environment
    return {
      success: false,
      skipped: true,
      reason: 'OPENWA_NOT_CONFIGURED',
    };
  }

  // 4. Construct unique deduplication key for this event & order
  const eventKey = `${orderId}:${action}`;
  const messageText = formatWhatsAppMessage(action, templateData);

  // 5. Check database outbox for duplicate event
  let outboxRecord = await WhatsAppMessageModel.findOne({ event_key: eventKey });
  if (outboxRecord) {
    if (outboxRecord.status === 'sent') {
      return {
        success: true,
        replayed: true,
        messageId: outboxRecord.openwa_message_id || undefined,
      };
    }
    // If pending and attempted recently (<30s), another process is handling it
    if (outboxRecord.status === 'pending' && Date.now() - outboxRecord.updated_at.getTime() < 30000) {
      return {
        success: false,
        skipped: true,
        reason: 'DELIVERY_IN_PROGRESS',
      };
    }
  } else {
    try {
      outboxRecord = await WhatsAppMessageModel.create({
        order_id: orderId,
        event_key: eventKey,
        recipient_phone: phoneValidation.normalized,
        chat_id: phoneValidation.chatId,
        template_action: action,
        message_text: messageText,
        status: 'pending',
        attempts: 0,
      });
    } catch (insertErr: any) {
      // Duplicate key error in concurrent race
      if (insertErr?.code === 11000) {
        return { success: true, replayed: true };
      }
      throw insertErr;
    }
  }

  // 6. Dispatch message via outbox dispatcher
  return await dispatchOutboxMessage(outboxRecord);
}

let retryWorkerTimer: NodeJS.Timeout | null = null;
let initialWorkerTimer: NodeJS.Timeout | null = null;
let isProcessingRetries = false;

/**
 * Sweeps the database outbox for overdue failed or stale pending WhatsApp messages
 * and re-attempts dispatch with exponential backoff.
 */
export async function processPendingWhatsAppRetries(
  batchSize: number = 10
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (isProcessingRetries) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  isProcessingRetries = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const now = new Date();
    const stalePendingCutoff = new Date(Date.now() - 60000);

    const candidates = await WhatsAppMessageModel.find({
      $or: [
        {
          status: 'failed',
          next_retry_at: { $lte: now },
          attempts: { $lt: MAX_RETRY_ATTEMPTS },
        },
        {
          status: 'pending',
          attempts: { $lt: MAX_RETRY_ATTEMPTS },
          updated_at: { $lte: stalePendingCutoff },
        },
      ],
    })
      .sort({ next_retry_at: 1, created_at: 1 })
      .limit(batchSize)
      .lean();

    for (const candidate of candidates) {
      // Safely claim candidate to prevent race conditions across workers
      const claimed = await WhatsAppMessageModel.findOneAndUpdate(
        {
          _id: candidate._id,
          status: candidate.status,
          updated_at: candidate.updated_at,
        },
        {
          $set: {
            status: 'pending',
            updated_at: new Date(),
          },
        },
        { new: true }
      );

      if (!claimed) {
        continue;
      }

      processed++;
      const res = await dispatchOutboxMessage(claimed);
      if (res.success) {
        succeeded++;
      } else {
        failed++;
      }
    }
  } catch (err: any) {
    console.error('[OpenWA] Error in retry worker loop:', err?.message || err);
  } finally {
    isProcessingRetries = false;
  }

  return { processed, succeeded, failed };
}

/**
 * Starts the durable background retry worker for WhatsApp notifications.
 * Safe to invoke across restarts; runs periodically with non-overlapping sweeps.
 */
export function startWhatsAppRetryWorker(intervalMs: number = 60000): NodeJS.Timeout | null {
  if (retryWorkerTimer) {
    return retryWorkerTimer;
  }
  console.log(`🌿 [OpenWA] Started WhatsApp retry worker (interval: ${intervalMs}ms)`);

  initialWorkerTimer = setTimeout(() => {
    initialWorkerTimer = null;
    processPendingWhatsAppRetries().catch(() => {});
  }, 5000);
  if (initialWorkerTimer.unref) initialWorkerTimer.unref();

  retryWorkerTimer = setInterval(() => {
    processPendingWhatsAppRetries().catch((err) => {
      console.warn('[OpenWA] WhatsApp retry worker interval error:', err?.message || err);
    });
  }, intervalMs);

  if (retryWorkerTimer.unref) retryWorkerTimer.unref();
  return retryWorkerTimer;
}

/**
 * Stops the background retry worker cleanly during server shutdown.
 */
export function stopWhatsAppRetryWorker(): void {
  if (initialWorkerTimer) {
    clearTimeout(initialWorkerTimer);
    initialWorkerTimer = null;
  }
  if (retryWorkerTimer) {
    clearInterval(retryWorkerTimer);
    retryWorkerTimer = null;
    console.log('[OpenWA] WhatsApp retry worker stopped');
  }
}

/**
 * Dispatches WhatsApp order notifications driven by NotificationEvents.
 * Safe and non-blocking: catches any internal errors.
 */
export async function handleOrderNotificationEvent(
  event: NotificationEvent,
  userPreferences?: any
): Promise<SendWhatsAppResult | null> {
  // Only process order events that contain an orderId
  if (!('orderId' in event) || !event.orderId) {
    return null;
  }

  try {
    const { OrderModel } = await import('../models/Order');
    const order = await OrderModel.findById(event.orderId).lean();
    if (!order) {
      return null;
    }

    // Server-side consent enforcement:
    // 1. Order-level opt-in toggle from checkout
    if (order.customer_info?.whatsapp_consent === false) {
      return { success: false, skipped: true, reason: 'USER_OPTED_OUT' };
    }

    // 2. User profile-level notification preferences
    let userWaUpdates = userPreferences?.whatsapp_order_updates;
    if (userWaUpdates === undefined && order.user_id) {
      try {
        const { User } = await import('../models/User');
        const userDoc = await User.findById(order.user_id).select('notification_preferences').lean();
        userWaUpdates = userDoc?.notification_preferences?.whatsapp_order_updates;
      } catch {}
    }
    if (userWaUpdates === false) {
      return { success: false, skipped: true, reason: 'USER_OPTED_OUT' };
    }

    const phone = order.customer_info?.phone;
    if (!phone) {
      return { success: false, skipped: true, reason: 'NO_PHONE_NUMBER' };
    }

    const orderIdStr = String(order.id || (order as any)._id);
    const customerName = order.customer_info?.name || 'Customer';
    const orderNumber = order.order_number || orderIdStr.slice(-6).toUpperCase();
    const total = order.subtotal;

    let templateAction: WhatsAppTemplateAction | null = null;
    const templateData: WhatsAppTemplateData = {
      customerName,
      orderNumber,
      total,
      paymentStatus: order.payment_status,
      courier: 'courier' in event && event.courier ? event.courier : order.courier,
      trackingNumber: 'trackingNumber' in event && event.trackingNumber ? event.trackingNumber : order.tracking_number,
      reason: 'reason' in event && event.reason ? event.reason : undefined,
    };

    switch (event.action) {
      case 'order_placed':
        if (order.payment_method === 'cod') {
          templateAction = 'order_placed_cod';
        } else {
          // For Razorpay online orders, skip sending order_placed WhatsApp message
          // because a consolidated confirmation is sent upon payment verification (payment_successful).
          return { success: false, skipped: true, reason: 'ONLINE_ORDER_CONFIRMED_VIA_PAYMENT' };
        }
        break;

      case 'payment_successful':
        templateAction = 'payment_successful';
        break;

      case 'order_status_changed':
        if (event.status === 'processing') {
          templateAction = 'order_processing';
        } else if (event.status === 'shipped') {
          templateAction = 'order_shipped';
        } else if (event.status === 'out_for_delivery') {
          templateAction = 'out_for_delivery';
        } else if (event.status === 'delivered') {
          templateAction = 'order_delivered';
        } else if (event.status === 'cancelled') {
          templateAction = 'order_cancelled';
        }
        break;

      case 'order_shipped':
        templateAction = 'order_shipped';
        break;

      case 'out_for_delivery':
        templateAction = 'out_for_delivery';
        break;

      case 'order_delivered':
        templateAction = 'order_delivered';
        break;

      case 'order_cancelled':
        templateAction = 'order_cancelled';
        break;

      case 'refund_update':
        if (event.status === 'completed') {
          templateAction = 'refund_completed';
          if (event.amount) templateData.total = event.amount;
        } else if (event.status === 'pending') {
          templateAction = 'refund_pending';
          if (event.amount) templateData.total = event.amount;
        }
        break;

      default:
        return null;
    }

    if (!templateAction) {
      return null;
    }

    return await sendWhatsAppOrderMessage({
      orderId: orderIdStr,
      phone,
      action: templateAction,
      templateData,
      consent: true,
    });
  } catch (err: any) {
    console.error(`[OpenWA] Failed handling order notification event for order #${(event as any).orderId}:`, err?.message || err);
    return { success: false, error: err?.message || 'Internal error' };
  }
}

/**
 * Health and connectivity status checker for OpenWA.
 * Safe for admin diagnostics; does not expose credentials.
 */
export async function checkOpenWAHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  sessionId?: string;
  error?: string;
}> {
  const apiKey = env.OPENWA_API_KEY?.trim();
  if (!apiKey) {
    return { configured: false, connected: false, error: 'OPENWA_API_KEY is not configured in environment' };
  }

  try {
    const sessionId = await getActiveOpenWASessionId();
    if (!sessionId) {
      return { configured: true, connected: false, error: 'OpenWA API reachable but no active session found' };
    }

    return {
      configured: true,
      connected: true,
      sessionId,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: err?.message || 'Failed to connect to OpenWA gateway',
    };
  }
}

/**
 * Sends a manual test message to verify OpenWA connectivity and delivery.
 * Defaults to the verified testing number 9342763553.
 * Restricted to authenticated admins only.
 */
export async function sendTestWhatsAppMessage(phone: string = '9342763553'): Promise<SendWhatsAppResult> {
  const phoneValidation = normalizeIndianPhone(phone);
  if (!phoneValidation.isValid || !phoneValidation.chatId || !phoneValidation.normalized) {
    return {
      success: false,
      error: phoneValidation.error || 'Invalid test phone number',
    };
  }

  const sessionId = await getActiveOpenWASessionId();
  if (!sessionId) {
    return { success: false, error: 'No active OpenWA session found' };
  }

  const baseUrl = (env.OPENWA_BASE_URL || 'http://localhost:2785').replace(/\/+$/, '');
  const apiKey = env.OPENWA_API_KEY?.trim();

  if (!apiKey) {
    return { success: false, error: 'OPENWA_API_KEY is not configured' };
  }

  const targetUrl = `${baseUrl}/api/sessions/${sessionId}/messages/send-text`;
  const text = `RenewX Crew OpenWA verification: Your WhatsApp integration is connected and working! [${new Date().toLocaleTimeString()}]`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        chatId: phoneValidation.chatId,
        text,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let body: any = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (res.status === 200 || res.status === 201) {
      return {
        success: true,
        messageId: body?.messageId || body?.id || 'ack',
      };
    }

    return {
      success: false,
      error: `HTTP ${res.status}: ${body?.message || body?.error || 'Rejected by OpenWA'}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.name === 'AbortError' ? 'Timed out connecting to OpenWA' : err?.message || 'Network error',
    };
  }
}
