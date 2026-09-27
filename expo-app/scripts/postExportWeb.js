const fs = require('fs');
const path = require('path');

const expoDir = path.resolve(__dirname, '..');
const distDir = path.join(expoDir, 'dist');
const assetsDir = path.join(expoDir, 'assets');

console.log('🚀 Running RenewX post-export Web branding and SEO injector...');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory does not exist! Please export web first.');
  process.exit(1);
}

// 1. Copy Favicon and Touch Icons
const iconSrc = path.join(assetsDir, 'icon.png');
const logoSrc = path.join(assetsDir, 'logo.png');

if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(distDir, 'favicon.png'));
  fs.copyFileSync(iconSrc, path.join(distDir, 'favicon.ico'));
  fs.copyFileSync(iconSrc, path.join(distDir, 'apple-touch-icon.png'));
  fs.copyFileSync(iconSrc, path.join(distDir, 'apple-touch-icon-precomposed.png'));
  console.log('✅ Favicon and Apple Touch icons copied to dist/');
}

if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, path.join(distDir, 'og-image.png'));
  fs.copyFileSync(logoSrc, path.join(distDir, 'logo.png'));
  console.log('✅ Open Graph banner image copied to dist/');
}

// 2. Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*

Sitemap: https://renewx.expo.app/sitemap.xml
`;
fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');
console.log('✅ robots.txt generated');

// 3. Generate sitemap.xml
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://renewx.expo.app/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://renewx.expo.app/shop</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://renewx.expo.app/sell</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://renewx.expo.app/track</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://renewx.expo.app/auth</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
console.log('✅ sitemap.xml generated');

// 4. Inject Favicons, SEO, Open Graph & JSON-LD into index.html
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  // Replace default title
  html = html.replace(/<title>.*?<\/title>/i, '<title>RenewX | Certified Pre-Owned Electronics Marketplace</title>');

  const seoTags = `
    <!-- Favicon & Title Bar Branding -->
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

    <!-- Google Fonts: Outfit -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

    <!-- Primary SEO Meta Tags -->
    <meta name="title" content="RenewX | Certified Pre-Owned Electronics Marketplace" />
    <meta name="description" content="RenewX is premier certified pre-owned electronics marketplace. Buy & sell tested iPhones, smartphones, MacBooks, laptops, smartwatches and audio gear with 6-month warranty, doorstep pickup, and instant payouts." />
    <meta name="keywords" content="RenewX, refurbished phones, buy used phone, sell used phone, certified pre-owned, second hand laptops, refurbished MacBooks, trade-in electronics, tested gadgets warranty" />
    <meta name="author" content="RenewX" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://renewx.expo.app/" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://renewx.expo.app/" />
    <meta property="og:site_name" content="RenewX" />
    <meta property="og:title" content="RenewX | Certified Pre-Owned Electronics Marketplace" />
    <meta property="og:description" content="Buy & sell tested smartphones, laptops, smartwatches and audio gear with 6-month warranty and doorstep delivery." />
    <meta property="og:image" content="https://renewx.expo.app/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="RenewX Marketplace" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://renewx.expo.app/" />
    <meta name="twitter:title" content="RenewX | Certified Pre-Owned Electronics Marketplace" />
    <meta name="twitter:description" content="Buy & sell tested smartphones, laptops, smartwatches and audio gear with 6-month warranty and doorstep delivery." />
    <meta name="twitter:image" content="https://renewx.expo.app/og-image.png" />

    <!-- Mobile & PWA Configuration -->
    <meta name="theme-color" content="#ffc400" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="RenewX" />

    <!-- Schema.org JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://renewx.expo.app/#organization",
          "name": "RenewX",
          "url": "https://renewx.expo.app",
          "logo": "https://renewx.expo.app/favicon.png",
          "description": "Certified pre-owned electronics marketplace with warranty and doorstep inspection."
        },
        {
          "@type": "WebSite",
          "@id": "https://renewx.expo.app/#website",
          "url": "https://renewx.expo.app",
          "name": "RenewX",
          "publisher": { "@id": "https://renewx.expo.app/#organization" },
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://renewx.expo.app/shop?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }
      ]
    }
    </script>
`;

  // Insert right before </head>
  html = html.replace('</head>', `${seoTags}\n  </head>`);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✅ SEO and Title Bar Favicon tags injected into dist/index.html');
}

console.log('🎉 Post-export processing completed successfully!');
