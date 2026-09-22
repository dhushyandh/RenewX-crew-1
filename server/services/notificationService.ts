import { NotificationModel } from '../models/Notification';
import { User } from '../models/User';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_BATCH_SIZE = 100;

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Validates whether a given token is a valid Expo Push Token.
 * Follows official Expo SDK logic:
 * - ExponentPushToken[...] or ExpoPushToken[...] (bracket format)
 * - EAS push token UUID format: 8-4-4-4-12 hex string
 */
export function isExpoPushToken(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const token = value.trim();
  if (!token || token.length > 256) return false;

  const isBracketFormat =
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) &&
    token.endsWith(']') &&
    token.length > 20;

  const isUuidFormat = /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/i.test(token);

  return isBracketFormat || isUuidFormat;
}

async function sendExpoPushMessages(messages: Array<Record<string, unknown>>): Promise<void> {
  for (let start = 0; start < messages.length; start += MAX_BATCH_SIZE) {
    const batch = messages.slice(start, start + MAX_BATCH_SIZE);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      };

      const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.error('[Notifications] Expo Push Service returned HTTP', response.status);
        continue;
      }

      const result = await response.json() as {
        data?: Array<{ status?: string; details?: { error?: string }; message?: string }>;
      };

      const tickets = result.data || [];
      const invalidTokens = tickets
        .map((ticket, index) => ticket?.details?.error === 'DeviceNotRegistered' ? batch[index]?.to : null)
        .filter((token): token is string => typeof token === 'string');

      if (invalidTokens.length) {
        console.warn(`[Notifications] Pruning ${invalidTokens.length} unregistered device token(s)`);
        await User.updateMany(
          { push_tokens: { $in: invalidTokens } },
          { $pull: { push_tokens: { $in: invalidTokens } } }
        ).exec();
      }

      const errors = tickets.filter((ticket) => ticket?.status === 'error');
      if (errors.length) {
        console.warn('[Notifications] Expo rejected', errors.length, 'push message(s):', errors);
      } else {
        console.log(`[Notifications] Expo accepted ${tickets.length} push notification(s) successfully.`);
      }
    } catch (error) {
      console.error('[Notifications] Expo Push Service request failed:', error);
    }
  }
}

