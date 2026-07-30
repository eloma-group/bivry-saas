import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

/**
 * Files are buffered in memory and then handed to `services/storage.service`,
 * which writes them to Azure Blob Storage in production and to
 * `backend/uploads` in development.
 *
 * Nothing is written to the App Service disk any more: that disk is wiped on
 * every restart, deployment and scale event, so disk uploads were silently
 * disappearing in the cloud.
 *
 * Memory buffering is safe here - MAX_UPLOAD_SIZE_MB caps a single file at
 * 15 MB by default and each request carries exactly one document.
 */

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.upload.maxSizeMb * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(ApiError.badRequest('Only JPG, PNG, WEBP, HEIC and PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});
