declare module 'react-native-razorpay' {
  const RazorpayCheckout: {
    open(options: Record<string, any>): Promise<{
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }>;
  };

  export default RazorpayCheckout;
}

declare module '@/lib/razorpay' {
  export function openRazorpay(options: Record<string, unknown>): Promise<{
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }>;
}
