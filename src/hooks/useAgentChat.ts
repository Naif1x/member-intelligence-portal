"use client";

import { useCallback, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const res = await fetch("/api/agent/session", { method: "POST" });
    if (!res.ok) throw new Error("Could not start session");
    const { sessionId } = await res.json();
    sessionIdRef.current = sessionId;
    return sessionId;
  }, []);

  const send = useCallback(
    // apiText, when provided, is what's actually sent to Salesforce, while
    // `text` is what renders in the chat bubble — lets a caller attach
    // invisible context (e.g. which customer profile is in view) without it
    // cluttering the visible conversation.
    async (text: string, apiText?: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "user", text: trimmed },
      ]);
      setIsLoading(true);

      try {
        const sessionId = await ensureSession();
        sequenceRef.current += 1;

        const res = await fetch("/api/agent/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            text: apiText ?? trimmed,
            sequenceId: sequenceRef.current,
          }),
        });

        if (!res.ok) throw new Error("Message failed");
        const { reply } = await res.json();

        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "agent", text: reply || "…" },
        ]);
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [ensureSession, isLoading]
  );

  const reset = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    sequenceRef.current = 0;
    setMessages([]);
    setError(null);
    if (sessionId) {
      // Fire-and-forget; don't block the UI on cleanup.
      fetch("/api/agent/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
  }, []);

  return { messages, isLoading, error, send, reset };
}
