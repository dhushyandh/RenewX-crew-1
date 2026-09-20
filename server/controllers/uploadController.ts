import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { uploadImageToStorage, shouldUsePersistentStorage } from '../services/storage';

// Ensure public/uploads directory exists on disk
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

    if (shouldUsePersistentStorage()) {
      try {
        const url = await uploadImageToStorage(file.buffer, originalName, mimeType);
        res.status(201).json({
          success: true,
          data: { url, fileName: originalName, size: file.size, mimeType },
        });
        return;
      } catch (storageErr) {
        console.warn('[Upload] Persistent storage failed, falling back to local disk:', storageErr);
      }
    }

    const result = saveImageBuffer(file.buffer, originalName, mimeType, req);
    res.status(201).json({
      success: true,
      data: { ...result, mimeType },
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

    if (shouldUsePersistentStorage()) {
      try {
        const url = await uploadImageToStorage(buffer, name, mime);
        res.status(201).json({
          success: true,
          data: { url, fileName: name, size: buffer.length, mimeType: mime },
        });
        return;
      } catch (storageErr) {
        console.warn('[Upload] Persistent storage failed, falling back to local disk:', storageErr);
      }
    }

    const result = saveImageBuffer(buffer, name, mime, req);
    res.status(201).json({
      success: true,
      data: { ...result, mimeType: mime },
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
        error: { message: 'url string is required in request body' },
      });
      return;
    }

    const cleanUrl = url.trim().replace(/^["'`(<]+|["'`>)]+$/g, '');

    // If it's already a data URI, delegate to base64
    if (cleanUrl.startsWith('data:')) {
      req.body.base64 = cleanUrl;
      return uploadBase64(req, res, next);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(cleanUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Fallback: return original clean URL
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

      if (shouldUsePersistentStorage()) {
        try {
          const storedUrl = await uploadImageToStorage(buffer, originalName, contentType);
          res.status(201).json({
            success: true,
            data: { url: storedUrl, fileName: originalName, size: buffer.length, mimeType: contentType },
          });
          return;
        } catch (storageErr) {
          console.warn('[Upload] Persistent storage failed, falling back to local disk:', storageErr);
        }
      }

      const result = saveImageBuffer(buffer, originalName, contentType, req);
      res.status(201).json({
        success: true,
        data: { ...result, mimeType: contentType },
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

