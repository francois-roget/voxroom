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
  kind: 'poll' | 'poker';
  currentQuestionId: Types.ObjectId | null;
  createdAt: Date;
  closedAt: Date | null;
}

export interface IQuestion {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  order: number;
  type: 'mcq' | 'wordcloud' | 'poker';
  text: string;
  choices: string[];
  storyMeta?: { jiraUrl?: string };
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
  participantName?: string;
  createdAt: Date;
}

export interface AggregatedResult {
  [choice: string]: { count: number; percent: number };
}

export interface IParticipant {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  participantId: string;
  name: string;
  color: string;
  joinedAt: Date;
}

export interface PokerVote {
  participantId: string;
  name: string;
  color: string;
  value: string;
}

export interface PokerParticipantSummary {
  participantId: string;
  name: string;
  color: string;
  hasVoted: boolean;
}
