import { NextRequest, NextResponse } from "next/server";
import { getAgentSettings, updateAgentSettings, hasServerSecrets } from "@/lib/agentSettings";

export const runtime = "nodejs";

// Non-secret config only. hasSecrets is a boolean signal — the actual
// consumer key/secret values are never read, returned, or accepted here.
export async function GET() {
  const settings = await getAgentSettings();
  return NextResponse.json({ ...settings, hasSecrets: hasServerSecrets() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (
      (body.enabled !== undefined && typeof body.enabled !== "boolean") ||
      (body.agentId !== undefined && typeof body.agentId !== "string") ||
      (body.myDomain !== undefined && typeof body.myDomain !== "string")
    ) {
      return NextResponse.json({ error: "Invalid config payload" }, { status: 400 });
    }

    // Reject any attempt to smuggle secret-shaped fields through this
    // endpoint — the client should never even be sending these, but the
    // server enforces it regardless of what the client does.
    if ("consumerKey" in body || "consumerSecret" in body) {
      return NextResponse.json(
        { error: "Secrets cannot be set via this endpoint; use server env vars" },
        { status: 400 }
      );
    }

    const updated = await updateAgentSettings({
      enabled: body.enabled,
      agentId: body.agentId?.trim(),
      myDomain: body.myDomain?.trim().replace(/\/+$/, ""),
    });

    return NextResponse.json({ ...updated, hasSecrets: hasServerSecrets() });
  } catch (err) {
    console.error("[agent/config]", err);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
