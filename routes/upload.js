import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { getPool } from '../database.js';
import jwt from 'jsonwebtoken';
import path from 'path';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const name = Date.now() + '-' + file.originalname.replace(/\s+/g,'-');
    cb(null, name);
  }
});

const upload = multer({ storage });

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/upload/image
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const fileUrl = `https://personal-design.eu/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

export default router;