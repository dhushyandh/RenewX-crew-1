import Razorpay from 'razorpay';
import { env } from '../config/env';

let client: Razorpay | null = null;

function getClient(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error('Razorpay is not configured on the server'), {
      statusCode: 503,
      code: 'PAYMENT_NOT_CONFIGURED',
    });
  }

  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  return client;
}

export function getRazorpayKeyId(): string {
  if (!env.RAZORPAY_KEY_ID) {
    throw Object.assign(new Error('Razorpay is not configured on the server'), {
      statusCode: 503,
      code: 'PAYMENT_NOT_CONFIGURED',
    });
  }
  return env.RAZORPAY_KEY_ID;
}

export async function createRazorpayOrder(input: {
  amount: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<any> {
  const result = await (getClient().orders as any).create({
    amount: input.amount,
    currency: 'INR',
    receipt: input.receipt,
    notes: input.notes,
    payment_capture: true,
  });
  return result;
}

export async function fetchRazorpayPayment(paymentId: string) {
  return getClient().payments.fetch(paymentId);
}

export async function captureRazorpayPayment(paymentId: string, amount: number, currency = 'INR') {
  return (getClient().payments as any).capture(paymentId, amount, currency);
}

export async function refundRazorpayPayment(paymentId: string, amount: number) {
  return getClient().payments.refund(paymentId, { amount });
}
