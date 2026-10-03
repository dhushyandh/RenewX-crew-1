import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Product } from '@/types';

/**
 * Resolves the canonical URL for a product across web and mobile.
 */
export function getProductShareUrl(productId: string): string {
  const cleanId = String(productId || '').trim();
  return `https://renewx.expo.app/product/${cleanId}`;
}

export interface ProductShareContent {
  title: string;
  message: string;
  url: string;
  fullText: string;
}

/**
 * Builds rich, enticing product share content with specs, pricing, and warranty.
 */
export function formatProductShareContent(product: Product): ProductShareContent {
  const url = getProductShareUrl(String(product.id));
  const price = Number(product.price || 0).toLocaleString('en-IN');
  const originalPrice = product.originalPrice ? Number(product.originalPrice).toLocaleString('en-IN') : null;
  const condition = product.condition || 'Certified Good';
  const brand = product.brand ? `${product.brand} ` : '';

  const savings =
    product.originalPrice && product.originalPrice > (product.price || 0)
      ? Number(product.originalPrice - (product.price || 0)).toLocaleString('en-IN')
      : null;

  const lines = [
    `Check out this certified pre-owned deal on RenewX:`,
    `📱 ${brand}${product.name}`,
    `✨ Condition: ${condition} • Tested & Verified`,
    `💰 Price: ₹${price}${originalPrice ? ` (MRP ₹${originalPrice}${savings ? `, Save ₹${savings}` : ''})` : ''}`,
  ];

  if (Array.isArray(product.specs) && product.specs.length > 0) {
    const topSpecs = product.specs.slice(0, 2).join(' • ');
    lines.push(`⚙️ ${topSpecs}`);
  }

  lines.push('');
  lines.push(`🛒 View details & order: ${url}`);

  const fullText = lines.join('\n');

  return {
    title: `${product.name} on RenewX`,
    message: fullText,
    url,
    fullText,
  };
}

export interface ShareResult {
  success: boolean;
  action?: 'shared' | 'copied' | 'dismissed';
  error?: string;
}

/**
 * Shares a product with details and URL across native devices and web.
 * On devices where native share is unavailable (e.g. desktop web), copies to clipboard.
 */
export async function shareProduct(
  product: Product,
  options: {
    onSuccessToast?: (msg: string) => void;
  } = {}
): Promise<ShareResult> {
  try {
    const { title, fullText, url } = formatProductShareContent(product);

    // 1. Mobile Native (Android & iOS)
    if (Platform.OS !== 'web') {
      const result = await Share.share(
        {
          title,
          message: fullText,
          url,
        },
        {
          dialogTitle: `Share ${product.name}`,
        }
      );

      if (result.action === Share.sharedAction) {
        return { success: true, action: 'shared' };
      }
      return { success: true, action: 'dismissed' };
    }

    // 2. Web Browser
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: fullText,
          url,
        });
        return { success: true, action: 'shared' };
      } catch (navShareErr: any) {
        // User cancelled or aborted native dialog
        if (navShareErr?.name === 'AbortError') {
          return { success: true, action: 'dismissed' };
        }
        console.warn('[ShareService] navigator.share failed, falling back to clipboard:', navShareErr);
      }
    }

    // 3. Fallback: Copy full details & URL to Clipboard
    await Clipboard.setStringAsync(fullText);
    if (options.onSuccessToast) {
      options.onSuccessToast('Product details and link copied to clipboard!');
    }

    return { success: true, action: 'copied' };
  } catch (err: any) {
    console.error('[ShareService] Share failed:', err);
    return { success: false, error: err?.message || 'Unable to share product' };
  }
}
