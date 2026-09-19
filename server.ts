import express from 'express';
import app from './server/index.js';

// Keep the Express import in this root entrypoint so Vercel's Node
// framework detection recognizes the application as an Express server.
const vercelApp: express.Application = app;

export default vercelApp;
