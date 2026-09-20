import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadFile, uploadBase64, uploadUrl } from '../controllers/uploadController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Configure multer memory storage with no file type restrictions
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
  fileFilter: (_req, _file, cb) => {
    // No restrictions: accept any image or file type
    cb(null, true);
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
