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
  return false;
}

function loadRazorpayWebScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }

    if ((window as any).Razorpay) {
      return resolve(true);
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpay(
  options: Record<string, unknown>,
): Promise<RazorpayCheckoutResult> {
  const loaded = await loadRazorpayWebScript();

  if (!loaded || typeof (window as any).Razorpay === 'undefined') {
    const error = new Error('Could not load Razorpay payment gateway. Please check your internet connection.') as Error & { code: string };
    error.code = 'GATEWAY_SCRIPT_FAILED';
    throw error;
  }

  return new Promise<RazorpayCheckoutResult>((resolve, reject) => {
    const rzpOptions = {
      ...options,
      handler: (response: any) => {
        resolve({
          razorpay_order_id: response.razorpay_order_id || String(options.order_id || ''),
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          const err = new Error('Payment was cancelled by user.') as Error & {
            code?: number;
            description?: string;
          };
          err.code = 2;
          err.description = 'Payment cancelled';
          reject(err);
        },
      },
    };

    try {
      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.on('payment.failed', (response: any) => {
        const err = new Error(
          response?.error?.description || response?.error?.message || 'Payment failed.',
        ) as Error & { code?: string | number; description?: string };
        err.code = response?.error?.code;
        err.description = response?.error?.description;
        reject(err);
      });
      rzp.open();
    } catch (err) {
      reject(err);
    }
  });
}
