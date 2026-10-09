import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadFile, uploadBase64, uploadUrl, getUploadedFile } from '../controllers/uploadController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 0. Public File Streaming Endpoint (from GridFS / local disk)
router.get('/file/:filename', getUploadedFile);

// Allowed image MIME types for product photos, trade-in inspections, and avatars
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

// Configure multer memory storage with strict image validation & memory safety limits
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit per image to prevent memory exhaustion
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, WebP and HEIC image files are allowed.'));
    }
  },
});

// Middleware to accept either "file" or "image" field names
function handleSingleUpload(req: Request, res: Response, next: NextFunction) {
  const uploadSingle = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]);

  uploadSingle(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ success: false, error: { message: err.message || 'File upload error' } });
      return;
    }
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      req.file = files['file']?.[0] || files['image']?.[0];
    }
    next();
  });
}

// 1. Multipart Form File Upload Endpoint
router.post('/', authenticateToken, handleSingleUpload, uploadFile);

// 2. Base64 JSON Payload Upload Endpoint (for Expo/mobile)
router.post('/base64', authenticateToken, uploadBase64);

// 3. Remote URL Download & Cache Endpoint
router.post('/url', authenticateToken, uploadUrl);

export default router;
