import mongoose, { Schema } from 'mongoose';
import type { IUser } from '@/types';

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
