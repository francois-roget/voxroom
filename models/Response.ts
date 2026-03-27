import mongoose, { Schema } from 'mongoose';
import type { IResponse } from '@/types';

const ResponseSchema = new Schema<IResponse>({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  participantId: { type: String, required: true },
  value: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

ResponseSchema.index({ questionId: 1, participantId: 1 }, { unique: true });
ResponseSchema.index({ sessionId: 1 });

export default mongoose.models.Response ?? mongoose.model<IResponse>('Response', ResponseSchema);
