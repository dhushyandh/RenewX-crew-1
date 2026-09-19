import { Platform } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

export type RazorpayCheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function openRazorpay(
  options: Record<string, unknown>,
): Promise<RazorpayCheckoutResult> {
  if (Platform.OS === 'web') {
    const error = new Error('Razorpay checkout is available in the Android and iOS app.');
    (error as Error & { code?: string }).code = 'PAYMENT_NOT_AVAILABLE_ON_WEB';
    throw error;
  }

  return RazorpayCheckout.open(options as Record<string, any>);
}
