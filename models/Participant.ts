import mongoose, { Schema } from 'mongoose';
import { IParticipant } from '@/types';

const ParticipantSchema = new Schema<IParticipant>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  participantId: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
});

ParticipantSchema.index({ sessionId: 1, participantId: 1 }, { unique: true });

const Participant =
  mongoose.models.Participant ?? mongoose.model<IParticipant>('Participant', ParticipantSchema);
export default Participant;
