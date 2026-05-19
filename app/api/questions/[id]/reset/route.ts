import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { pusher } from '@/lib/pusher';
import Question from '@/models/Question';
import Response from '@/models/Response';
import Session from '@/models/Session';
import User from '@/models/User';
import Participant from '@/models/Participant';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectDB();

    const question = await Question.findById(id).lean() as {
      _id: unknown;
      sessionId: unknown;
      status: string;
      type: string;
    } | null;
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const session = await Session.findById(question.sessionId) as {
      _id: unknown;
      ownerId: unknown;
      code: string;
      kind?: string;
      currentQuestionId: unknown;
      save: () => Promise<void>;
    } | null;
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    if (session.kind !== 'poker') {
      return NextResponse.json({ error: 'Reset is only available for poker sessions' }, { status: 400 });
    }

    const dbUser = await User.findOne({ email: authSession.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    if (String(session.ownerId) !== String(dbUser._id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (question.status !== 'revealed' && question.status !== 'closed') {
      return NextResponse.json({ error: 'Question must be revealed or closed to reset' }, { status: 400 });
    }

    await Response.deleteMany({ questionId: id });

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      { status: 'open', openedAt: new Date(), revealedAt: null },
      { new: true },
    ).lean();

    await Session.findByIdAndUpdate(session._id, {
      currentQuestionId: question._id,
      status: 'active',
    });

    const totalCount = await Participant.countDocuments({ sessionId: session._id });

    const votePayload = { participantId: null, hasVoted: false, votedCount: 0, totalCount };

    await Promise.all([
      pusher.trigger(`session-${session.code}`, 'story:reset', { storyId: String(question._id) }),
      pusher.trigger(`session-${session.code}`, 'vote:cast', votePayload),
      pusher.trigger(`private-control-${session.code}`, 'vote:cast', votePayload),
    ]);

    return NextResponse.json(updatedQuestion);
  } catch (err) {
    console.error('[POST /api/questions/[id]/reset]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
