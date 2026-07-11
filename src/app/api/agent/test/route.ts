import { NextResponse } from "next/server";
import { startSession, endSession, AgentDisabledError } from "@/lib/salesforceAgent";
import { updateAgentSettings } from "@/lib/agentSettings";

export const runtime = "nodejs";

// Attempts a real token mint + session start against the current effective
// config (runtime Settings override, env fallback), then immediately tears
// the session down so Test Connection never leaves orphaned sessions behind.
// The result is persisted so the Settings status chip survives reloads.
export async function POST() {
  try {
    const { sessionId } = await startSession();
    await endSession(sessionId).catch(() => {});
    await updateAgentSettings({ lastTestOk: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AgentDisabledError) {
      // A disabled integration isn't a failed connection test — leave any
      // previously-verified status untouched.
      return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
    }
    const message = err instanceof Error ? err.message : "Connection test failed";
    console.error("[agent/test]", err);
    await updateAgentSettings({ lastTestOk: false });
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
