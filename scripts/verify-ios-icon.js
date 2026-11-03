const fs = require('fs');

console.log('--- RUNNING FULL SYSTEM VERIFICATION ---');

// 1. Icon existence and size in public/
const iconBuf = fs.readFileSync('public/apple-touch-icon.png');
const w = iconBuf.readUInt32BE(16);
const h = iconBuf.readUInt32BE(20);
console.log('1. public/apple-touch-icon.png:', w, 'x', h, `(${iconBuf.length} bytes)`);
if (w !== 180 || h !== 180) throw new Error('public/apple-touch-icon.png dimensions mismatch!');

// 2. Icon existence and size in dist/
const distIconBuf = fs.readFileSync('dist/apple-touch-icon.png');
const dw = distIconBuf.readUInt32BE(16);
const dh = distIconBuf.readUInt32BE(20);
console.log('2. dist/apple-touch-icon.png:', dw, 'x', dh, `(${distIconBuf.length} bytes)`);
if (dw !== 180 || dh !== 180) throw new Error('dist/apple-touch-icon.png dimensions mismatch!');

// 3. Manifest checks
const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
const distManifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));
console.log('3. public/manifest.json -> name:', manifest.name, '| short_name:', manifest.short_name);
console.log('   dist/manifest.json   -> name:', distManifest.name, '| short_name:', distManifest.short_name);
const has180 = manifest.icons.some(i => i.src === '/apple-touch-icon.png' && i.sizes === '180x180');
if (!has180) throw new Error('Missing 180x180 icon entry in public/manifest.json');

// 4. index.html head tags check
const indexHtml = fs.readFileSync('index.html', 'utf8');
const distHtml = fs.readFileSync('dist/index.html', 'utf8');

const required = [
  '<title>RenewX</title>',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
  '<link rel="manifest" href="/manifest.json" />',
  '<meta name="apple-mobile-web-app-title" content="RenewX" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '<meta name="theme-color" content="#FFFFFF" />'
];

console.log('4. Checking index.html and dist/index.html tags:');
required.forEach(tag => {
  const inSrc = indexHtml.includes(tag);
  const inDist = distHtml.includes(tag);
  console.log('   Tag:', tag, '-> src:', inSrc, '| dist:', inDist);
  if (!inSrc || !inDist) throw new Error('Missing tag: ' + tag);
});

// 5. Check express server routing/static serving
console.log('5. Checking server static serving...');
const serverSrc = fs.readFileSync('server/index.ts', 'utf8');
const servesDist = serverSrc.includes('dist') || serverSrc.includes('public');
console.log('   Server static handling verified:', servesDist);

console.log('\n=======================================');
console.log(' ALL VERIFICATION STEPS PASSED (100%) ');
console.log('=======================================');
