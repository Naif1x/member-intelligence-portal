import { promises as fs } from "fs";
import path from "path";

/**
 * Server-only. Never import this into a client component.
 *
 * Non-secret Agentforce config (enabled toggle, Agent ID, My Domain) that
 * the Settings tab can edit at runtime, layered over env defaults. Backed
 * by a gitignored JSON file so it survives restarts on a persistent server
 * (local dev, a long-running Node host). On serverless platforms with an
 * ephemeral/read-only filesystem (e.g. Vercel) writes are best-effort — a
 * fresh instance falls back to env defaults. Env vars remain the durable
 * source of truth in production; this store is a live override layer.
 *
 * Every read goes to disk rather than an in-memory cache: Next.js can
 * compile each route handler into its own module graph, so a module-level
 * variable here is not reliably shared across route files (a value written
 * by POST /api/agent/test was observed not to be visible to a subsequent
 * GET /api/agent/config in dev). Reading a few-hundred-byte JSON file on
 * each call is cheap enough that the simplicity is worth it here.
 */

export interface AgentSettings {
  enabled: boolean;
  agentId: string;
  myDomain: string;
  // Persisted result of the last Test Connection call, so the status chip
  // survives page reloads/navigation instead of resetting to "unverified"
  // every time the Settings component remounts.
  lastTestOk?: boolean;
}

const STORE_PATH = path.join(process.cwd(), ".data", "agent-settings.json");

function envDefaults(): AgentSettings {
  return {
    enabled: true,
    agentId: process.env.SF_AGENT_ID ?? "",
    myDomain: process.env.SF_MY_DOMAIN_URL ?? "",
  };
}

async function readFromDisk(): Promise<Partial<AgentSettings> | null> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeToDisk(settings: AgentSettings): Promise<void> {
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
    // Read-only filesystem (e.g. Vercel serverless) — the in-memory cache
    // still serves the current instance; nothing further to do.
  }
}

export async function getAgentSettings(): Promise<AgentSettings> {
  const defaults = envDefaults();
  const stored = await readFromDisk();
  return {
    enabled: stored?.enabled ?? defaults.enabled,
    agentId: stored?.agentId || defaults.agentId,
    myDomain: stored?.myDomain || defaults.myDomain,
    lastTestOk: stored?.lastTestOk,
  };
}

export async function updateAgentSettings(
  partial: Partial<AgentSettings>
): Promise<AgentSettings> {
  const current = await getAgentSettings();
  const defined = Object.fromEntries(
    Object.entries(partial).filter(([, v]) => v !== undefined)
  ) as Partial<AgentSettings>;

  const next: AgentSettings = { ...current, ...defined };

  // A previous successful test no longer proves the *new* Agent ID/My
  // Domain work — invalidate it, unless this call is itself reporting a
  // fresh test result (i.e. came from the Test Connection route).
  const changingConfig =
    (defined.agentId !== undefined && defined.agentId !== current.agentId) ||
    (defined.myDomain !== undefined && defined.myDomain !== current.myDomain);
  if (changingConfig && defined.lastTestOk === undefined) {
    next.lastTestOk = undefined;
  }

  await writeToDisk(next);
  return next;
}

export function hasServerSecrets(): boolean {
  return Boolean(process.env.SF_CONSUMER_KEY && process.env.SF_CONSUMER_SECRET);
}
