import { randomUUID } from "crypto";
import { getAgentSettings } from "./agentSettings";

/**
 * Server-side only. Never import this into a client component.
 * Handles OAuth client-credentials token minting + Agent API calls.
 */

const {
  SF_CONSUMER_KEY,
  SF_CONSUMER_SECRET,
  SF_AGENT_API_BASE = "https://api.salesforce.com",
} = process.env;

export class AgentDisabledError extends Error {
  constructor() {
    super("Agentforce integration is disabled");
    this.name = "AgentDisabledError";
  }
}

// Agent ID and My Domain are editable via the Settings tab (env-backed
// defaults, runtime override on top). The consumer key/secret are never
// part of that store — they only ever come from server env vars.
async function getEffectiveConfig() {
  const settings = await getAgentSettings();

  if (!settings.enabled) {
    throw new AgentDisabledError();
  }

  const missing = [
    ["My Domain", settings.myDomain],
    ["Agent ID", settings.agentId],
    ["SF_CONSUMER_KEY", SF_CONSUMER_KEY],
    ["SF_CONSUMER_SECRET", SF_CONSUMER_SECRET],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing Salesforce config: ${missing.join(", ")}`);
  }

  return { myDomain: settings.myDomain, agentId: settings.agentId };
}

// ---- Token cache (per server instance) --------------------------------
let cachedToken: { value: string; expiresAt: number; myDomain: string } | null = null;

async function getAccessToken(myDomain: string): Promise<string> {
  // Reuse a still-valid token (refresh 60s before expiry), but only if it
  // was minted for the same My Domain — the domain can change at runtime
  // via Settings.
  if (cachedToken && cachedToken.myDomain === myDomain && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: SF_CONSUMER_KEY!,
    client_secret: SF_CONSUMER_SECRET!,
  });

  const res = await fetch(`${myDomain}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // client_credentials responses may omit expires_in; default to ~30 min.
  const ttlMs = (data.expires_in ? Number(data.expires_in) : 1800) * 1000;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ttlMs, myDomain };
  return cachedToken.value;
}

// ---- Agent API calls --------------------------------------------------

export async function startSession(): Promise<{ sessionId: string }> {
  const { myDomain, agentId } = await getEffectiveConfig();
  const token = await getAccessToken(myDomain);

  const res = await fetch(`${SF_AGENT_API_BASE}/einstein/ai-agent/v1/agents/${agentId}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      externalSessionKey: randomUUID(),
      instanceConfig: { endpoint: myDomain },
      // Runs the session as the agent-assigned user (client-credentials flow).
      bypassUser: true,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`startSession failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { sessionId: data.sessionId };
}

export async function sendMessage(
  sessionId: string,
  text: string,
  sequenceId: number
): Promise<{ text: string; raw: unknown }> {
  const { myDomain } = await getEffectiveConfig();
  const token = await getAccessToken(myDomain);

  const res = await fetch(`${SF_AGENT_API_BASE}/einstein/ai-agent/v1/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { sequenceId, type: "Text", text },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`sendMessage failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  // Synchronous endpoint returns messages[]; concatenate any text blocks.
  const reply = Array.isArray(data.messages)
    ? data.messages.map((m: { message?: string }) => m.message ?? "").join("\n").trim()
    : "";

  return { text: reply, raw: data };
}

export async function endSession(sessionId: string): Promise<void> {
  const { myDomain } = await getEffectiveConfig();
  const token = await getAccessToken(myDomain);

  const res = await fetch(`${SF_AGENT_API_BASE}/einstein/ai-agent/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-session-end-reason": "UserRequest",
    },
    cache: "no-store",
  });

  // 204 = success; ignore already-closed sessions.
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`endSession failed (${res.status}): ${text}`);
  }
}
