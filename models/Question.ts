import mongoose, { Schema } from 'mongoose';
import type { IQuestion } from '@/types';

const QuestionSchema = new Schema<IQuestion>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  order: { type: Number, required: true },
  type: { type: String, enum: ['mcq', 'wordcloud', 'poker'], required: true },
  text: { type: String, required: true },
  choices: { type: [String], default: [] },
  storyMeta: {
    type: new mongoose.Schema({ jiraUrl: { type: String, default: null } }, { _id: false }),
    default: undefined,
  },
  status: { type: String, enum: ['pending', 'open', 'revealed', 'closed'], default: 'pending' },
  openedAt: { type: Date, default: null },
  revealedAt: { type: Date, default: null },
});

QuestionSchema.index({ sessionId: 1 });

export default mongoose.models.Question ?? mongoose.model<IQuestion>('Question', QuestionSchema);
