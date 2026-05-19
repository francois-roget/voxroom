import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Question from '@/models/Question';
import User from '@/models/User';

export async function POST(request: Request) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, type, text, choices, storyMeta } = body as Record<string, unknown>;

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  if (type !== 'mcq' && type !== 'wordcloud' && type !== 'poker') {
    return NextResponse.json({ error: 'type must be mcq, wordcloud, or poker' }, { status: 400 });
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (type === 'mcq') {
    if (!Array.isArray(choices) || choices.length < 2) {
      return NextResponse.json({ error: 'mcq requires at least 2 choices' }, { status: 400 });
    }
  }
  if (storyMeta !== undefined) {
    const sm = storyMeta as Record<string, unknown>;
    if (typeof storyMeta !== 'object' || storyMeta === null) {
      return NextResponse.json({ error: 'storyMeta must be an object' }, { status: 400 });
    }
    if (sm.jiraUrl !== undefined && typeof sm.jiraUrl !== 'string') {
      return NextResponse.json({ error: 'storyMeta.jiraUrl must be a string' }, { status: 400 });
    }
  }

  try {
    await connectDB();
    const dbUser = await User.findOne({ email: authSession.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const voxSession = await Session.findById(sessionId).lean() as { _id: unknown; ownerId: unknown; kind?: string } | null;
    if (!voxSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (String(voxSession.ownerId) !== String(dbUser._id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (voxSession.kind === 'poker' && type !== 'poker') {
      return NextResponse.json({ error: 'Poker sessions only accept poker questions' }, { status: 400 });
    }
    if (voxSession.kind !== 'poker' && type === 'poker') {
      return NextResponse.json({ error: 'Poker questions can only be added to poker sessions' }, { status: 400 });
    }

    const count = await Question.countDocuments({ sessionId });
    const question = await Question.create({
      sessionId,
      order: count,
      type,
      text: (text as string).trim(),
      choices: type === 'mcq' ? (choices as string[]).map((c: string) => c.trim()).filter(Boolean) : [],
      ...(type === 'poker' && storyMeta !== undefined ? { storyMeta } : {}),
    });

    return NextResponse.json(question, { status: 201 });
  } catch (err) {
    console.error('[POST /api/questions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
