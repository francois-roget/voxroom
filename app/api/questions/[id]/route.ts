import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import Question from '@/models/Question';
import Session from '@/models/Session';
import User from '@/models/User';

async function getOwnerAndQuestion(questionId: string, email: string) {
  const dbUser = await User.findOne({ email }).lean() as { _id: unknown } | null;
  if (!dbUser) return { error: 'User not found', status: 404 };

  const question = await Question.findById(questionId).lean() as { _id: unknown; sessionId: unknown } | null;
  if (!question) return { error: 'Question not found', status: 404 };

  const voxSession = await Session.findById(question.sessionId).lean() as { ownerId: unknown } | null;
  if (!voxSession) return { error: 'Session not found', status: 404 };

  if (String(voxSession.ownerId) !== String(dbUser._id)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { dbUser, question };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    await connectDB();
    const result = await getOwnerAndQuestion(id, authSession.user.email);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { text, choices, order } = body as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (text && typeof text === 'string') update.text = text.trim();
    if (Array.isArray(choices)) update.choices = (choices as string[]).map((c: string) => c.trim()).filter(Boolean);
    if (typeof order === 'number') update.order = order;

    const updated = await Question.findByIdAndUpdate(id, update, { new: true }).lean();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    const result = await getOwnerAndQuestion(id, authSession.user.email);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
