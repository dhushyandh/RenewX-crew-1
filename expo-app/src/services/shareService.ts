import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Product } from '@/types';

/**
 * Resolves the canonical URL for a product across web and mobile.
 * Uses EXPO_PUBLIC_SHARE_BASE_URL if configured, otherwise defaults to https://renewx.expo.app.
 */
export function getProductShareUrl(productId: string): string {
  const cleanId = String(productId || '').trim();
  const configuredBase =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SHARE_BASE_URL?.trim()) ||
    'https://renewx-crew-server.onrender.com';
  const base = configuredBase.replace(/\/+$/, '');
  return `${base}/product/${cleanId}`;
}

export interface ProductShareContent {
  title: string;
  message: string;
  url: string;
  fullText: string;
}

/**
 * Helper to strip emojis from strings to maintain a clean, professional format.
 */
function stripEmojis(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Builds clean, professional product share content without emojis.
 * Formats the clean URL on its own line so WhatsApp and social scrapers immediately
 * detect and generate the rich link preview card.
 */
export function formatProductShareContent(product: Product): ProductShareContent {
  const url = getProductShareUrl(String(product.id || (product as any)._uuid || ''));
  const price = Number(product.price || 0).toLocaleString('en-IN');
  const originalPrice = product.originalPrice ? Number(product.originalPrice).toLocaleString('en-IN') : null;
  const condition = stripEmojis(product.condition || 'Certified Good');
  const cleanName = stripEmojis(product.name || 'Certified Device');
  const cleanBrand = stripEmojis(product.brand || '');

  // Deduplicate brand name if product.name already starts with brand (e.g. "Apple" + "Apple iPhone 14 Pro")
  const displayName =
    cleanBrand && !cleanName.toLowerCase().startsWith(cleanBrand.toLowerCase())
      ? `${cleanBrand} ${cleanName}`
      : cleanName;

  const savings =
    product.originalPrice && product.originalPrice > (product.price || 0)
      ? Number(product.originalPrice - (product.price || 0)).toLocaleString('en-IN')
      : null;

  const lines = [
    displayName,
    `Condition: ${condition}`,
    `Price: ₹${price}${originalPrice ? ` (MRP: ₹${originalPrice}${savings ? `, Save: ₹${savings}` : ''})` : ''}`,
  ];

  if (Array.isArray(product.specs) && product.specs.length > 0) {
    const topSpecs = product.specs
      .slice(0, 2)
      .map((s) => stripEmojis(String(s)))
      .filter(Boolean)
      .join(' • ');
    if (topSpecs) {
      lines.push(`Specs: ${topSpecs}`);
    }
  }

  lines.push('');
  lines.push(url);

  const fullText = lines.join('\n');

  return {
    title: `${displayName} - ₹${price} | RenewX`,
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
      // NOTE: On Android, if both 'message' and 'url' are passed, React Native appends " " + url,
      // resulting in a duplicate URL at the end of the message. We only pass 'message' on Android
      // so WhatsApp receives exactly one clean URL.
      const sharePayload =
        Platform.OS === 'android'
          ? { title, message: fullText }
          : { title, message: fullText, url };

      const result = await Share.share(sharePayload, {
        dialogTitle: `Share ${product.name}`,
      });

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
