const fs = require('fs');

let content = fs.readFileSync('server/index.ts', 'utf8');

const targetLF = "app.get('/', (_req, res) => {\n  res.json({\n    success: true,\n    message: 'server is live',\n    health: '/api/health',\n  });\n});";
const targetCRLF = "app.get('/', (_req, res) => {\r\n  res.json({\r\n    success: true,\r\n    message: 'server is live',\r\n    health: '/api/health',\r\n  });\r\n});";

const replacement = `app.get('/', (req: Request, res: Response) => {
  const acceptsHtml = req.accepts('html');
  const clientIndex = path.resolve(process.cwd(), 'dist', 'index.html');
  const expoIndex = path.resolve(process.cwd(), 'expo-app', 'dist', 'index.html');
  const targetHtml = [clientIndex, expoIndex].find((p) => fs.existsSync(p));

  if (acceptsHtml && targetHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(targetHtml);
  }

  res.json({
    success: true,
    message: 'server is live',
    health: '/api/health',
  });
});

// PWA Manifest and Root Asset Delivery
app.get('/manifest.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const manifestExpo = path.resolve(process.cwd(), 'expo-app', 'public', 'manifest.json');
  const manifestPublic = path.resolve(process.cwd(), 'public', 'manifest.json');
  const manifestDist = path.resolve(process.cwd(), 'dist', 'manifest.json');

  const target = [manifestExpo, manifestPublic, manifestDist].find((p) => fs.existsSync(p));
  if (target) {
    res.sendFile(target);
  } else {
    res.status(404).json({ error: 'manifest.json not found' });
  }
});

app.get('/apple-touch-icon.png', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const iconExpo = path.resolve(process.cwd(), 'expo-app', 'public', 'apple-touch-icon.png');
  const iconPublic = path.resolve(process.cwd(), 'public', 'apple-touch-icon.png');
  const iconDist = path.resolve(process.cwd(), 'dist', 'apple-touch-icon.png');

  const target = [iconExpo, iconPublic, iconDist].find((p) => fs.existsSync(p));
  if (target) {
    res.sendFile(target);
  } else {
    res.status(404).send('Icon not found');
  }
});

app.use('/icons', express.static(path.resolve(process.cwd(), 'public', 'icons')));
app.use('/icons', express.static(path.resolve(process.cwd(), 'expo-app', 'public', 'icons')));
app.use(express.static(path.resolve(process.cwd(), 'dist')));`;

if (content.includes(targetCRLF)) {
  content = content.replace(targetCRLF, replacement);
} else if (content.includes(targetLF)) {
  content = content.replace(targetLF, replacement);
} else {
  console.error('Target not found!');
  process.exit(1);
}

fs.writeFileSync('server/index.ts', content, 'utf8');
console.log('Successfully updated server/index.ts');
