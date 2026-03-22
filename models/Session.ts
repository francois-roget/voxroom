import mongoose, { Schema } from 'mongoose';
import type { ISession } from '@/types';

const SessionSchema = new Schema<ISession>({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['waiting', 'active', 'closed'], default: 'waiting' },
  currentQuestionId: { type: Schema.Types.ObjectId, ref: 'Question', default: null },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
});

export default mongoose.models.Session ?? mongoose.model<ISession>('Session', SessionSchema);
