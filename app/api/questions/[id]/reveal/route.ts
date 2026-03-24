import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnerAndQuestion } from "@/lib/questions";
import Question from "@/models/Question";

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

    if (result.question.status !== "open") {
      return NextResponse.json(
        { error: "Question must be open to reveal" },
        { status: 400 },
      );
    }

    const updated = await Question.findByIdAndUpdate(
      id,
      { status: "revealed", revealedAt: new Date() },
      { new: true },
    ).lean();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
