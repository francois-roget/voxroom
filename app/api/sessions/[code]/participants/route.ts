import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Participant from '@/models/Participant';
import Question from '@/models/Question';
import Response from '@/models/Response';
import type { PokerParticipantSummary } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    await connectDB();

    const session = await Session.findOne({ code: code.toUpperCase() }).lean() as {
      _id: unknown;
      kind?: string;
    } | null;

    if (!session || session.kind !== 'poker') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const rawParticipants = await Participant.find({ sessionId: session._id }).lean() as unknown as Array<{
      participantId: string;
      name: string;
      color: string;
    }>;

    const currentQ = await Question.findOne({
      sessionId: session._id,
      status: { $in: ['open', 'revealed'] },
    }).lean() as { _id: unknown } | null;

    let participants: PokerParticipantSummary[];

    if (currentQ) {
      const pIds = rawParticipants.map((p) => p.participantId);
      const votedResponses = await Response.find({
        questionId: currentQ._id,
        participantId: { $in: pIds },
      }).lean() as unknown as Array<{ participantId: string }>;
      const votedSet = new Set(votedResponses.map((r) => r.participantId));
      participants = rawParticipants.map((p) => ({
        participantId: p.participantId,
        name: p.name,
        color: p.color,
        hasVoted: votedSet.has(p.participantId),
      }));
    } else {
      participants = rawParticipants.map((p) => ({
        participantId: p.participantId,
        name: p.name,
        color: p.color,
        hasVoted: false,
      }));
    }

    return NextResponse.json({ participants });
  } catch (err) {
    console.error('[GET /api/sessions/[code]/participants]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
