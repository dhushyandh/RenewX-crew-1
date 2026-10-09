import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ProductModel } from '../models/Product';
import { env } from '../config/env';

/**
 * Escapes special HTML characters to prevent XSS and malformed meta tags.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips all Unicode emojis and pictographs to produce a clean, professional string.
 */
function stripEmojis(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3\uD83C-\uDBFF\uDC00-\uDFFF]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Strips newlines, emojis, extra spaces, and markdown artifacts for clean meta descriptions.
 */
function sanitizeMetaText(str: string, maxLength = 260): string {
  if (!str) return '';
  const cleaned = stripEmojis(String(str))
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 1).trim() + '...';
}

/**
 * Returns true if the user agent is a known social media preview crawler / bot.
 */
function isPreviewBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('whatsapp') ||
    ua.includes('facebookexternalhit') ||
    ua.includes('facebot') ||
    ua.includes('twitterbot') ||
    ua.includes('telegrambot') ||
    ua.includes('linkedinbot') ||
    ua.includes('slackbot') ||
    ua.includes('discordbot') ||
    ua.includes('pinterest') ||
    ua.includes('applebot') ||
    ua.includes('skypeuripreview') ||
    ua.includes('vkshare') ||
    ua.includes('googlebot') ||
    ua.includes('bingbot') ||
    ua.includes('yandex')
  );
}

/**
 * Ensures an image URL is a valid, absolute HTTPS URL accessible by external crawlers.
 */
function resolveAbsoluteImageUrl(candidateUrl?: string, fallbackOrigin = 'https://renewx.expo.app'): string {
  if (!candidateUrl || typeof candidateUrl !== 'string') {
    return `${fallbackOrigin}/og-image.png`;
  }

  let clean = candidateUrl.trim();
  if (!clean) {
    return `${fallbackOrigin}/og-image.png`;
  }

  // Handle protocol-relative URLs (//example.com/img.jpg)
  if (clean.startsWith('//')) {
    clean = `https:${clean}`;
  }

  // Handle local server uploads (/uploads/xyz.jpg)
  if (clean.startsWith('/')) {
    clean = `${fallbackOrigin}${clean}`;
  }

  // Force HTTPS if HTTP
  if (clean.startsWith('http://')) {
    clean = clean.replace('http://', 'https://');
  }

  return clean;
}

/**
 * Guesses image MIME type from URL extension.
 */
function getImageMimeType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * Serves dynamic HTML with Open Graph metadata for WhatsApp and social crawlers.
 * For regular human browsers, instantly redirects to the RenewX SPA with deep link support.
 */
