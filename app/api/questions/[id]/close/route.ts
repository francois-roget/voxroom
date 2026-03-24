import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOwnerAndQuestion } from '@/lib/questions';
import Question from '@/models/Question';
import Session from '@/models/Session';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await getOwnerAndQuestion(id, authSession.user.email);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const updated = await Question.findByIdAndUpdate(
      id,
      { status: 'closed' },
      { new: true }
    ).lean();

    await Session.findByIdAndUpdate(result.question.sessionId, { currentQuestionId: null });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
