import Room from '../models/Room.js';
import Recap from '../models/Recap.js';
import File from '../models/File.js';
import User from '../models/User.js';

const roomUsers = new Map();

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`User connected: ${user.name} (${socket.id})`);

    socket.on('join-room', async ({ roomId }) => {
      socket.join(roomId);
      socket.roomId = roomId;

      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Map());
      }
      roomUsers.get(roomId).set(socket.id, {
        socketId: socket.id,
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
      });

      const room = await Room.findOne({ roomId });
      
      // Update lastActiveAt
      if (room) {
        await Room.findOneAndUpdate({ roomId }, { lastActiveAt: new Date() });
      }

      if (room?.whiteboardData) {
        socket.emit('whiteboard-state', { data: room.whiteboardData });
      }
      
      // Emit whiteboard snapshot if this is a returning room
      if (room?.whiteboardSnapshot && room.sessions?.length > 0) {
        socket.emit('whiteboard-snapshot', { snapshot: room.whiteboardSnapshot });
      }
      
      if (room) {
        socket.emit('forge-state', {
          code: room.forgeCode,
          language: room.forgeLanguage || 'javascript',
          files: room.forgeFiles || [],
        });

        socket.emit('focus-hub-state', {
          agendaItems: room.agendaItems || [],
          timer: room.timer || { seconds: 0, running: false, startedAt: null },
        });
      }

      // Emit session count if returning to existing room
      if (room?.sessions?.length > 0) {
        socket.emit('returning-room', { sessionCount: room.sessions.length });
      }

      const participants = Array.from(roomUsers.get(roomId).values());
      io.to(roomId).emit('room-users', { participants });

      const others = participants.filter((p) => p.socketId !== socket.id);
      socket.emit('existing-users', { users: others });

      socket.to(roomId).emit('user-joined', {
        socketId: socket.id,
        userId: user._id.toString(),
        name: user.name,
      });
    });

    socket.on('offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('offer', {
        offer,
        senderSocketId: socket.id,
        senderName: user.name,
      });
    });

    socket.on('answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('answer', {
        answer,
        senderSocketId: socket.id,
      });
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        senderSocketId: socket.id,
      });
    });

    socket.on('toggle-media', ({ audio, video }) => {
      socket.to(socket.roomId).emit('user-media-changed', {
        socketId: socket.id,
        audio,
        video,
      });
    });

    socket.on('screen-share-started', () => {
      socket.to(socket.roomId).emit('screen-share-started', {
        socketId: socket.id,
        name: user.name,
      });
    });

    socket.on('screen-share-stopped', () => {
      socket.to(socket.roomId).emit('screen-share-stopped', {
        socketId: socket.id,
      });
    });

    socket.on('whiteboard-draw', async ({ data }) => {
      socket.to(socket.roomId).emit('whiteboard-draw', { data, senderSocketId: socket.id });

      if (socket.roomId) {
        await Room.findOneAndUpdate(
          { roomId: socket.roomId },
          { $set: { whiteboardData: data }, $inc: { whiteboardStrokeCount: 1 } }
        );
      }
    });

    socket.on('whiteboard-clear', async () => {
      socket.to(socket.roomId).emit('whiteboard-clear', { senderSocketId: socket.id });

      if (socket.roomId) {
        await Room.findOneAndUpdate({ roomId: socket.roomId }, { whiteboardData: '' });
      }
    });

    socket.on('forge-code-change', async ({ code }) => {
      socket.to(socket.roomId).emit('forge-code-change', { code, senderSocketId: socket.id });
      if (socket.roomId) {
        await Room.findOneAndUpdate(
          { roomId: socket.roomId },
          { $set: { forgeCode: code }, $inc: { forgeEditCount: 1 } }
        );
      }
    });

    socket.on('forge-language-change', async ({ language }) => {
      socket.to(socket.roomId).emit('forge-language-change', {
        language,
        senderSocketId: socket.id,
      });
      if (socket.roomId) {
        await Room.findOneAndUpdate({ roomId: socket.roomId }, { forgeLanguage: language });
      }
    });

    socket.on('forge-cursor-move', ({ cursor }) => {
      socket.to(socket.roomId).emit('forge-cursor-move', {
        cursor,
        senderSocketId: socket.id,
        name: user.name,
      });
    });

    socket.on('chat-message', ({ message }) => {
      io.to(socket.roomId).emit('chat-message', {
        message,
        sender: user.name,
        senderId: user._id.toString(),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('file-shared', ({ file }) => {
      socket.to(socket.roomId).emit('file-shared', {
        file,
        sharedBy: user.name,
      });
    });

    socket.on('focushub-change', async ({ changes }) => {
      if (!socket.roomId || !changes) return;
      const allowedFields = ['agendaItems', 'timer'];
      const update = {};

      allowedFields.forEach((field) => {
        if (changes[field] !== undefined) {
          update[field] = changes[field];
        }
      });

      if (Object.keys(update).length === 0) return;

      await Room.findOneAndUpdate({ roomId: socket.roomId }, update);
      io.to(socket.roomId).emit('focus-hub-state', update);
    });

    socket.on('leave-room', () => {
      handleLeave(socket, io, true);
    });

    socket.on('disconnect', () => {
      handleLeave(socket, io, false);
      console.log(`User disconnected: ${user.name}`);
    });
  });
}

async function handleLeave(socket, io, explicitLeave) {
  const roomId = socket.roomId;
  if (!roomId) return;

  socket.to(roomId).emit('user-left', { socketId: socket.id, name: socket.user.name });

  if (roomUsers.has(roomId)) {
    roomUsers.get(roomId).delete(socket.id);
    if (roomUsers.get(roomId).size === 0) {
      const room = await Room.findOne({ roomId }).lean();
      const fileCount = await File.countDocuments({ roomId });
      const participantIds = room?.participants || [];
      const participants = await User.find({ _id: { $in: participantIds } }).select('name').lean();
      const endedAt = new Date();
      const durationSeconds = room?.sessionStartedAt 
        ? Math.max(0, Math.round((endedAt - new Date(room.sessionStartedAt)) / 1000))
        : 0;

      // Create session object to persist
      const sessionObj = {
        startedAt: room?.sessionStartedAt || new Date(),
        endedAt,
        participantNames: participants.map((p) => p.name),
        durationSeconds,
      };

      // Create recap for backward compatibility
      const recap = await Recap.create({
        roomId,
        roomName: room?.name || 'Session',
        owner: room?.host || socket.user._id,
        participantIds,
        participantNames: participants.map((p) => p.name),
        fileCount,
        forgeEditCount: room?.forgeEditCount || 0,
        whiteboardStrokeCount: room?.whiteboardStrokeCount || 0,
        sessionStartedAt: room?.sessionStartedAt || new Date(),
        endedAt,
      });

      // Update room: add session to sessions array, save snapshot, update lastActiveAt
      await Room.findOneAndUpdate(
        { roomId },
        {
          $push: { sessions: sessionObj },
          $set: {
            endedAt,
            whiteboardSnapshot: room?.whiteboardData || '',
            lastActiveAt: new Date(),
          },
        }
      );

      socket.emit('session-recap', {
        recap: {
          ...recap.toObject(),
          durationMinutes: Math.max(0, Math.round(durationSeconds / 60)),
        },
      });
    }
  }

  socket.leave(roomId);
  socket.roomId = null;
}
