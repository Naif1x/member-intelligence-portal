'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Chip, Input } from '@heroui/react';
import { useApp } from '@/lib/store';
import { generateAgentResponse, type ChatMessage } from '@/lib/agentforce';

export default function AgentforceModal() {
  const { chatOpen, setChatOpen, selectedMember, chatSeedPrompt } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const consumedSeedRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'agent',
        text: selectedMember
          ? `I've loaded ${selectedMember.name}'s D360 profile. How can I help you with this member?`
          : "Welcome to Agentforce D360. I can analyze member profiles, RFM segments, at-risk patterns, and recommend next best actions. How can I help?",
        timestamp: new Date(),
      }]);
    }
  }, [chatOpen, selectedMember]);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    setTimeout(() => {
      const response = generateAgentResponse(userMsg.text, selectedMember);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: response,
        timestamp: new Date(),
      }]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  }

  // Auto-send a seeded prompt when an insight action button opens the chat
  useEffect(() => {
    if (chatOpen && chatSeedPrompt && consumedSeedRef.current !== chatSeedPrompt) {
      consumedSeedRef.current = chatSeedPrompt;
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'agent',
          text: selectedMember
            ? `I've loaded ${selectedMember.name}'s D360 profile. How can I help you with this member?`
            : "Welcome to Agentforce D360. How can I help?",
          timestamp: new Date(),
        }]);
      }
      setTimeout(() => sendMessage(chatSeedPrompt), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, chatSeedPrompt]);

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  }

  const suggestions = selectedMember
    ? ['Analyze segment profile', 'Check risk status', 'Recommend next actions', 'Show spending breakdown']
    : ['Show at-risk members', 'Explain segments', 'What can you do?'];

  return (
    <>
      {/* FAB */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-xl z-50 hover:scale-105 transition-transform"
          style={{ background: 'var(--sf-accent)' }}
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
              <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center">
                ✕
              </button>
            </div>

            {/* Context badge */}
            {selectedMember && (
              <div className="px-4 py-2 text-xs flex items-center gap-2" style={{ background: 'var(--sf-hover)', borderBottom: '1px solid var(--sf-border)' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: 'var(--sf-accent)' }}>
                  {selectedMember.name?.[0]}
                </span>
                <span style={{ color: 'var(--sf-primary)' }}>
                  Viewing: <strong>{selectedMember.name}</strong> — {selectedMember.general_segment}
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              {typing && (
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
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <Chip
                    key={s}
                    size="sm"
                    variant="secondary"
                    onClick={() => { setInput(s); }}
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
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Agentforce..."
                aria-label="Ask Agentforce"
                fullWidth
                className="flex-1"
              />
              <Button
                onPress={handleSend}
                isDisabled={!input.trim()}
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
