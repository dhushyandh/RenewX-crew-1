import app from './server/index';

// Vercel detects this root server.ts and uses the exported Express app.
// Local development uses server/local.ts.
export default app;
