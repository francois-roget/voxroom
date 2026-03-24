import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import Question from '@/models/Question';
import Session from '@/models/Session';
import User from '@/models/User';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const dbUser = await User.findOne({ email: authSession.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const question = await Question.findById(id).lean() as { _id: unknown; sessionId: unknown } | null;
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const voxSession = await Session.findById(question.sessionId).lean() as { _id: unknown; ownerId: unknown } | null;
    if (!voxSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (String(voxSession.ownerId) !== String(dbUser._id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Close any currently open question in this session
    await Question.updateMany(
      { sessionId: question.sessionId, status: 'open' },
      { status: 'closed' }
    );

    const updated = await Question.findByIdAndUpdate(
      id,
      { status: 'open', openedAt: new Date() },
      { new: true }
    ).lean();

    await Session.findByIdAndUpdate(question.sessionId, {
      status: 'active',
      currentQuestionId: id,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
