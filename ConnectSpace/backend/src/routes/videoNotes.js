import express from 'express';
import authMiddleware from '../middleware/auth.js';
import Room from '../models/Room.js';
import VideoNote from '../models/VideoNote.js';
import User from '../models/User.js';
import multer from 'multer';

const router = express.Router({ mergeParams: true });
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/rooms/:roomId/notes - Upload a new video note
router.post('/', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { durationSeconds, attachedTo = 'room' } = req.body;
    const userId = req.user.id;

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify user is participant or host
    const isParticipant =
      room.participants.includes(userId) || room.host.equals(userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a room participant' });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert video file to base64
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const videoData = req.file.buffer.toString('base64');

    // Create video note
    const videoNote = new VideoNote({
      roomId,
      authorId: userId,
      authorName: user.name,
      videoData,
      durationSeconds: parseInt(durationSeconds),
      attachedTo,
      isUnread: true,
    });

    await videoNote.save();

    // Emit socket event for real-time update
    if (global.io && global.roomUsers && global.roomUsers.has(roomId)) {
      global.io.to(roomId).emit('new-video-note', {
        noteId: videoNote._id,
        authorName: videoNote.authorName,
        durationSeconds: videoNote.durationSeconds,
        attachedTo: videoNote.attachedTo,
        createdAt: videoNote.createdAt,
      });
    }

    res.json({
      noteId: videoNote._id,
      message: 'Video note saved',
    });
  } catch (error) {
    console.error('Error saving video note:', error);
    res.status(500).json({ error: 'Failed to save video note' });
  }
});

// GET /api/rooms/:roomId/notes - Get all notes for a room
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify user is participant or host
    const isParticipant =
      room.participants.includes(userId) || room.host.equals(userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a room participant' });
    }

    // Get all notes, sorted by newest first
    const notes = await VideoNote.find({ roomId })
      .select('-videoData') // Don't send video data in list
      .sort({ createdAt: -1 })
      .lean();

    // Count unread notes
    const unreadCount = await VideoNote.countDocuments({
      roomId,
      isUnread: true,
    });

    res.json({
      notes,
      unreadCount,
      totalCount: notes.length,
    });
  } catch (error) {
    console.error('Error fetching video notes:', error);
    res.status(500).json({ error: 'Failed to fetch video notes' });
  }
});

// POST /api/rooms/:roomId/notes/:noteId/reply - Add a text reply
router.post('/:noteId/reply', authMiddleware, async (req, res) => {
  try {
    const { roomId, noteId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Find video note
    const videoNote = await VideoNote.findById(noteId);
    if (!videoNote) {
      return res.status(404).json({ error: 'Video note not found' });
    }

    if (!videoNote.roomId.equals(roomId)) {
      return res
        .status(400)
        .json({ error: 'Video note does not belong to this room' });
    }

    // Add reply
    videoNote.replies.push({
      authorId: userId,
      authorName: user.name,
      text: text.trim(),
      createdAt: new Date(),
    });

    await videoNote.save();

    // Emit socket event
    if (global.io) {
      global.io.to(roomId).emit('new-video-reply', {
        noteId,
        reply: videoNote.replies[videoNote.replies.length - 1],
      });
    }

    res.json({
      message: 'Reply added',
      reply: videoNote.replies[videoNote.replies.length - 1],
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// GET /api/rooms/:roomId/notes/:noteId/video - Stream the video blob
router.get('/:noteId/video', authMiddleware, async (req, res) => {
  try {
    const { roomId, noteId } = req.params;
    const userId = req.user.id;

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify user is participant or host
    const isParticipant =
      room.participants.includes(userId) || room.host.equals(userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a room participant' });
    }

    // Get video note
    const videoNote = await VideoNote.findById(noteId);
    if (!videoNote) {
      return res.status(404).json({ error: 'Video note not found' });
    }

    if (!videoNote.roomId.equals(roomId)) {
      return res
        .status(400)
        .json({ error: 'Video note does not belong to this room' });
    }

    // Mark as read
    videoNote.isUnread = false;
    await videoNote.save();

    // Convert base64 to buffer and send
    const videoBuffer = Buffer.from(videoNote.videoData, 'base64');
    res.set('Content-Type', 'video/webm');
    res.set('Content-Length', videoBuffer.length);
    res.send(videoBuffer);
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

export default router;
