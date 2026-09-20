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
