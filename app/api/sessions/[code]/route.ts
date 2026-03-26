import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import Question from "@/models/Question";
import Response from "@/models/Response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    await connectDB();
    const session = await Session.findOne({
      code: code.toUpperCase(),
    }).lean() as unknown as { _id: unknown } | null;

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const questions = await Question.find({ sessionId: session._id })
      .sort({ order: 1 })
      .lean() as unknown as { _id: unknown; status: string }[];

    const activeQ = questions.find((q) => q.status === 'open') ?? questions.find((q) => q.status === 'revealed');
    const responseCount = activeQ
      ? await Response.countDocuments({ questionId: activeQ._id })
      : 0;

    return NextResponse.json({ session, questions, responseCount });
  } catch (err) {
    console.error('[GET /api/sessions/[code]]', err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
