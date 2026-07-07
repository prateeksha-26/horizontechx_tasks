import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
  participantNames: [{ type: String }],
  durationSeconds: { type: Number },
});

const forgeFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  content: { type: String, default: '' },
  lastEditedBy: { type: String },
  lastEditedAt: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    whiteboardData: { type: String, default: '' },
    whiteboardSnapshot: { type: String, default: '' },
    forgeCode: { type: String, default: 'function helloWorld() {\n  console.log("Welcome to Forge!");\n}\n' },
    forgeLanguage: { type: String, default: 'javascript' },
    forgeEditCount: { type: Number, default: 0 },
    forgeFiles: [forgeFileSchema],
    whiteboardStrokeCount: { type: Number, default: 0 },
    sessionStartedAt: { type: Date },
    endedAt: { type: Date },
    lastActiveAt: { type: Date, default: Date.now },
    sessions: [sessionSchema],
    agendaItems: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    timer: {
      seconds: { type: Number, default: 0 },
      running: { type: Boolean, default: false },
      startedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
