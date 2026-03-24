import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Question from '@/models/Question';
import Response from '@/models/Response';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { questionId, sessionId, participantId, value } = body as Record<string, unknown>;

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

    const question = await Question.findById(questionId).lean() as { status: string } | null;
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    if (question.status !== 'open') {
      return NextResponse.json({ error: 'Question is not open' }, { status: 403 });
    }

    const existing = await Response.findOne({ questionId, participantId }).lean();
    if (existing) {
      return NextResponse.json({ error: 'Already answered' }, { status: 409 });
    }

    const response = await Response.create({
      questionId,
      sessionId,
      participantId,
      value: value.trim(),
    });

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
