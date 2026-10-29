import test, { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  normalizeIndianPhone,
  formatWhatsAppMessage,
  sendWhatsAppOrderMessage,
  handleOrderNotificationEvent,
  checkOpenWAHealth,
  calculateNextRetry,
  MAX_RETRY_ATTEMPTS,
  BASE_RETRY_DELAY_MS,
  processPendingWhatsAppRetries,
  startWhatsAppRetryWorker,
  stopWhatsAppRetryWorker,
} from '../services/openwaService';
import { WhatsAppMessageModel } from '../models/WhatsAppMessage';
import { OrderModel } from '../models/Order';
import { env } from '../config/env';

describe('OpenWA WhatsApp Integration Test Suite', () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = env.OPENWA_API_KEY;
  const originalBaseUrl = env.OPENWA_BASE_URL;
  const originalSessionId = env.OPENWA_SESSION_ID;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.OPENWA_API_KEY = originalApiKey;
    env.OPENWA_BASE_URL = originalBaseUrl;
    env.OPENWA_SESSION_ID = originalSessionId;
  });

  describe('1. Phone Number Normalization & Validation', () => {
    it('should correctly normalize standard 10-digit Indian numbers', () => {
      const result = normalizeIndianPhone('9342763553');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '919342763553');
      assert.strictEqual(result.chatId, '919342763553@c.us');
    });

    it('should normalize numbers with country code prefix (+91)', () => {
      const result = normalizeIndianPhone('+919342763553');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '919342763553');
      assert.strictEqual(result.chatId, '919342763553@c.us');
    });

    it('should normalize formatted numbers with spaces and dashes', () => {
      const result = normalizeIndianPhone('+91 (93427) 635-53');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '919342763553');
      assert.strictEqual(result.chatId, '919342763553@c.us');
    });

    it('should strip trunk 0 prefix from 11-digit numbers', () => {
      const result = normalizeIndianPhone('09342763553');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '919342763553');
      assert.strictEqual(result.chatId, '919342763553@c.us');
    });

    it('should preserve already formatted 91 prefix numbers', () => {
      const result = normalizeIndianPhone('919342763553');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '919342763553');
      assert.strictEqual(result.chatId, '919342763553@c.us');
    });

    it('should accept numbers already provided with @c.us suffix', () => {
      const result = normalizeIndianPhone('919342763553@c.us');
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.normalized, '919342763553');
      assert.strictEqual(result.chatId, '919342763553@c.us');
    });

    it('should reject invalid or non-Indian phone numbers', () => {
      assert.strictEqual(normalizeIndianPhone('').isValid, false);
      assert.strictEqual(normalizeIndianPhone(null).isValid, false);
      assert.strictEqual(normalizeIndianPhone(undefined).isValid, false);
      assert.strictEqual(normalizeIndianPhone('12345').isValid, false);
      assert.strictEqual(normalizeIndianPhone('abcdefghij').isValid, false);
      assert.strictEqual(normalizeIndianPhone('5876543210').isValid, false);
      assert.strictEqual(normalizeIndianPhone('1876543210').isValid, false);
      assert.strictEqual(normalizeIndianPhone('9193427635539999').isValid, false);
    });
  });

  describe('2. Branded Message Templates', () => {
    const templateData = {
      customerName: 'Dhushyandh',
      orderNumber: 'A1B2C3',
      total: 24999,
      courier: 'BlueDart Express',
      trackingNumber: 'BD123456789IN',
    };

    it('should format COD order confirmation correctly without claiming online payment succeeded', () => {
      const message = formatWhatsAppMessage('order_placed_cod', templateData);
      assert.ok(message.includes('Hi Dhushyandh'));
      assert.ok(message.includes('order #A1B2C3 has been placed successfully'));
      assert.ok(message.includes('Total: ₹24,999'));
      assert.ok(message.includes('Payment: Cash on Delivery'));
      assert.ok(!message.includes('Paid via Razorpay'));
    });

    it('should format consolidated payment confirmation with total and verified status', () => {
      const message = formatWhatsAppMessage('payment_successful', templateData);
      assert.ok(message.includes('Hi Dhushyandh'));
      assert.ok(message.includes('payment for RenewX Crew order #A1B2C3 has been verified successfully'));
      assert.ok(message.includes('Total: ₹24,999'));
      assert.ok(message.includes('Thank you for choosing RenewX Crew!'));
    });

    it('should format shipped status update with courier and tracking details', () => {
      const message = formatWhatsAppMessage('order_shipped', templateData);
      assert.ok(message.includes('has been shipped via BlueDart Express'));
      assert.ok(message.includes('Tracking: BD123456789IN'));
    });

    it('should format out for delivery status update', () => {
      const message = formatWhatsAppMessage('out_for_delivery', templateData);
      assert.ok(message.includes('order #A1B2C3 is out for delivery'));
    });

    it('should format delivered status update', () => {
      const message = formatWhatsAppMessage('order_delivered', templateData);
      assert.ok(message.includes('order #A1B2C3 has been delivered'));
      assert.ok(message.includes('Thank you for choosing RenewX Crew!'));
    });

    it('should format cancelled status update without exposing sensitive info', () => {
      const message = formatWhatsAppMessage('order_cancelled', { ...templateData, reason: 'Customer requested' });
      assert.ok(message.includes('order #A1B2C3 has been cancelled'));
      assert.ok(message.includes('Reason: Customer requested'));
      assert.ok(message.includes('Please contact our support team'));
    });

    it('should format completed refund update correctly', () => {
      const message = formatWhatsAppMessage('refund_completed', { customerName: 'Dhushyandh', orderNumber: 'A1B2C3', total: 24999 });
      assert.ok(message.includes('refund of ₹24,999'));
      assert.ok(message.includes('processed successfully'));
    });

    it('should format pending refund update correctly', () => {
      const message = formatWhatsAppMessage('refund_pending', { customerName: 'Dhushyandh', orderNumber: 'A1B2C3', total: 24999 });
      assert.ok(message.includes('refund of ₹24,999'));
      assert.ok(message.includes('currently pending processing'));
    });
  });

  describe('3. OpenWA REST API Dispatch & Idempotency Header', () => {
    beforeEach(() => {
      env.OPENWA_BASE_URL = 'http://localhost:2785';
      env.OPENWA_API_KEY = 'test_secret_key';
      env.OPENWA_SESSION_ID = 'cd7a4607-0323-4a5b-98a3-a48452564661';
    });

    it('should send HTTP POST with correct headers, URL and payload to OpenWA', async () => {
      let interceptedUrl = '';
      let interceptedHeaders: any = {};
      let interceptedBody: any = {};

      globalThis.fetch = (async (url: string, init: any) => {
        interceptedUrl = url;
        interceptedHeaders = init.headers;
        interceptedBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ messageId: 'openwa_msg_123', status: 'sent' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => ({
        _id: 'mock_outbox_1',
        ...doc,
      })) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      try {
        const result = await sendWhatsAppOrderMessage({
          orderId: '672000000000000000000001',
          phone: '9342763553',
          action: 'order_placed_cod',
          templateData: {
            customerName: 'Dhushyandh',
            orderNumber: 'A1B2C3',
            total: 15999,
          },
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.messageId, 'openwa_msg_123');
        assert.strictEqual(
          interceptedUrl,
          'http://localhost:2785/api/sessions/cd7a4607-0323-4a5b-98a3-a48452564661/messages/send-text'
        );
        assert.strictEqual(interceptedHeaders['X-API-Key'], 'test_secret_key');
        assert.strictEqual(interceptedHeaders['Idempotency-Key'], '672000000000000000000001:order_placed_cod');
        assert.strictEqual(interceptedBody.chatId, '919342763553@c.us');
        assert.ok(interceptedBody.text.includes('RenewX Crew order #A1B2C3'));
      } finally {
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });
  });

  describe('4. Database Outbox Deduplication & Replay Prevention', () => {
    it('should return replayed status and NOT make HTTP call if event was already sent', async () => {
      let httpCalls = 0;
      globalThis.fetch = (async () => {
        httpCalls++;
        return new Response('{}', { status: 200 });
      }) as any;

      const originalFindOne = WhatsAppMessageModel.findOne;
      WhatsAppMessageModel.findOne = (async () => ({
        _id: 'mock_outbox_existing',
        order_id: '672000000000000000000001',
        event_key: '672000000000000000000001:order_placed_cod',
        status: 'sent',
        openwa_message_id: 'existing_openwa_id_999',
      })) as any;

      try {
        const result = await sendWhatsAppOrderMessage({
          orderId: '672000000000000000000001',
          phone: '9342763553',
          action: 'order_placed_cod',
          templateData: { orderNumber: 'A1B2C3' },
        });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.replayed, true);
        assert.strictEqual(result.messageId, 'existing_openwa_id_999');
        assert.strictEqual(httpCalls, 0);
      } finally {
        WhatsAppMessageModel.findOne = originalFindOne;
      }
    });
  });

  describe('5. Resilience & Non-Blocking Behavior', () => {
    it('should gracefully skip when OPENWA_API_KEY is missing without throwing', async () => {
      env.OPENWA_API_KEY = '';

      const result = await sendWhatsAppOrderMessage({
        orderId: '672000000000000000000001',
        phone: '9342763553',
        action: 'order_placed_cod',
        templateData: { orderNumber: 'A1B2C3' },
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.reason, 'OPENWA_NOT_CONFIGURED');
    });

    it('should handle OpenWA 500 error gracefully and mark outbox as failed with next_retry_at', async () => {
      env.OPENWA_API_KEY = 'valid_key';
      env.OPENWA_SESSION_ID = 'cd7a4607-0323-4a5b-98a3-a48452564661';

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ message: 'WhatsApp engine disconnected' }), { status: 500 });
      }) as any;

      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let updatedStatus = '';
      let updatedNextRetry: Date | null = null;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => ({
        _id: 'doc_fail_1',
        attempts: 0,
        ...doc,
      })) as any;
      WhatsAppMessageModel.updateOne = (async (_query: any, update: any) => {
        if (update?.$set?.status) updatedStatus = update.$set.status;
        if (update?.$set?.next_retry_at) updatedNextRetry = update.$set.next_retry_at;
        return { modifiedCount: 1 };
      }) as any;

      try {
        const result = await sendWhatsAppOrderMessage({
          orderId: '672000000000000000000001',
          phone: '9342763553',
          action: 'order_placed_cod',
          templateData: { orderNumber: 'A1B2C3' },
        });

        assert.strictEqual(result.success, false);
        assert.ok(result.error?.includes('HTTP 500'));
        assert.strictEqual(updatedStatus, 'failed');
        assert.ok(updatedNextRetry instanceof Date);
      } finally {
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should handle network timeout without throwing or crashing', async () => {
      env.OPENWA_API_KEY = 'valid_key';
      env.OPENWA_SESSION_ID = 'cd7a4607-0323-4a5b-98a3-a48452564661';

      globalThis.fetch = (async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      }) as any;

      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => ({
        _id: 'doc_timeout_1',
        attempts: 0,
        ...doc,
      })) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      try {
        const result = await sendWhatsAppOrderMessage({
          orderId: '672000000000000000000001',
          phone: '9342763553',
          action: 'order_placed_cod',
          templateData: { orderNumber: 'A1B2C3' },
        });

        assert.strictEqual(result.success, false);
        assert.ok(result.error?.includes('timed out'));
      } finally {
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });
  });

  describe('6. Order Event Lifecycle Integration', () => {
    beforeEach(() => {
      env.OPENWA_BASE_URL = 'http://localhost:2785';
      env.OPENWA_API_KEY = 'test_key';
      env.OPENWA_SESSION_ID = 'cd7a4607-0323-4a5b-98a3-a48452564661';
    });

    it('should dispatch COD order confirmation only when order is saved with COD payment method', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000001',
          payment_method: 'cod',
          payment_status: 'created',
          subtotal: 12500,
          customer_info: {
            name: 'Rohan Sharma',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        return { _id: 'doc_cod_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_cod_1' }), { status: 201 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_placed',
            userId: 'user_1',
            orderId: '672000000000000000000001',
            subtotal: 12500,
            paymentMethod: 'Cash on Delivery',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'order_placed_cod');
        assert.ok(sentText.includes('Cash on Delivery'));
        assert.ok(sentText.includes('Rohan Sharma'));
        assert.ok(sentText.includes('₹12,500'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should dispatch online payment confirmation when payment_successful event is fired', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000002',
          payment_method: 'razorpay',
          payment_status: 'paid',
          subtotal: 34999,
          customer_info: {
            name: 'Priya Patel',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        return { _id: 'doc_pay_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_pay_1' }), { status: 201 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'payment_successful',
            userId: 'user_2',
            orderId: '672000000000000000000002',
            subtotal: 34999,
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'payment_successful');
        assert.ok(sentText.includes('payment for RenewX Crew order'));
        assert.ok(sentText.includes('verified successfully'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });
  });

  describe('7. Retry Worker and Exponential Backoff', () => {
    it('should calculate bounded exponential backoff intervals correctly', () => {
      const now = Date.now();
      const retry1 = calculateNextRetry(1);
      assert.ok(retry1 instanceof Date);
      const delay1 = retry1.getTime() - now;
      assert.ok(delay1 >= 29000 && delay1 <= 31000, `Expected ~30s backoff, got ${delay1}ms`);

      const retry2 = calculateNextRetry(2);
      assert.ok(retry2 instanceof Date);
      const delay2 = retry2.getTime() - now;
      assert.ok(delay2 >= 59000 && delay2 <= 61000, `Expected ~60s backoff, got ${delay2}ms`);

      const retry3 = calculateNextRetry(3);
      assert.ok(retry3 instanceof Date);
      const delay3 = retry3.getTime() - now;
      assert.ok(delay3 >= 119000 && delay3 <= 121000, `Expected ~120s backoff, got ${delay3}ms`);

      // At max attempts (>= 5), backoff should return null (terminal failure)
      const retryMax = calculateNextRetry(5);
      assert.strictEqual(retryMax, null);

      const retryExceeded = calculateNextRetry(6);
      assert.strictEqual(retryExceeded, null);
    });

    it('should safely claim and retry overdue failed messages in the outbox', async () => {
      const originalFind = WhatsAppMessageModel.find;
      const originalFindOneAndUpdate = WhatsAppMessageModel.findOneAndUpdate;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      const overdueDoc = {
        _id: 'outbox_retry_1',
        order_id: 'order_ret_1',
        event_key: 'order_ret_1:order_placed_cod',
        recipient_phone: '919342763553',
        chat_id: '919342763553@c.us',
        template_action: 'order_placed_cod',
        message_text: 'Test retry message',
        status: 'failed',
        attempts: 1,
        next_retry_at: new Date(Date.now() - 5000),
        updated_at: new Date(Date.now() - 60000),
      };

      WhatsAppMessageModel.find = (() => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [overdueDoc],
          }),
        }),
      })) as any;

      let claimed = false;
      WhatsAppMessageModel.findOneAndUpdate = (async (_query: any, _update: any) => {
        claimed = true;
        return { ...overdueDoc, status: 'pending' };
      }) as any;

      let updatedSent = false;
      WhatsAppMessageModel.updateOne = (async (_query: any, update: any) => {
        if (update?.$set?.status === 'sent') updatedSent = true;
        return { modifiedCount: 1 };
      }) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_retry_success' }), { status: 200 });
      }) as any;

      try {
        const stats = await processPendingWhatsAppRetries(5);
        assert.strictEqual(claimed, true);
        assert.strictEqual(stats.processed, 1);
        assert.strictEqual(stats.succeeded, 1);
        assert.strictEqual(updatedSent, true);
      } finally {
        WhatsAppMessageModel.find = originalFind;
        WhatsAppMessageModel.findOneAndUpdate = originalFindOneAndUpdate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should start and stop the retry worker cleanly without throwing', () => {
      const timer = startWhatsAppRetryWorker(30000);
      assert.ok(timer !== null);
      stopWhatsAppRetryWorker();
    });
  });

  describe('8. Razorpay Single Confirmation & Duplicate Prevention', () => {
    it('should skip sending order_placed WhatsApp message for online Razorpay orders', async () => {
      const originalFindById = OrderModel.findById;

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000003',
          payment_method: 'razorpay',
          payment_status: 'created',
          subtotal: 19999,
          customer_info: {
            name: 'Vikram Singh',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_placed',
            userId: 'user_3',
            orderId: '672000000000000000000003',
            subtotal: 19999,
            paymentMethod: 'Razorpay',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.skipped, true);
        assert.strictEqual(res?.reason, 'ONLINE_ORDER_CONFIRMED_VIA_PAYMENT');
      } finally {
        OrderModel.findById = originalFindById;
      }
    });

    it('should format consolidated payment_successful confirmation with total and verification', () => {
      const message = formatWhatsAppMessage('payment_successful', {
        customerName: 'Ananya Roy',
        orderNumber: 'RNX123',
        total: 42999,
      });

      assert.ok(message.includes('Ananya Roy'));
      assert.ok(message.includes('RNX123'));
      assert.ok(message.includes('₹42,999'));
      assert.ok(message.includes('verified successfully'));
    });
  });

  describe('9. Webhook Refund Processing and Consent Enforcement', () => {
    it('should dispatch WhatsApp refund completed notification on refund_update event', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000004',
          payment_method: 'razorpay',
          payment_status: 'refunded',
          subtotal: 15000,
          customer_info: {
            name: 'Karan Mehra',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        return { _id: 'doc_rfnd_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_rfnd_1' }), { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'refund_update',
            userId: 'user_4',
            orderId: '672000000000000000000004',
            amount: 15000,
            status: 'completed',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'refund_completed');
        assert.ok(sentText.includes('refund of ₹15,000'));
        assert.ok(sentText.includes('processed successfully'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should respect user opt-out and skip sending when whatsapp_order_updates is false', async () => {
      const originalFindById = OrderModel.findById;

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000005',
          payment_method: 'cod',
          subtotal: 10000,
          customer_info: {
            name: 'Sneha Rao',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_placed',
            userId: 'user_5',
            orderId: '672000000000000000000005',
            subtotal: 10000,
          },
          { whatsapp_order_updates: false }
        );

        assert.strictEqual(res?.skipped, true);
        assert.strictEqual(res?.reason, 'USER_OPTED_OUT');
      } finally {
        OrderModel.findById = originalFindById;
      }
    });

    it('should respect order-level opt-out when customer_info.whatsapp_consent is false', async () => {
      const originalFindById = OrderModel.findById;

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000006',
          payment_method: 'cod',
          subtotal: 10000,
          customer_info: {
            name: 'Amit Kumar',
            phone: '9342763553',
            whatsapp_consent: false,
          },
        }),
      })) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_placed',
            userId: 'user_6',
            orderId: '672000000000000000000006',
            subtotal: 10000,
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.skipped, true);
        assert.strictEqual(res?.reason, 'USER_OPTED_OUT');
      } finally {
        OrderModel.findById = originalFindById;
      }
    });
  });

  describe('10. Order Status Transitions & Duplicate Prevention', () => {
    beforeEach(() => {
      env.OPENWA_BASE_URL = 'http://localhost:2785';
      env.OPENWA_API_KEY = 'test_key';
      env.OPENWA_SESSION_ID = 'cd7a4607-0323-4a5b-98a3-a48452564661';
    });

    it('should dispatch processing WhatsApp notification on processing status transition', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';
      let sentEventKey = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000010',
          status: 'processing',
          customer_info: {
            name: 'Karthik Raja',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        sentEventKey = doc.event_key;
        return { _id: 'doc_proc_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_proc_1' }), { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_status_changed',
            userId: 'user_10',
            orderId: '672000000000000000000010',
            status: 'processing',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'order_processing');
        assert.strictEqual(sentEventKey, '672000000000000000000010:order_processing');
        assert.ok(sentText.includes('is now processing'));
        assert.ok(sentText.includes('getting it ready for shipment'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should dispatch shipped WhatsApp notification with courier and tracking details', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';
      let sentEventKey = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000011',
          status: 'shipped',
          courier: 'BlueDart Express',
          tracking_number: 'BD987654321IN',
          customer_info: {
            name: 'Karthik Raja',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        sentEventKey = doc.event_key;
        return { _id: 'doc_ship_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_ship_1' }), { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_shipped',
            userId: 'user_10',
            orderId: '672000000000000000000011',
            courier: 'BlueDart Express',
            trackingNumber: 'BD987654321IN',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'order_shipped');
        assert.strictEqual(sentEventKey, '672000000000000000000011:order_shipped');
        assert.ok(sentText.includes('has been shipped via BlueDart Express'));
        assert.ok(sentText.includes('Tracking: BD987654321IN'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should dispatch out_for_delivery WhatsApp notification', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';
      let sentEventKey = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000012',
          status: 'out_for_delivery',
          customer_info: {
            name: 'Karthik Raja',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        sentEventKey = doc.event_key;
        return { _id: 'doc_ofd_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_ofd_1' }), { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'out_for_delivery',
            userId: 'user_10',
            orderId: '672000000000000000000012',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'out_for_delivery');
        assert.strictEqual(sentEventKey, '672000000000000000000012:out_for_delivery');
        assert.ok(sentText.includes('is out for delivery'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should dispatch delivered WhatsApp notification', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';
      let sentEventKey = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000013',
          status: 'delivered',
          customer_info: {
            name: 'Karthik Raja',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        sentEventKey = doc.event_key;
        return { _id: 'doc_deliv_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_deliv_1' }), { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_delivered',
            userId: 'user_10',
            orderId: '672000000000000000000013',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'order_delivered');
        assert.strictEqual(sentEventKey, '672000000000000000000013:order_delivered');
        assert.ok(sentText.includes('has been delivered'));
        assert.ok(sentText.includes('Thank you for choosing RenewX Crew!'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should dispatch cancelled WhatsApp notification with reason', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';
      let sentEventKey = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000014',
          status: 'cancelled',
          customer_info: {
            name: 'Karthik Raja',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        sentEventKey = doc.event_key;
        return { _id: 'doc_canc_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_canc_1' }), { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_cancelled',
            userId: 'user_10',
            orderId: '672000000000000000000014',
            reason: 'Item defective during pre-shipment inspection',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'order_cancelled');
        assert.strictEqual(sentEventKey, '672000000000000000000014:order_cancelled');
        assert.ok(sentText.includes('has been cancelled'));
        assert.ok(sentText.includes('Reason: Item defective during pre-shipment inspection'));
        assert.ok(sentText.includes('Please contact our support team'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should dispatch refund_pending WhatsApp notification when refund is pending', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;
      const originalCreate = WhatsAppMessageModel.create;
      const originalUpdateOne = WhatsAppMessageModel.updateOne;

      let sentAction = '';
      let sentText = '';
      let sentEventKey = '';

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000015',
          payment_status: 'refund_pending',
          customer_info: {
            name: 'Karthik Raja',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      WhatsAppMessageModel.findOne = (async () => null) as any;
      WhatsAppMessageModel.create = (async (doc: any) => {
        sentAction = doc.template_action;
        sentText = doc.message_text;
        sentEventKey = doc.event_key;
        return { _id: 'doc_rfnd_pend_1', ...doc };
      }) as any;
      WhatsAppMessageModel.updateOne = (async () => ({ modifiedCount: 1 })) as any;

      globalThis.fetch = (async () => {
        return new Response(JSON.stringify({ messageId: 'msg_rfnd_pend_1' }), { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'refund_update',
            userId: 'user_10',
            orderId: '672000000000000000000015',
            status: 'pending',
            amount: 8999,
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(sentAction, 'refund_pending');
        assert.strictEqual(sentEventKey, '672000000000000000000015:refund_pending');
        assert.ok(sentText.includes('refund of ₹8,999'));
        assert.ok(sentText.includes('currently pending processing'));
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
        WhatsAppMessageModel.create = originalCreate;
        WhatsAppMessageModel.updateOne = originalUpdateOne;
      }
    });

    it('should safely prevent duplicate WhatsApp messages when status update is retried', async () => {
      const originalFindById = OrderModel.findById;
      const originalFindOne = WhatsAppMessageModel.findOne;

      OrderModel.findById = ((_id: string) => ({
        lean: async () => ({
          id: '672000000000000000000016',
          status: 'delivered',
          customer_info: {
            name: 'Karthik Raja',
            phone: '9342763553',
            whatsapp_consent: true,
          },
        }),
      })) as any;

      // Simulate existing outbox record already marked sent
      WhatsAppMessageModel.findOne = (async () => ({
        _id: 'doc_existing_deliv',
        order_id: '672000000000000000000016',
        event_key: '672000000000000000000016:order_delivered',
        status: 'sent',
        openwa_message_id: 'existing_openwa_msg_deliv_123',
      })) as any;

      let httpCalls = 0;
      globalThis.fetch = (async () => {
        httpCalls++;
        return new Response('{}', { status: 200 });
      }) as any;

      try {
        const res = await handleOrderNotificationEvent(
          {
            action: 'order_delivered',
            userId: 'user_10',
            orderId: '672000000000000000000016',
          },
          { whatsapp_order_updates: true }
        );

        assert.strictEqual(res?.success, true);
        assert.strictEqual(res?.replayed, true);
        assert.strictEqual(res?.messageId, 'existing_openwa_msg_deliv_123');
        assert.strictEqual(httpCalls, 0, 'Must NOT trigger OpenWA HTTP POST on duplicate event');
      } finally {
        OrderModel.findById = originalFindById;
        WhatsAppMessageModel.findOne = originalFindOne;
      }
    });
  });

});
