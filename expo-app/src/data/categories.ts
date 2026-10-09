export const categories: { name: string; icon: string }[] = [
  { name: 'All', icon: 'grid' },
  { name: 'Smartphones', icon: 'phone' },
  { name: 'Laptops', icon: 'laptop' },
  { name: 'Audio', icon: 'headphones' },
  { name: 'Wearables', icon: 'watch' },
  { name: 'Cameras', icon: 'camera' },
  { name: 'Tablets', icon: 'tablet' },
  { name: 'Vehicles', icon: 'car' },
];

/**
 * High-definition transparent background (cutout / no background) third-party images
 * for all gadget categories across RenewX
 */
export const CATEGORY_THIRD_PARTY_IMAGES = {
  Smartphones: 'https://pngimg.com/uploads/iphone_14/iphone_14_PNG21.png',
  Laptops: 'https://pngimg.com/uploads/macbook/macbook_PNG65.png',
  Tablets: 'https://pngimg.com/uploads/tablet/tablet_PNG8578.png',
  Smartwatches: 'https://pngimg.com/uploads/apple_watch/apple_watch_PNG18.png',
  Earbuds: 'https://pngimg.com/uploads/airPods/airPods_PNG11.png',
  Cameras: 'https://pngimg.com/uploads/photo_camera/photo_camera_PNG101644.png',
  Vehicles: 'https://pngimg.com/uploads/tesla_car/tesla_car_PNG46.png',
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
  if (norm.includes('camera') || norm.includes('dslr') || norm.includes('lens')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Cameras;
  }
  if (norm.includes('vehic') || norm.includes('car') || norm.includes('bike') || norm.includes('scooter') || norm.includes('ev')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Vehicles;
  }
  if (norm.includes('game') || norm.includes('gaming') || norm.includes('console')) {
    return CATEGORY_THIRD_PARTY_IMAGES.Gaming;
  }
  return CATEGORY_THIRD_PARTY_IMAGES.Accessories;
}
