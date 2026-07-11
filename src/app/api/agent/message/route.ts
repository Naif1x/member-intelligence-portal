import { NextRequest, NextResponse } from "next/server";
import { sendMessage, AgentDisabledError } from "@/lib/salesforceAgent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, text, sequenceId } = await req.json();

    if (!sessionId || typeof text !== "string" || typeof sequenceId !== "number") {
      return NextResponse.json(
        { error: "sessionId, text, and sequenceId are required" },
        { status: 400 }
      );
    }

    const { text: reply } = await sendMessage(sessionId, text, sequenceId);
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof AgentDisabledError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[agent/message]", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
