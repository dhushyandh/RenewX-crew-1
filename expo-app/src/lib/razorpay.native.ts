import RazorpayCheckout from 'react-native-razorpay';

export type RazorpayCheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function openRazorpay(
  options: Record<string, unknown>,
): Promise<RazorpayCheckoutResult> {
  try {
    return await RazorpayCheckout.open(options as Record<string, any>);
  } catch (error: any) {
    const normalized = new Error(
      error?.description || error?.message || 'Razorpay checkout could not be opened.',
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