export async function renderProductPreview(req: Request, res: Response): Promise<void> {
  const productId = String(req.params.id || '').trim();
  const frontendBase = env.FRONTEND_URL || 'https://renewx.expo.app';
  const canonicalUrl = `${frontendBase}/product/${productId}`;
  const appDeepLink = `renewx://product/${productId}`;
  const isBot = isPreviewBot(req.headers['user-agent']);

  // Handle invalid MongoDB ID gracefully
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    renderFallbackHtml(res, {
      title: 'RenewX | Certified Pre-Owned Electronics Marketplace',
      description: 'Explore certified pre-owned smartphones, laptops, and audio gear with 6-month warranty and doorstep delivery.',
      imageUrl: `${frontendBase}/og-image.png`,
      targetUrl: `${frontendBase}/shop`,
      isBot,
    });
    return;
  }

  try {
    const product = await ProductModel.findById(productId).lean();

    if (!product) {
      renderFallbackHtml(res, {
        title: 'Product Not Found | RenewX Marketplace',
        description: 'This device may have already been sold. Browse other certified pre-owned electronics on RenewX.',
        imageUrl: `${frontendBase}/og-image.png`,
        targetUrl: `${frontendBase}/shop`,
        isBot,
      });
      return;
    }

    // 1. Resolve product title (clean without emojis)
    const name = stripEmojis(String(product.name || 'Certified Device')).trim();
    const brand = stripEmojis(String(product.brand || '')).trim();
    const priceNum = Number(product.price || 0);
    const originalPriceNum = Number(product.original_price || 0);
    const condition = stripEmojis(String(product.condition || 'Tested & Verified')).trim();
    const warrantyMonths = Number(product.warranty_months || 0);

    // Formatted pricing in INR
    const priceFormatted = `₹${priceNum.toLocaleString('en-IN')}`;
    const originalPriceFormatted = originalPriceNum > priceNum ? `₹${originalPriceNum.toLocaleString('en-IN')}` : '';
    const savingsAmount = originalPriceNum > priceNum ? `₹${(originalPriceNum - priceNum).toLocaleString('en-IN')}` : '';

    // OG Title: clean layout "[Product Name] - ₹[Price]"
    const ogTitle = `${name} - ${priceFormatted}`;

    // 2. Resolve product description
    const conditionPrefix = `Refurbished (${condition})`;
    const warrantyText = warrantyMonths > 0 ? `${warrantyMonths}-Month Warranty` : 'RenewX Certified';
    const priceSection = originalPriceFormatted
      ? `Price: ${priceFormatted} (MRP ${originalPriceFormatted}, Save ${savingsAmount})`
      : `Price: ${priceFormatted}`;

    const rawUserDesc = sanitizeMetaText(product.description || '');
    const ogDescription = sanitizeMetaText(
      `${conditionPrefix} | ${priceSection} • ${warrantyText}. ${rawUserDesc} RenewX — Certified Pre-Owned Electronics.`
    );

    // 3. Resolve primary product image
    const rawImage =
      (typeof product.image_url === 'string' && product.image_url.trim())
        ? product.image_url.trim()
        : Array.isArray(product.images) && product.images[0]
        ? String(product.images[0]).trim()
        : '';
    const ogImageUrl = resolveAbsoluteImageUrl(rawImage, frontendBase);
    const imageMime = getImageMimeType(ogImageUrl);

    // Escape all values for HTML injection
    const escTitle = escapeHtml(ogTitle);
    const escName = escapeHtml(name);
    const escDesc = escapeHtml(ogDescription);
    const escImage = escapeHtml(ogImageUrl);
    const escUrl = escapeHtml(canonicalUrl);
    const escBrand = escapeHtml(brand || 'RenewX');
    const escCondition = escapeHtml(condition);

    // JSON-LD structured data for Google / Pinterest / SEO bots
    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: name,
      image: [ogImageUrl],
      description: rawUserDesc || ogDescription,
      brand: {
        '@type': 'Brand',
        name: brand || 'RenewX',
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'INR',
        price: String(priceNum),
        itemCondition: 'https://schema.org/RefurbishedCondition',
        availability: Number(product.stock || 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'RenewX',
          url: frontendBase,
        },
      },
    });

    // Generate response HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  <title>${escTitle} | RenewX</title>

  <!-- Primary SEO Meta Tags -->
  <meta name="title" content="${escTitle} | RenewX" />
  <meta name="description" content="${escDesc}" />
  <link rel="canonical" href="${escUrl}" />

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="RenewX — Certified Pre-Owned Electronics" />
  <meta property="og:url" content="${escUrl}" />
  <meta property="og:title" content="${escTitle}" />
  <meta property="og:description" content="${escDesc}" />
  <meta property="og:image" content="${escImage}" />
  <meta property="og:image:secure_url" content="${escImage}" />
  <meta property="og:image:type" content="${imageMime}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escName}" />

  <!-- Product Specific Open Graph Extensions -->
  <meta property="product:price:amount" content="${priceNum}" />
  <meta property="product:price:currency" content="INR" />
  <meta property="product:condition" content="${escCondition}" />
  <meta property="product:availability" content="in stock" />
  <meta property="product:brand" content="${escBrand}" />
  <meta property="product:retailer_item_id" content="${escapeHtml(productId)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@RenewX" />
  <meta name="twitter:title" content="${escTitle}" />
  <meta name="twitter:description" content="${escDesc}" />
  <meta name="twitter:image" content="${escImage}" />
  <meta name="twitter:image:alt" content="${escName}" />

  <!-- Mobile App Links -->
  <meta property="al:android:url" content="${appDeepLink}" />
  <meta property="al:android:app_name" content="RenewX" />
  <meta property="al:android:package" content="com.renewx.mobile" />
  <meta property="al:web:url" content="${escUrl}" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${jsonLd}
  </script>

  ${
    !isBot
      ? `<!-- Instant Client-Side Redirect to Web App / Deep Link -->
  <meta http-equiv="refresh" content="0; url=${escUrl}" />
  <script>
    (function() {
      // Attempt opening native app deep link on mobile devices
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = "${appDeepLink}";
        setTimeout(function() {
          window.location.replace("${escUrl}");
        }, 1200);
      } else {
        window.location.replace("${escUrl}");
      }
    })();
  </script>`
      : ''
  }

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #F8FAFC;
      color: #0F172A;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 16px;
    }
    .card {
      background: #FFFFFF;
      max-width: 440px;
      width: 100%;
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);
      overflow: hidden;
      border: 1px solid #E2E8F0;
      text-align: center;
    }
    .img-box {
      background: #F1F5F9;
      height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .img-box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .content { padding: 24px; }
    .badge {
      display: inline-block;
      background: #FEF08A;
      color: #713F12;
      font-weight: 700;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    h1 { font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 8px; }
    .price-row { margin: 12px 0; }
    .price { font-size: 24px; font-weight: 800; color: #0F172A; }
    .orig-price { font-size: 15px; color: #94A3B8; text-decoration: line-through; margin-left: 8px; }
    .desc { font-size: 13.5px; color: #64748B; line-height: 1.5; margin-bottom: 20px; }
    .btn-primary {
      display: block;
      background: #FFC400;
      color: #0F172A;
      text-decoration: none;
      font-weight: 700;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 15px;
      transition: background 0.2s;
    }
    .btn-primary:hover { background: #EAB308; }
    .btn-app {
      display: block;
      margin-top: 10px;
      color: #0284C7;
      text-decoration: none;
      font-weight: 600;
      font-size: 13.5px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="img-box">
      <img src="${escImage}" alt="${escName}" />
    </div>
    <div class="content">
      <span class="badge">${escCondition} • ${warrantyText}</span>
      <h1>${escName}</h1>
      <div class="price-row">
        <span class="price">${priceFormatted}</span>
        ${originalPriceFormatted ? `<span class="orig-price">${originalPriceFormatted}</span>` : ''}
      </div>
      <p class="desc">${escDesc}</p>
      <a href="${escUrl}" class="btn-primary">View Product on RenewX</a>
      <a href="${appDeepLink}" class="btn-app">Open in RenewX App</a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (error) {
    console.error('[renderProductPreview] Error generating product preview:', error);
    renderFallbackHtml(res, {
      title: 'RenewX | Certified Pre-Owned Electronics Marketplace',
      description: 'Explore certified pre-owned smartphones, laptops, and audio gear with 6-month warranty and doorstep delivery.',
      imageUrl: `${frontendBase}/og-image.png`,
      targetUrl: `${frontendBase}/shop`,
      isBot,
    });
  }
}

/**
 * Fallback preview when product ID is invalid or missing.
 */
function renderFallbackHtml(
  res: Response,
  options: {
    title: string;
    description: string;
    imageUrl: string;
    targetUrl: string;
    isBot: boolean;
  }
) {
  const escTitle = escapeHtml(options.title);
  const escDesc = escapeHtml(options.description);
  const escImage = escapeHtml(options.imageUrl);
  const escUrl = escapeHtml(options.targetUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escTitle}</title>
  <meta name="description" content="${escDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="RenewX" />
  <meta property="og:title" content="${escTitle}" />
  <meta property="og:description" content="${escDesc}" />
  <meta property="og:image" content="${escImage}" />
  <meta property="og:url" content="${escUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escTitle}" />
  <meta name="twitter:description" content="${escDesc}" />
  <meta name="twitter:image" content="${escImage}" />
  ${!options.isBot ? `<meta http-equiv="refresh" content="0; url=${escUrl}" />` : ''}
</head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fafafa;">
  <h2>RenewX Marketplace</h2>
  <p>${escDesc}</p>
  <p style="margin-top: 20px;"><a href="${escUrl}" style="color: #0284c7; font-weight: 700;">Continue to RenewX Store &rarr;</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
