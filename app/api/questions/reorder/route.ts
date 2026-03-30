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

  const { sessionId, orderedIds } = body as Record<string, unknown>;

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || !orderedIds.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'orderedIds must be a non-empty array of strings' }, { status: 400 });
  }

  try {
    await connectDB();
    const dbUser = await User.findOne({ email: authSession.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const voxSession = await Session.findById(sessionId).lean() as { _id: unknown; ownerId: unknown } | null;
    if (!voxSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (String(voxSession.ownerId) !== String(dbUser._id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingQuestions = await Question.find({ sessionId }).lean() as { _id: unknown }[];
    const existingIds = new Set(existingQuestions.map((q) => String(q._id)));

    if (orderedIds.length !== existingIds.size) {
      return NextResponse.json({ error: 'orderedIds must include all questions of the session' }, { status: 400 });
    }
    if (!orderedIds.every((id) => existingIds.has(id as string))) {
      return NextResponse.json({ error: 'orderedIds contains invalid question IDs' }, { status: 400 });
    }

    await Question.bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { order: index } },
        },
      })),
    );

    const updated = await Question.find({ sessionId }).sort({ order: 1 }).lean();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[POST /api/questions/reorder]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
