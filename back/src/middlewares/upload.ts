import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = path.resolve('uploads/diagrams');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase(); // .jpg/.png
    cb(null, `${uuid()}${ext}`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
  if (!ok) return cb(new Error('Formato no permitido (solo JPG o PNG)'));
  cb(null, true);
}

export const uploadDiagramImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');
