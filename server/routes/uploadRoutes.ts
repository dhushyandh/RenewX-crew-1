import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadFile, uploadBase64 } from '../controllers/uploadController';

const router = Router();

// Configure multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, etc.) are allowed.'));
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
router.post('/', handleSingleUpload, uploadFile);

// 2. Base64 JSON Payload Upload Endpoint (for Expo/mobile)
router.post('/base64', uploadBase64);

export default router;
