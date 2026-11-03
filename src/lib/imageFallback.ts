export function getCategoryFallback(category?: string, name?: string): string {
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  if (text.includes('laptop') || text.includes('mac') || text.includes('computer')) {
    return 'https://pngimg.com/uploads/macbook/small/macbook_PNG101760.png';
  }
  if (text.includes('tab') || text.includes('pad')) {
    return 'https://pngimg.com/uploads/tablet/small/tablet_PNG8601.png';
  }
  if (text.includes('watch') || text.includes('wear')) {
    return 'https://pngimg.com/uploads/apple_watch/small/apple_watch_PNG71.png';
  }
  if (text.includes('ear') || text.includes('head') || text.includes('audio') || text.includes('buds')) {
    return 'https://pngimg.com/uploads/airPods/small/airPods_PNG42.png';
  }
  if (text.includes('camera') || text.includes('lens') || text.includes('dslr')) {
    return 'https://pngimg.com/uploads/photo_camera/small/photo_camera_PNG101644.png';
  }
  if (text.includes('game') || text.includes('gaming') || text.includes('console')) {
    return 'https://pngimg.com/uploads/gamepad/small/gamepad_PNG79.png';
  }
  return 'https://pngimg.com/uploads/iphone_14/small/iphone_14_PNG21.png';
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, category?: string, name?: string) {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = getCategoryFallback(category, name);
}

