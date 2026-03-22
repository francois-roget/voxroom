import type { Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  image: string;
  createdAt: Date;
}

export interface ISession {
  _id: Types.ObjectId;
  code: string;
  name: string;
  ownerId: Types.ObjectId;
  status: 'waiting' | 'active' | 'closed';
  currentQuestionId: Types.ObjectId | null;
  createdAt: Date;
  closedAt: Date | null;
}

export interface IQuestion {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  order: number;
  type: 'mcq' | 'wordcloud';
  text: string;
  choices: string[];
  status: 'pending' | 'open' | 'revealed' | 'closed';
  openedAt: Date | null;
  revealedAt: Date | null;
}

export interface IResponse {
  _id: Types.ObjectId;
  questionId: Types.ObjectId;
  sessionId: Types.ObjectId;
  participantId: string;
  value: string;
  createdAt: Date;
}

export interface AggregatedResult {
  [choice: string]: { count: number; percent: number };
}
