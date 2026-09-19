import { NativeModules } from 'react-native';

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

function getNativeRazorpayModule() {
  try {
    // Primary: direct native module lookup from NativeModules
    if (NativeModules && NativeModules.RNRazorpayCheckout && typeof NativeModules.RNRazorpayCheckout.open === 'function') {
      return NativeModules.RNRazorpayCheckout;
    }
    // Fallback: require the package if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rzp = require('react-native-razorpay');
    const checkout = rzp?.default || rzp;
    if (checkout && typeof checkout.open === 'function') {
      return checkout;
    }
  } catch {
    // Not linked or running in Expo Go
  }
  return null;
}

export function isNativeRazorpayAvailable(): boolean {
  return Boolean(getNativeRazorpayModule());
}

export async function openRazorpay(
  options: Record<string, unknown>,
): Promise<RazorpayCheckoutResult> {
  const RazorpayCheckout = getNativeRazorpayModule();

  if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
    const error = new Error(
      'Native Razorpay checkout module is not available in this environment (e.g. Expo Go). Use the in-app checkout modal instead.',
    ) as Error & { code: string };
    error.code = 'NATIVE_MODULE_UNAVAILABLE';
    throw error;
  }

  try {
    return await RazorpayCheckout.open(options as Record<string, any>);
  } catch (error: any) {
    const normalized = new Error(
      error?.description || error?.message || 'Razorpay checkout could not be completed.',
    ) as Error & {
      code?: string | number;
      description?: string;
      raw?: unknown;
    };

    normalized.code = error?.code;
    normalized.description = error?.description;
    normalized.raw = error;
    throw normalized;
  }
}
