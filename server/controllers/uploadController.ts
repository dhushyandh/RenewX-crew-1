import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

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

    const result = saveImageBuffer(
      file.buffer,
      file.originalname || 'upload.jpg',
      file.mimetype || 'image/jpeg',
      req
    );

    res.status(201).json({
      success: true,
      data: {
        ...result,
        mimeType: file.mimetype,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Base64 image payload (e.g. from React Native Expo ImagePicker or canvas)
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

    // Strip data:image/...;base64, prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const mime = contentType || 'image/jpeg';
    const name = fileName || 'device-image.jpg';

    const result = saveImageBuffer(buffer, name, mime, req);

    res.status(201).json({
      success: true,
      data: {
        ...result,
        mimeType: mime,
      },
    });
  } catch (err) {
    next(err);
  }
}
