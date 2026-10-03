/**
 * Utilities for cleaning, unwrapping, and sanitizing image URLs copied from web browsers,
 * search engines (Google Images, Bing), HTML tags, markdown, or clipboard.
 */

export function sanitizeImageUrl(input?: string): string {
  if (!input || typeof input !== 'string') return '';
  let url = input.trim();

  // 1. Remove surrounding quotes, backticks, angle brackets or parentheses
  url = url.replace(/^["'`(<]+|["'`>)]+$/g, '').trim();

  // 2. Extract from HTML <img src="...">
  const srcMatch = url.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) {
    url = srcMatch[1].trim();
  }

  // 3. Extract from Markdown ![alt](url)
  const mdMatch = url.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch && mdMatch[1]) {
    url = mdMatch[1].trim();
  }

  // 4. Extract from Google Images search result link:
  // e.g. https://www.google.com/imgres?imgurl=https%3A%2F%2F... or https://images.app.goo.gl/...
  if (url.includes('google.') && (url.includes('imgurl=') || url.includes('url='))) {
    try {
      const parsed = new URL(url);
      const extracted = parsed.searchParams.get('imgurl') || parsed.searchParams.get('url');
      if (extracted && (extracted.startsWith('http') || extracted.startsWith('data:'))) {
        url = decodeURIComponent(extracted);
      }
    } catch {
      // ignore
    }
  }

  // 5. Extract from Bing / other search links
  if (url.includes('bing.') && url.includes('mediaurl=')) {
    try {
      const parsed = new URL(url);
      const extracted = parsed.searchParams.get('mediaurl');
      if (extracted) {
        url = decodeURIComponent(extracted);
      }
    } catch {
      // ignore
    }
  }

  // 6. Clean any remaining surrounding whitespace or quotes
  return url.replace(/^["'`(<]+|["'`>)]+$/g, '').trim();
}

/**
 * Checks if a string is a plausible image URL or data URI
 */
export function isValidImageSource(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return (
    clean.startsWith('data:image/') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('blob:') ||
    clean.startsWith('file://') ||
    clean.startsWith('/')
  );
}

/**
 * Clean device cutouts matching the reference design and categories.
 */
export const CATEGORY_THIRD_PARTY_IMAGES = {
  Smartphones: 'https://pngimg.com/uploads/iphone_14/small/iphone_14_PNG21.png',
  Laptops: 'https://pngimg.com/uploads/macbook/small/macbook_PNG101760.png',
  Tablets: 'https://pngimg.com/uploads/tablet/small/tablet_PNG8601.png',
  Smartwatches: 'https://pngimg.com/uploads/apple_watch/small/apple_watch_PNG71.png',
  Earbuds: 'https://pngimg.com/uploads/airPods/small/airPods_PNG42.png',
  Accessories: 'https://pngimg.com/uploads/usb_cable/small/usb_cable_PNG77.png',
  Gaming: 'https://pngimg.com/uploads/gamepad/small/gamepad_PNG79.png',
  Mac: 'https://pngimg.com/uploads/macbook/small/macbook_PNG101760.png',
};

export const CATEGORY_DEVICE_IMAGES = {
  Smartphones: { uri: CATEGORY_THIRD_PARTY_IMAGES.Smartphones },
  Laptops: { uri: CATEGORY_THIRD_PARTY_IMAGES.Laptops },
  Tablets: { uri: CATEGORY_THIRD_PARTY_IMAGES.Tablets },
  Smartwatches: { uri: CATEGORY_THIRD_PARTY_IMAGES.Smartwatches },
  Earbuds: { uri: CATEGORY_THIRD_PARTY_IMAGES.Earbuds },
  Accessories: { uri: CATEGORY_THIRD_PARTY_IMAGES.Accessories },
  Gaming: { uri: CATEGORY_THIRD_PARTY_IMAGES.Gaming },
  Mac: { uri: CATEGORY_THIRD_PARTY_IMAGES.Mac },
};

/**
 * Returns a clean transparent PNG asset based on category name or product keywords.
 */
export function getCategoryDeviceImage(category?: string, name?: string): any {
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  if (
    text.includes('phone') ||
    text.includes('iphone') ||
    text.includes('pixel') ||
    text.includes('galaxy') ||
    text.includes('smartphone') ||
    text.includes('mobile')
  ) {
    return { uri: CATEGORY_THIRD_PARTY_IMAGES.Smartphones };
  }
  if (text.includes('macbook') || text.includes('mac') || text.includes('apple silicon')) {
    return { uri: CATEGORY_THIRD_PARTY_IMAGES.Mac };
  }
  if (
    text.includes('laptop') ||
    text.includes('thinkpad') ||
    text.includes('zenbook') ||
    text.includes('dell') ||
    text.includes('hp') ||
    text.includes('asus') ||
    text.includes('notebook')
  ) {
    return { uri: CATEGORY_THIRD_PARTY_IMAGES.Laptops };
  }
  if (
    text.includes('tab') ||
    text.includes('pad') ||
    text.includes('ipad') ||
    text.includes('surface')
  ) {
    return { uri: CATEGORY_THIRD_PARTY_IMAGES.Tablets };
  }
  if (
    text.includes('watch') ||
    text.includes('garmin') ||
    text.includes('fitbit') ||
    text.includes('wearable')
  ) {
    return { uri: CATEGORY_THIRD_PARTY_IMAGES.Smartwatches };
  }
  if (
    text.includes('ear') ||
    text.includes('headphone') ||
    text.includes('audio') ||
    text.includes('airpod') ||
    text.includes('bose') ||
    text.includes('buds') ||
    text.includes('tws')
  ) {
    return { uri: CATEGORY_THIRD_PARTY_IMAGES.Earbuds };
  }
  if (
    text.includes('game') ||
    text.includes('gaming') ||
    text.includes('xbox') ||
    text.includes('playstation') ||
    text.includes('console')
  ) {
    return { uri: CATEGORY_THIRD_PARTY_IMAGES.Gaming };
  }
  return { uri: CATEGORY_THIRD_PARTY_IMAGES.Accessories };
}

/**
 * Safely resolves an image prop into an ImageSourcePropType,
 * automatically handling require assets, remote URLs, and category fallback.
 */
export function resolveImageSource(image: any, fallbackCategory?: string, fallbackName?: string): any {
  if (image && typeof image === 'object' && 'uri' in image && image.uri) {
    return image;
  }
  if (typeof image === 'number') {
    return image;
  }
  if (typeof image === 'string' && image.trim().length > 0 && !image.includes('unsplash.com')) {
    return { uri: image.trim() };
  }
  return getCategoryDeviceImage(fallbackCategory, fallbackName);
}

