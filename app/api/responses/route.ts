import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { pusher } from '@/lib/pusher';
import { assertPokerValue } from '@/lib/poker';
import { aggregateResults } from '@/lib/utils';
import Question from '@/models/Question';
import Response from '@/models/Response';
import Session from '@/models/Session';
import Participant from '@/models/Participant';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { questionId, sessionId, participantId, value, participantName } = body as Record<string, unknown>;

  if (!questionId || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  if (!participantId || typeof participantId !== 'string') {
    return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
  }
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  try {
    await connectDB();

    const question = await Question.findById(questionId).lean() as {
      _id: unknown;
      status: string;
      type: string;
      sessionId: unknown;
    } | null;
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    if (question.status !== 'open') {
      return NextResponse.json({ error: 'Question is not open' }, { status: 403 });
    }

    const voxSession = await Session.findById(question.sessionId).lean() as {
      _id: unknown;
      code: string;
      kind?: string;
    } | null;

    if (question.type === 'poker') {
      // Validate poker value
      try {
        assertPokerValue(value);
      } catch {
        return NextResponse.json({ error: 'Invalid poker value' }, { status: 400 });
      }

      // Verify participant joined
      const participant = await Participant.findOne({ sessionId: question.sessionId, participantId }).lean() as {
        name: string;
      } | null;
      if (!participant) {
        return NextResponse.json({ error: 'Must join before voting' }, { status: 403 });
      }

      // Check duplicate vote
      const existingVote = await Response.findOne({ questionId, participantId }).lean();
      if (existingVote) {
        return NextResponse.json({ error: 'Already voted' }, { status: 409 });
      }

      await Response.create({
        questionId,
        sessionId: question.sessionId,
        participantId,
        value,
        participantName: participant.name,
      });

      const votedCount = await Response.countDocuments({ questionId });
      const totalCount = voxSession
        ? await Participant.countDocuments({ sessionId: voxSession._id })
        : 0;

      // CRITICAL: NO value field in vote payload
      const votePayload = { participantId, hasVoted: true, votedCount, totalCount };

      if (voxSession) {
        await Promise.all([
          pusher.trigger(`session-${voxSession.code}`, 'vote:cast', votePayload),
          pusher.trigger(`private-control-${voxSession.code}`, 'vote:cast', votePayload),
        ]);
      }

      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Poll path (existing logic)
    const existing = await Response.findOne({ questionId, participantId }).lean();
    if (existing) return NextResponse.json({ error: 'Already answered' }, { status: 409 });

    const response = await Response.create({
      questionId,
      sessionId,
      participantId,
      value: value.trim(),
      ...(participantName && typeof participantName === 'string' ? { participantName: participantName.trim() } : {}),
    });

    if (voxSession) {
      const allResponses = await Response.find({ questionId }).lean() as unknown as { value: string }[];
      const results = aggregateResults(allResponses.map((r) => r.value));
      const count = allResponses.length;

      await Promise.all([
        pusher.trigger(`private-control-${voxSession.code}`, 'response:new', { count, results }),
        pusher.trigger(`session-${voxSession.code}`, 'response:count', { count }),
      ]);
    }

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error('[POST /api/responses]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
