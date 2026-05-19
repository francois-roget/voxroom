import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { pusher } from '@/lib/pusher';
import { aggregateResults } from '@/lib/utils';
import Question from '@/models/Question';
import Response from '@/models/Response';
import Session from '@/models/Session';
import User from '@/models/User';
import Participant from '@/models/Participant';
import type { PokerVote } from '@/types';

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
    const dbUser = await User.findOne({ email: authSession.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const question = await Question.findById(id).lean() as {
      _id: unknown;
      sessionId: unknown;
      status: string;
      type: string;
    } | null;
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const voxSession = await Session.findById(question.sessionId).lean() as {
      _id: unknown;
      ownerId: unknown;
      code: string;
    } | null;
    if (!voxSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (String(voxSession.ownerId) !== String(dbUser._id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (question.status !== 'open') {
      return NextResponse.json({ error: 'Question must be open to reveal' }, { status: 400 });
    }

    const updated = await Question.findByIdAndUpdate(
      id,
      { status: 'revealed', revealedAt: new Date() },
      { new: true },
    ).lean();

    if (question.type === 'poker') {
      const responses = await Response.find({ questionId: id }).lean() as unknown as Array<{
        participantId: string;
        participantName?: string;
        value: string;
      }>;

      const participants = await Participant.find({ sessionId: voxSession._id }).lean() as unknown as Array<{
        participantId: string;
        name: string;
        color: string;
      }>;

      const participantMap = new Map(participants.map((p) => [p.participantId, p]));

      const votes: PokerVote[] = responses
        .map((r) => ({
          participantId: r.participantId,
          name: participantMap.get(r.participantId)?.name ?? r.participantName ?? '—',
          color: participantMap.get(r.participantId)?.color ?? '#888888',
          value: r.value,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      await pusher.trigger(`session-${voxSession.code}`, 'story:revealed', { votes });
    } else {
      const responses = await Response.find({ questionId: id }).lean() as unknown as { value: string }[];
      const results = aggregateResults(responses.map((r) => r.value));
      await pusher.trigger(`session-${voxSession.code}`, 'question:revealed', { results });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[POST /api/questions/[id]/reveal]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
