import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import Question from '@/models/Question';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    await connectDB();
    const session = await Session.findOne({
      code: code.toUpperCase(),
    }).lean();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const questions = await Question.find({ sessionId: session._id })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ session, questions });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
