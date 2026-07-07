import mongoose from 'mongoose';

const recapSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    roomName: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    participantNames: [{ type: String }],
    fileCount: { type: Number, default: 0 },
    forgeEditCount: { type: Number, default: 0 },
    whiteboardStrokeCount: { type: Number, default: 0 },
    sessionStartedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Recap', recapSchema);
