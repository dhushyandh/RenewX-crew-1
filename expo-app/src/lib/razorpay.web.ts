export async function openRazorpay() {
  throw Object.assign(new Error('Razorpay checkout is available in the mobile app only.'), {
    code: 'PAYMENT_NOT_AVAILABLE_ON_WEB',
  });
}
