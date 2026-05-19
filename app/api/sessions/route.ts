import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { generateSessionCode } from '@/lib/utils';
import Session from '@/models/Session';
import User from '@/models/User';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const dbUser = await User.findOne({ email: session.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessions = await Session.find({ ownerId: dbUser._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(sessions);
  } catch (err) {
    console.error('[GET /api/sessions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const bodyRecord = body as Record<string, unknown>;
  const name = bodyRecord?.name;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const rawKind = bodyRecord?.kind;
  if (rawKind !== undefined && rawKind !== 'poll' && rawKind !== 'poker') {
    return NextResponse.json({ error: 'kind must be poll or poker' }, { status: 400 });
  }
  const kind: 'poll' | 'poker' = rawKind === 'poker' ? 'poker' : 'poll';

  try {
    await connectDB();
    const dbUser = await User.findOne({ email: session.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let code = generateSessionCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await Session.findOne({ code }).lean();
      if (!existing) break;
      code = generateSessionCode();
      attempts++;
    }

    const newSession = await Session.create({
      code,
      name: name.trim(),
      kind,
      ownerId: dbUser._id,
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (err) {
    console.error('[POST /api/sessions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
