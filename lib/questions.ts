import { connectDB } from '@/lib/db';
import Question from '@/models/Question';
import Session from '@/models/Session';
import User from '@/models/User';

export type QuestionDoc = {
  _id: unknown;
  sessionId: unknown;
  status: string;
};

type OwnerAndQuestion =
  | { error: string; status: number }
  | { dbUser: { _id: unknown }; question: QuestionDoc };

export async function getOwnerAndQuestion(
  questionId: string,
  email: string
): Promise<OwnerAndQuestion> {
  await connectDB();

  const dbUser = await User.findOne({ email }).lean() as { _id: unknown } | null;
  if (!dbUser) return { error: 'User not found', status: 404 };

  const question = await Question.findById(questionId).lean() as QuestionDoc | null;
  if (!question) return { error: 'Question not found', status: 404 };

  const voxSession = await Session.findById(question.sessionId).lean() as { ownerId: unknown } | null;
  if (!voxSession) return { error: 'Session not found', status: 404 };

  if (String(voxSession.ownerId) !== String(dbUser._id)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { dbUser, question };
}
