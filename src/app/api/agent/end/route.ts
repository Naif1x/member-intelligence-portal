import { NextRequest, NextResponse } from "next/server";
import { endSession, AgentDisabledError } from "@/lib/salesforceAgent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    await endSession(sessionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AgentDisabledError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[agent/end]", err);
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
  }
}
