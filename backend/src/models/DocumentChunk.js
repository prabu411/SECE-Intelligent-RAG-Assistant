import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  website: { type: String, required: true, index: true },
  url:     { type: String, required: true },
  title:   { type: String, default: '' },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
}, { timestamps: true });

export default mongoose.model('DocumentChunk', chunkSchema);
