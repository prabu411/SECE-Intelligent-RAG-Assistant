import mongoose from 'mongoose';

const websiteRequestSchema = new mongoose.Schema({
  clientUsername: { type: String, required: true },
  url: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('WebsiteRequest', websiteRequestSchema);
