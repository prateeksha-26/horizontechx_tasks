import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Room from '../models/Room.js';
import File from '../models/File.js';

const router = express.Router();

// Get user's recent sessions (rooms where user participated)
router.get('/me/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = await Room.find({
      participants: req.user._id,
      endedAt: { $exists: true, $ne: null },
    })
      .sort({ endedAt: -1 })
      .limit(10)
      .populate('host', 'name email')
      .populate('participants', 'name email');

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all rooms user has joined (persistent workspaces)
router.get('/me/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { host: req.user._id },
        { participants: req.user._id },
      ],
    })
      .select('roomId name lastActiveAt whiteboardSnapshot sessions participants')
      .sort({ lastActiveAt: -1 })
      .lean();

    const enrichedRooms = rooms.map((room) => ({
      roomId: room.roomId,
      name: room.name,
      lastActiveAt: room.lastActiveAt,
      sessionCount: room.sessions?.length || 0,
      participantCount: room.participants?.length || 0,
      whiteboardSnapshot: room.whiteboardSnapshot || '',
    }));

    res.json({ rooms: enrichedRooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