export async function createUserNotification(
  userId: string,
  payload: {
    type: string;
    title: string;
    body: string;
    reference_id?: string;
    reference_type?: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  await NotificationModel.create({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    reference_id: payload.reference_id,
    reference_type: payload.reference_type,
  });

  const user = await User.findById(userId).select('+push_tokens');
  const rawTokens = user?.push_tokens || [];
  const tokens = rawTokens.filter(isExpoPushToken);

  if (!tokens.length) {
    console.warn(`[Notifications] Push skipped for user ${userId}: no valid Expo push tokens registered (raw tokens in DB: ${rawTokens.length})`);
    return;
  }

  console.log(`[Notifications] Dispatching push notification "${payload.title}" to ${tokens.length} device(s) for user ${userId}...`);

  await sendExpoPushMessages(
    tokens.map((to) => ({
      to,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      channelId: 'default',
    }))
  );
}

export type NotificationEvent =
  | {
    action: 'order_placed';
    userId: string;
    orderId: string;
    subtotal?: number;
    paymentMethod?: string;
  }
  | {
    action: 'payment_successful';
    userId: string;
    orderId: string;
    subtotal?: number;
  }
  | {
    action: 'order_status_changed';
    userId: string;
    orderId: string;
    status: string;
    courier?: string;
    trackingNumber?: string;
  }
  | {
    action: 'order_shipped';
    userId: string;
    orderId: string;
    courier?: string;
    trackingNumber?: string;
  }
  | {
    action: 'out_for_delivery';
    userId: string;
    orderId: string;
    courier?: string;
  }
  | {
    action: 'order_delivered';
    userId: string;
    orderId: string;
  }
  | {
    action: 'order_cancelled';
    userId: string;
    orderId: string;
    reason?: string;
  }
  | {
    action: 'refund_update';
    userId: string;
    orderId: string;
    amount?: number;
    status?: 'initiated' | 'completed' | 'pending';
  }
  | {
    action: 'trade_in_submitted';
    userId: string;
    tradeInId: string;
    brand?: string;
    model?: string;
    valuation?: number;
  }
  | {
    action: 'trade_in_status_changed';
    userId: string;
    tradeInId: string;
    brand?: string;
    model?: string;
    status: string;
  }
  | {
    action: 'trade_in_valuation_changed';
    userId: string;
    tradeInId: string;
    brand?: string;
    model?: string;
    amount: number;
  }
  | {
    action: 'pickup_scheduled';
    userId: string;
    tradeInId: string;
    brand?: string;
    model?: string;
    scheduledDate?: string;
  }
  | {
    action: 'pickup_completed';
    userId: string;
    tradeInId: string;
    brand?: string;
    model?: string;
  }
  | {
    action: 'account_security_update';
    userId: string;
    title?: string;
    message: string;
  };

export async function notifyUserEvent(event: NotificationEvent): Promise<void> {
  try {
    const user = await User.findById(event.userId).select('notification_preferences');
    if (!user) return;

    let type = 'order';
    let title = '';
    let body = '';
    let reference_id: string | undefined;
    let reference_type: string | undefined;
    let data: Record<string, unknown> = { screen: 'Notifications' };

    switch (event.action) {
      // 1. 🛒 Order placed -> Order placed successfully
      case 'order_placed': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Order placed successfully';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        body = `Your order #${orderShort} has been placed successfully${event.paymentMethod ? ` via ${event.paymentMethod}` : ''}.`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 2. 💳 Payment successful -> Payment confirmed
      case 'payment_successful': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Payment confirmed';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        const amountStr = event.subtotal ? ` of ₹${Number(event.subtotal).toLocaleString('en-IN')}` : '';
        body = `Your payment${amountStr} for order #${orderShort} has been confirmed. We are preparing your order.`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 3. 📦 Order status changed -> Order status updated
      case 'order_status_changed': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Order status updated';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        body = `Your order #${orderShort} is now ${event.status.replace(/_/g, ' ')}.`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 4. 🚚 Order shipped -> Shipment update
      case 'order_shipped': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Shipment update';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        const courierStr = event.courier ? ` via ${event.courier}` : '';
        const trackingStr = event.trackingNumber ? ` (Tracking: ${event.trackingNumber})` : '';
        body = `Your order #${orderShort} has been shipped${courierStr}.${trackingStr}`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 5. 🏠 Out for delivery -> Delivery update
      case 'out_for_delivery': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Delivery update';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        body = `Your order #${orderShort} is out for delivery today! Our courier executive will contact you shortly.`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 6. ✅ Order delivered -> Order delivered
      case 'order_delivered': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Order delivered';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        body = `Your order #${orderShort} has been delivered successfully. Thank you for choosing RenewX!`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 7. ❌ Order cancelled -> Order cancelled
      case 'order_cancelled': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Order cancelled';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        const reasonStr = event.reason ? `: ${event.reason}` : '.';
        body = `Your order #${orderShort} has been cancelled${reasonStr}`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 8. 💰 Refund initiated/completed -> Refund update
      case 'refund_update': {
        if (user.notification_preferences?.order_updates === false) return;
        type = 'order';
        title = 'Refund update';
        const orderShort = event.orderId.slice(-6).toUpperCase();
        const amountStr = event.amount ? ` ₹${Number(event.amount).toLocaleString('en-IN')}` : '';
        const statusStr = event.status === 'completed' ? 'processed successfully' : 'initiated';
        body = `A refund of${amountStr} for order #${orderShort} has been ${statusStr} to your original payment method.`;
        reference_id = event.orderId;
        reference_type = 'order';
        data = { screen: 'Orders', orderId: event.orderId };
        break;
      }

      // 9. 📱 Trade-in submitted -> Sell request submitted
      case 'trade_in_submitted': {
        if (user.notification_preferences?.sell_request_updates === false) return;
        type = 'trade_in';
        title = 'Sell request submitted';
        const deviceName = [event.brand, event.model].filter(Boolean).join(' ') || 'device';
        body = `Your sell request for ${deviceName} has been submitted and is awaiting review.`;
        reference_id = event.tradeInId;
        reference_type = 'trade_in';
        data = { screen: 'TradeIn', tradeInId: event.tradeInId };
        break;
      }

      // 10. 🔄 Trade-in status changed -> Sell request updated
      case 'trade_in_status_changed': {
        if (user.notification_preferences?.sell_request_updates === false) return;
        type = 'trade_in';
        title = 'Sell request updated';
        const deviceName = [event.brand, event.model].filter(Boolean).join(' ') || 'device';
        body = `Your sell request for ${deviceName} is now ${event.status.replace(/_/g, ' ')}.`;
        reference_id = event.tradeInId;
        reference_type = 'trade_in';
        data = { screen: 'TradeIn', tradeInId: event.tradeInId };
        break;
      }

      // 11. 💰 Trade-in valuation/amount changed -> Valuation updated
      case 'trade_in_valuation_changed': {
        if (user.notification_preferences?.sell_request_updates === false) return;
        type = 'trade_in';
        title = 'Valuation updated';
        const deviceName = [event.brand, event.model].filter(Boolean).join(' ') || 'device';
        body = `The valuation for your ${deviceName} has been updated to ₹${Number(event.amount).toLocaleString('en-IN')}.`;
        reference_id = event.tradeInId;
        reference_type = 'trade_in';
        data = { screen: 'TradeIn', tradeInId: event.tradeInId };
        break;
      }

      // 12. 📅 Pickup scheduled -> Pickup scheduled
      case 'pickup_scheduled': {
        if (user.notification_preferences?.sell_request_updates === false) return;
        type = 'trade_in';
        title = 'Pickup scheduled';
        const deviceName = [event.brand, event.model].filter(Boolean).join(' ') || 'device';
        const dateStr = event.scheduledDate ? ` for ${event.scheduledDate}` : '';
        body = `Pickup for your ${deviceName} has been scheduled${dateStr}. Our executive will visit your address.`;
        reference_id = event.tradeInId;
        reference_type = 'trade_in';
        data = { screen: 'TradeIn', tradeInId: event.tradeInId };
        break;
      }

      // 13. 📦 Pickup completed -> Device picked up
      case 'pickup_completed': {
        if (user.notification_preferences?.sell_request_updates === false) return;
        type = 'trade_in';
        title = 'Device picked up';
        const deviceName = [event.brand, event.model].filter(Boolean).join(' ') || 'device';
        body = `Your ${deviceName} has been picked up successfully and is being processed for final inspection.`;
        reference_id = event.tradeInId;
        reference_type = 'trade_in';
        data = { screen: 'TradeIn', tradeInId: event.tradeInId };
        break;
      }

      // 14. ⚙️ Important account/security event -> Account/security update
      case 'account_security_update': {
        type = 'security';
        title = event.title || 'Account/security update';
        body = event.message;
        data = { screen: 'Security' };
        break;
      }
    }

    if (!title || !body) return;

    await createUserNotification(event.userId, {
      type,
      title,
      body,
      reference_id,
      reference_type,
      data,
    });
  } catch (err) {
    console.error('[Notifications] Failed to notify user event:', err);
  }
}

/**
 * Broadcasts a "New Arrival" notification to ALL registered users and their devices
 * when an admin publishes a new product.
 */
export async function broadcastNewProductArrival(product: {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  image?: string;
}): Promise<void> {
  try {
    const brandPrefix = product.brand ? `${product.brand} ` : '';
    const priceStr = product.price ? ` starting at ₹${Number(product.price).toLocaleString('en-IN')}` : '';
    const title = `✨ New Arrival: ${brandPrefix}${product.name}`;
    const body = `Explore the newly added ${brandPrefix}${product.name}${priceStr}. Available in stock now!`;

    const allUsers = await User.find({}).select('_id notification_preferences +push_tokens').lean();
    if (!allUsers || !allUsers.length) return;

    const notificationsToInsert: Array<{
      user_id: string;
      type: string;
      title: string;
      body: string;
      reference_id: string;
      reference_type: string;
    }> = [];

    const pushMessages: Array<Record<string, unknown>> = [];

    for (const u of allUsers) {
      const uId = u._id.toString();

      notificationsToInsert.push({
        user_id: uId,
        type: 'product',
        title,
        body,
        reference_id: String(product.id),
        reference_type: 'product',
      });

      const rawTokens = (u as any).push_tokens || [];
      const validTokens = rawTokens.filter(isExpoPushToken);

      for (const to of validTokens) {
        pushMessages.push({
          to,
          sound: 'default',
          title,
          body,
          data: {
            screen: 'ProductDetail',
            productId: String(product.id),
            id: String(product.id),
          },
          channelId: 'default',
        });
      }
    }

    // 1. Batch insert in-app notifications into MongoDB for all users
    if (notificationsToInsert.length) {
      try {
        await NotificationModel.insertMany(notificationsToInsert, { ordered: false });
        console.log(`[Notifications] Broadcasted new arrival notification to ${notificationsToInsert.length} user inbox(es).`);
      } catch (insertErr) {
        console.error('[Notifications] Failed batch inserting new arrival notifications:', insertErr);
      }
    }

    // 2. Dispatch push notifications to all users' devices
    if (pushMessages.length) {
      console.log(`[Notifications] Dispatching new arrival push broadcast to ${pushMessages.length} device(s)...`);
      await sendExpoPushMessages(pushMessages);
    } else {
      console.log('[Notifications] No registered Expo push tokens for new arrival broadcast.');
    }
  } catch (err) {
    console.error('[Notifications] Error in broadcastNewProductArrival:', err);
  }
}

