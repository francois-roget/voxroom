import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { pusher } from '@/lib/pusher';
import { assignColor } from '@/lib/poker';
import Session from '@/models/Session';
import Participant from '@/models/Participant';
import Question from '@/models/Question';
import Response from '@/models/Response';
import type { PokerParticipantSummary } from '@/types';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionCode, participantId, name } = body as Record<string, unknown>;

  if (!sessionCode || typeof sessionCode !== 'string') {
    return NextResponse.json({ error: 'sessionCode is required' }, { status: 400 });
  }
  if (!participantId || typeof participantId !== 'string') {
    return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const trimmedName = name.trim().slice(0, 32);

  try {
    await connectDB();

    const session = await Session.findOne({ code: sessionCode.toUpperCase() }).lean() as {
      _id: unknown;
      code: string;
      kind?: string;
      currentQuestionId?: unknown;
    } | null;

    if (!session || session.kind !== 'poker') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const existing = await Participant.findOne({ sessionId: session._id, participantId }).lean() as {
      participantId: string;
      name: string;
      color: string;
    } | null;

    if (existing) {
      return NextResponse.json(
        { participantId: existing.participantId, name: existing.name, color: existing.color },
        { status: 200 },
      );
    }

    const count = await Participant.countDocuments({ sessionId: session._id });
    const color = assignColor(count);

    await Participant.create({ sessionId: session._id, participantId, name: trimmedName, color });

    // Compute hasVoted for all participants including the new one for the control channel
    const allParticipants = await Participant.find({ sessionId: session._id }).lean() as unknown as Array<{
      participantId: string;
      name: string;
      color: string;
    }>;

    let participantsWithVoted: PokerParticipantSummary[] = allParticipants.map((p) => ({
      participantId: p.participantId,
      name: p.name,
      color: p.color,
      hasVoted: false,
    }));

    // Check current open/revealed question
    const currentQ = await Question.findOne({
      sessionId: session._id,
      status: { $in: ['open', 'revealed'] },
    }).lean() as { _id: unknown } | null;

    if (currentQ) {
      const pIds = allParticipants.map((p) => p.participantId);
      const votedResponses = await Response.find({
        questionId: currentQ._id,
        participantId: { $in: pIds },
      }).lean() as unknown as Array<{ participantId: string }>;
      const votedSet = new Set(votedResponses.map((r) => r.participantId));
      participantsWithVoted = allParticipants.map((p) => ({
        participantId: p.participantId,
        name: p.name,
        color: p.color,
        hasVoted: votedSet.has(p.participantId),
      }));
    }

    await Promise.all([
      pusher.trigger(`session-${session.code}`, 'participant:joined', {
        participantId,
        name: trimmedName,
        color,
      }),
      pusher.trigger(`private-control-${session.code}`, 'participant:joined', {
        participants: participantsWithVoted,
      }),
    ]);

    return NextResponse.json({ participantId, name: trimmedName, color }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/participants]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
