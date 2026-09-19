import RazorpayCheckout from 'react-native-razorpay';

export async function openRazorpay(options: Record<string, unknown>) {
  return RazorpayCheckout.open(options);
}
