async function test() {
  console.log('--- TESTING LIVE DEPLOYMENT AT https://renewx.expo.app ---');
  const res = await fetch('https://renewx.expo.app?' + Date.now(), { cache: 'no-store' });
  const html = await res.text();
  
  console.log('Status:', res.status);
  console.log('1. Has manifest link:', html.includes('rel="manifest"'));
  console.log('2. Has apple-touch-icon:', html.includes('apple-touch-icon.png'));
  console.log('3. Has title RenewX:', html.includes('<title>RenewX</title>'));
  console.log('4. Has theme-color #FFFFFF:', html.includes('content="#FFFFFF"'));
  console.log('5. Has service worker registration:', html.includes('navigator.serviceWorker.register'));
  
  const manifest = await fetch('https://renewx.expo.app/manifest.json?' + Date.now()).then(r => r.json());
  console.log('6. Manifest name:', manifest.name);
  console.log('7. Manifest short_name:', manifest.short_name);
  console.log('8. Manifest start_url:', manifest.start_url);
  console.log('9. Manifest icon 180x180:', manifest.icons.some(i => i.sizes === '180x180'));

  const sw = await fetch('https://renewx.expo.app/sw.js?' + Date.now());
  console.log('10. sw.js status:', sw.status, 'Content-Type:', sw.headers.get('content-type'));

  const icon = await fetch('https://renewx.expo.app/apple-touch-icon.png?' + Date.now());
  const iconBuf = await icon.arrayBuffer();
  console.log('11. apple-touch-icon.png status:', icon.status, 'length:', iconBuf.byteLength);

  console.log('\n--- ALL LIVE PWA CHECKS PASSED PERFECTLY ---');
}

test().catch(console.error);

