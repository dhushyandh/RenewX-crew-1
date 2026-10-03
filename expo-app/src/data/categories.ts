export const categories: { name: string; icon: string }[] = [
  { name: 'All', icon: 'grid' },
  { name: 'Laptops', icon: 'laptop' },
  { name: 'Phones', icon: 'phone' },
  { name: 'Audio', icon: 'headphones' },
  { name: 'Wearables', icon: 'watch' },
  { name: 'Cameras', icon: 'camera' },
  { name: 'Tablets', icon: 'tablet' },
];

/**
 * High-definition transparent background (cutout / no background) third-party images
 * for all gadget categories across RenewX
 */
export const CATEGORY_THIRD_PARTY_IMAGES = {
  Smartphones: 'https://pngimg.com/uploads/iphone_12/iphone_12_PNG36.png',
  Laptops: 'https://pngimg.com/uploads/laptop/laptop_PNG5900.png',
  Tablets: 'https://pngimg.com/uploads/tablet/tablet_PNG8567.png',
  Smartwatches: 'https://pngimg.com/uploads/apple_watch/apple_watch_PNG52.png',
  Earbuds: 'https://pngimg.com/uploads/airPods/airPods_PNG11.png',
  Accessories: 'https://pngimg.com/uploads/usb_cable/usb_cable_PNG64.png',
  Gaming: 'https://pngimg.com/uploads/gamepad/small/gamepad_PNG79.png',
} as const;

export function getCategoryThirdPartyImage(category: string): string {
  const norm = (category || '').toLowerCase();
  if (norm.includes('phone') || norm.includes('smart') || norm.includes('mobile')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Smartphones;
  }
  if (norm.includes('laptop') || norm.includes('mac') || norm.includes('computer')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Laptops;
  }
  if (norm.includes('tab') || norm.includes('pad')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Tablets;
  }
  if (norm.includes('watch') || norm.includes('wear')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Smartwatches;
  }
  if (norm.includes('ear') || norm.includes('audio') || norm.includes('head') || norm.includes('airpod')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Earbuds;
  }
  if (norm.includes('game') || norm.includes('gaming') || norm.includes('console')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Gaming;
  }
  return CATEGORY_THIRD_PARTY_IMAGES.Accessories;
}
