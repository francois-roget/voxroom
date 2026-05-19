import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import Question from "@/models/Question";
import Response from "@/models/Response";
import Participant from "@/models/Participant";
import type { PokerParticipantSummary } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    await connectDB();
    const session = await Session.findOne({
      code: code.toUpperCase(),
    }).lean() as unknown as { _id: unknown; kind?: string; currentQuestionId?: unknown } | null;

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

    let participants: PokerParticipantSummary[] = [];
    if (session.kind === 'poker') {
      const rawParticipants = await Participant.find({ sessionId: session._id }).lean() as unknown as Array<{
        participantId: string;
        name: string;
        color: string;
      }>;

      if (activeQ) {
        const participantIds = rawParticipants.map((p) => p.participantId);
        const votedResponses = await Response.find({
          questionId: activeQ._id,
          participantId: { $in: participantIds },
        }).lean() as unknown as Array<{ participantId: string }>;
        const votedSet = new Set(votedResponses.map((r) => r.participantId));
        participants = rawParticipants.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          color: p.color,
          hasVoted: votedSet.has(p.participantId),
        }));
      } else {
        participants = rawParticipants.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          color: p.color,
          hasVoted: false,
        }));
      }
    }

    return NextResponse.json({ session, questions, responseCount, participants });
  } catch (err) {
    console.error('[GET /api/sessions/[code]]', err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
