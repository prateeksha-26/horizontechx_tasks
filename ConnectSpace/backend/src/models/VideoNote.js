import mongoose from 'mongoose';

const videoNoteSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    videoData: {
      type: String, // base64 encoded webm video for files < 10MB
      required: true,
    },
    durationSeconds: {
      type: Number,
      required: true,
    },
    attachedTo: {
      type: String,
      enum: ['room', 'forge', 'whiteboard'],
      default: 'room',
    },
    transcription: {
      type: String,
      default: null,
    },
    replies: [
      {
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        authorName: String,
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isUnread: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('VideoNote', videoNoteSchema);
