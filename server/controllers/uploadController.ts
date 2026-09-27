import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { env } from '../config/env';
import {
  uploadImageToStorage,
  uploadImageToGridFS,
  isSupabaseConfigured,
} from '../services/storage';

// Ensure public/uploads directory exists on disk for local dev
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Save image buffer to local disk and return reachable URL
function saveImageBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  req: Request
): { url: string; fileName: string; size: number } {
  const ext = path.extname(originalName) || (mimeType.includes('png') ? '.png' : '.jpg');
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${env.PORT}`;
  const url = `${protocol}://${host}/uploads/${fileName}`;

  return {
    url,
    fileName,
    size: buffer.length,
  };
}

/**
 * Universal persistent image saver:
 * 1. Checks Supabase Storage (if configured)
 * 2. Falls back to MongoDB GridFS (fully persistent across server restarts / Render deploys)
 * 3. Falls back to local disk (development)
 */
async function savePersistentImage(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  req: Request
): Promise<string> {
  // 1. Try Supabase Storage if configured
  if (isSupabaseConfigured()) {
    try {
      return await uploadImageToStorage(buffer, fileName, mimeType);
    } catch (storageErr) {
      console.warn('[Upload] Supabase upload failed, falling back to MongoDB GridFS:', storageErr);
    }
  }

  // 2. Persistent fallback: MongoDB GridFS (guaranteed persistence across cloud restarts)
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      const gridFsName = await uploadImageToGridFS(buffer, fileName, mimeType);
      const protocol = req.protocol || 'http';
      const host = req.get('host') || `localhost:${env.PORT}`;
      return `${protocol}://${host}/api/upload/file/${gridFsName}`;
    } catch (gridFsErr) {
      console.warn('[Upload] GridFS upload failed, falling back to local disk:', gridFsErr);
    }
  }

  // 3. Fallback to local disk (development)
  const localResult = saveImageBuffer(buffer, fileName, mimeType, req);
  return localResult.url;
}

/**
 * Stream an uploaded image from MongoDB GridFS or local disk.
 * Allows permanent image retrieval with immutable caching headers.
 */
export async function getUploadedFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filename } = req.params;
    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Filename is required' } });
      return;
    }

    const safeFilename = path.basename(filename);

    // 1. Check local disk first
    const localPath = path.join(UPLOAD_DIR, safeFilename);
    if (fs.existsSync(localPath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(localPath);
      return;
    }

    // 2. Check MongoDB GridFS
    const db = mongoose.connection.db;
    if (!db) {
      res.status(404).json({ success: false, error: { message: 'File not found' } });
      return;
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    const files = await bucket.find({ filename: safeFilename }).toArray();

    if (!files.length) {
      res.status(404).json({ success: false, error: { message: 'File not found' } });
      return;
    }

    const file = files[0];
    res.setHeader('Content-Type', file.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const downloadStream = bucket.openDownloadStreamByName(safeFilename);
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(404).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle multipart form file upload (e.g. from FormData)
 */
export async function uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        error: { message: 'No file provided in request. Field name must be "file" or "image".' },
      });
      return;
    }

    const originalName = file.originalname || 'upload.jpg';
    const mimeType = file.mimetype || 'image/jpeg';

    const url = await savePersistentImage(file.buffer, originalName, mimeType, req);

    res.status(201).json({
      success: true,
      data: { url, fileName: originalName, size: file.size, mimeType },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Base64 image payload (e.g. from React Native Expo ImagePicker, canvas, data URLs)
 */
export async function uploadBase64(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { base64, fileName, contentType } = req.body;

    if (!base64 || typeof base64 !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'base64 string is required in JSON payload' },
      });
      return;
    }

    // Strip any data URI prefix if present (e.g. data:image/png;base64, or data:*;base64,)
    const base64Data = base64.replace(/^data:[^;]+;base64,/, '').replace(/^data:[^,]+,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const mime = contentType || 'image/jpeg';
    const name = fileName || 'device-image.jpg';

    const url = await savePersistentImage(buffer, name, mime, req);

    res.status(201).json({
      success: true,
      data: { url, fileName: name, size: buffer.length, mimeType: mime },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle remote image URL download (e.g. copied from web browser or external CDN)
 * Downloads image server-side (bypassing browser CORS and referrer restrictions)
 */
export async function uploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: { message: 'Valid image URL is required' },
      });
      return;
    }

    const cleanUrl = url.trim();

    // If it's a data URL, delegate directly to uploadBase64
    if (cleanUrl.startsWith('data:')) {
      req.body.base64 = cleanUrl;
      return uploadBase64(req, res, next);
    }

    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        res.status(200).json({
          success: true,
          data: { url: cleanUrl },
        });
        return;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let ext = '.jpg';
      if (contentType.includes('png')) ext = '.png';
      else if (contentType.includes('webp')) ext = '.webp';
      else if (contentType.includes('svg')) ext = '.svg';
      else if (contentType.includes('gif')) ext = '.gif';

      const originalName = `remote-${Date.now()}${ext}`;

      const storedUrl = await savePersistentImage(buffer, originalName, contentType, req);

      res.status(201).json({
        success: true,
        data: { url: storedUrl, fileName: originalName, size: buffer.length, mimeType: contentType },
      });
    } catch (fetchErr) {
      console.warn('[Upload] Fetch remote URL failed, keeping original:', fetchErr);
      res.status(200).json({
        success: true,
        data: { url: cleanUrl },
      });
    }
  } catch (err) {
    next(err);
  }
}
