import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    encrypted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('File', fileSchema);
