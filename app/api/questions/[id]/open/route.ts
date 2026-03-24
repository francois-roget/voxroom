import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnerAndQuestion } from "@/lib/questions";
import Question from "@/models/Question";
import Session from "@/models/Session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await getOwnerAndQuestion(id, authSession.user.email);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const { question } = result;

    await Question.updateMany(
      { sessionId: question.sessionId, status: "open" },
      { status: "closed" },
    );

    const updated = await Question.findByIdAndUpdate(
      id,
      { status: "open", openedAt: new Date() },
      { new: true },
    ).lean();

    await Session.findByIdAndUpdate(question.sessionId, {
      status: "active",
      currentQuestionId: id,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
