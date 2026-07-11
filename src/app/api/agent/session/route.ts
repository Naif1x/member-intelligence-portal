import { NextResponse } from "next/server";
import { startSession, AgentDisabledError } from "@/lib/salesforceAgent";

export const runtime = "nodejs"; // needs Node crypto; not Edge

export async function POST() {
  try {
    const { sessionId } = await startSession();
    return NextResponse.json({ sessionId });
  } catch (err) {
    if (err instanceof AgentDisabledError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[agent/session]", err);
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }
}
