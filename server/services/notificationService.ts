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
