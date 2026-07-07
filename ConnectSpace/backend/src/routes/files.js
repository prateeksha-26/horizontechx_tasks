import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import File from '../models/File.js';
import { encryptBuffer, decryptToBuffer } from '../utils/encryption.js';

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post('/:roomId', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const storedName = `${uuidv4()}${path.extname(req.file.originalname)}`;
    const encrypted = encryptBuffer(req.file.buffer);
    fs.writeFileSync(path.join(uploadDir, storedName), encrypted, 'utf8');

    const fileRecord = await File.create({
      roomId: req.params.roomId,
      uploader: req.user._id,
      originalName: req.file.originalname,
      storedName,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json({ file: fileRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const files = await File.find({ roomId: req.params.roomId })
      .populate('uploader', 'name email')
      .sort({ createdAt: -1 });

    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/download/:fileId', authMiddleware, async (req, res) => {
  try {
    const fileRecord = await File.findById(req.params.fileId);
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(uploadDir, fileRecord.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File data missing' });
    }

    const encrypted = fs.readFileSync(filePath, 'utf8');
    const buffer = decryptToBuffer(encrypted);

    res.setHeader('Content-Type', fileRecord.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
