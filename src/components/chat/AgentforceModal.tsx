'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Chip, Input } from '@heroui/react';
import { useApp } from '@/lib/store';
import { useAgentChat } from '@/hooks/useAgentChat';
import { buildMemberContext } from '@/lib/agentforce';

export default function AgentforceModal() {
  const { chatOpen, setChatOpen, selectedMember, chatContextMember, chatSeedPrompt, agentEnabled } = useApp();
  const { messages, isLoading, error, send, reset } = useAgentChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const consumedSeedRef = useRef<string | null>(null);
  const contextSentRef = useRef(false);
  const contextMemberIdRef = useRef<string | null>(null);

  // Prefer the page-level context (e.g. viewing a Member 360 profile) over
  // the dashboard's row-selected member.
  const contextMember = chatContextMember ?? selectedMember;

  // A different member coming into view (e.g. navigating to another
  // profile mid-session) earns its own context injection.
  useEffect(() => {
    const id = contextMember?.id ?? null;
    if (id !== contextMemberIdRef.current) {
      contextMemberIdRef.current = id;
      contextSentRef.current = false;
    }
  }, [contextMember]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Silently prefixes the first message of a session with the in-view
  // member's details — Agentforce only ever sees message text, not the
  // page the user is on, so without this "tell me about this customer"
  // has nothing to resolve to.
  function sendWithContext(text: string) {
    if (contextMember && !contextSentRef.current) {
      contextSentRef.current = true;
      send(text, `${buildMemberContext(contextMember)}\n\n${text}`);
    } else {
      send(text);
    }
  }

  // Auto-send a seeded prompt when an insight action button opens the chat
  useEffect(() => {
    if (chatOpen && chatSeedPrompt && consumedSeedRef.current !== chatSeedPrompt) {
      consumedSeedRef.current = chatSeedPrompt;
      sendWithContext(chatSeedPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, chatSeedPrompt]);

  function handleSend() {
    const value = inputRef.current?.value ?? '';
    if (!value.trim()) return;
    sendWithContext(value);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleNewChat() {
    consumedSeedRef.current = null;
    contextSentRef.current = false;
    reset();
  }

  const suggestions = contextMember
    ? ['Analyze segment profile', 'Check risk status', 'Recommend next actions', 'Show spending breakdown']
    : ['Show at-risk members', 'Explain segments', 'What can you do?'];

  const welcomeText = contextMember
    ? `I've loaded ${contextMember.name}'s D360 profile. How can I help you with this member?`
    : 'Welcome to Agentforce D360. I can analyze member profiles, segments, at-risk patterns, and recommend next best actions. How can I help?';

  return (
    <>
      {/* FAB */}
      {!chatOpen && (
        <button
          onClick={() => agentEnabled && setChatOpen(true)}
          disabled={!agentEnabled}
          title={agentEnabled ? undefined : 'Agentforce integration is disabled — enable it in Settings'}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-xl z-50 transition-transform ${
            agentEnabled ? 'hover:scale-105' : 'cursor-not-allowed opacity-40'
          }`}
          style={{ background: agentEnabled ? 'var(--sf-accent)' : 'var(--sf-text-secondary)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[420px] h-[70vh] max-h-[560px] rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--sf-border)' }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ background: 'var(--sf-primary)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Agentforce</div>
                  <div className="text-[10px] text-white/60">D360 Intelligence Agent</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleNewChat} className="text-white/70 hover:text-white text-xs px-2 py-1">
                  New chat
                </button>
                <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center">
                  ✕
                </button>
              </div>
            </div>

            {/* Context badge */}
            {contextMember && (
              <div className="px-4 py-2 text-xs flex items-center gap-2" style={{ background: 'var(--sf-hover)', borderBottom: '1px solid var(--sf-border)' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: 'var(--sf-accent)' }}>
                  {contextMember.name?.[0]}
                </span>
                <span style={{ color: 'var(--sf-primary)' }}>
                  Viewing: <strong>{contextMember.name}</strong> — {contextMember.general_segment}
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap" style={{ background: 'var(--sf-surface)', color: 'var(--sf-text)' }}>
                    {welcomeText}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user' ? 'text-white' : ''
                    }`}
                    style={msg.role === 'user'
                      ? { background: 'var(--sf-accent)' }
                      : { background: 'var(--sf-surface)', color: 'var(--sf-text)' }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--sf-surface)' }}>
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              {error && <div className="text-sm" style={{ color: 'var(--sf-error)' }}>{error}</div>}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <Chip
                    key={s}
                    size="sm"
                    variant="secondary"
                    onClick={() => sendWithContext(s)}
                    className="cursor-pointer hover:bg-cyan-50 transition-colors"
                    style={{ color: 'var(--sf-accent-dark)' }}
                  >
                    {s}
                  </Chip>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--sf-border)' }}>
              <Input
                ref={inputRef}
                type="text"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Agentforce..."
                aria-label="Ask Agentforce"
                fullWidth
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onPress={handleSend}
                isDisabled={isLoading}
                className="text-white"
                style={{ background: 'var(--sf-accent)' }}
              >
                Send
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
