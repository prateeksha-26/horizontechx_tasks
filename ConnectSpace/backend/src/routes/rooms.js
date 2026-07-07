import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import Room from '../models/Room.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = await Room.create({
      roomId: uuidv4().slice(0, 8),
      name: name.trim(),
      host: req.user._id,
      participants: [req.user._id],
      sessionStartedAt: new Date(),
    });

    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('host', 'name email avatar')
      .populate('participants', 'name email avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:roomId/join', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.participants.some((p) => p.toString() === req.user._id.toString())) {
      room.participants.push(req.user._id);
      await room.save();
    }

    if (!room.sessionStartedAt) {
      room.sessionStartedAt = new Date();
      await room.save();
    }

    const populated = await Room.findById(room._id)
      .populate('host', 'name email avatar')
      .populate('participants', 'name email avatar');

    res.json({ room: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
