import { Platform } from 'react-native';
import * as WebRazorpay from './razorpay.web';
import * as NativeRazorpay from './razorpay.native';

export type RazorpayCheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: string | number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  notes?: Record<string, string>;
  [key: string]: unknown;
};

export function isNativeRazorpayAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  return NativeRazorpay.isNativeRazorpayAvailable();
}

export async function openRazorpay(
  options: Record<string, unknown>,
): Promise<RazorpayCheckoutResult> {
  if (Platform.OS === 'web') {
    return WebRazorpay.openRazorpay(options);
  }

  return NativeRazorpay.openRazorpay(options);
}
