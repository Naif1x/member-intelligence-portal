'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/store';
import { generateAgentResponse, type ChatMessage } from '@/lib/agentforce';

export default function AgentforceModal() {
  const { chatOpen, setChatOpen, selectedMember } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'agent',
        text: selectedMember
          ? `I've loaded ${selectedMember.firstName} ${selectedMember.lastName}'s D360 profile. How can I help you with this member?`
          : "Welcome to Agentforce D360. I can analyze member profiles, RFM segments, at-risk patterns, and recommend next best actions. How can I help?",
        timestamp: new Date(),
      }]);
    }
  }, [chatOpen, selectedMember]);

  function handleSend() {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: input.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
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

  const suggestions = selectedMember
    ? ['Analyze RFM scores', 'Check risk status', 'Recommend next actions', 'Show spending breakdown']
    : ['Show at-risk members', 'Explain segments', 'What can you do?'];

  return (
    <>
      {/* FAB */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-xl z-50 hover:scale-105 transition-transform"
          style={{ background: 'var(--sf-secondary)' }}
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
            className="fixed bottom-6 right-6 w-[420px] h-[560px] rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden"
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
              <div className="px-4 py-2 text-xs flex items-center gap-2" style={{ background: '#EBF5FF', borderBottom: '1px solid var(--sf-border)' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: 'var(--sf-secondary)' }}>
                  {selectedMember.firstName?.[0]}
                </span>
                <span style={{ color: 'var(--sf-primary)' }}>
                  Viewing: <strong>{selectedMember.firstName} {selectedMember.lastName}</strong> — {selectedMember.segment}
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
                      ? { background: 'var(--sf-secondary)' }
                      : { background: '#F3F3F3', color: 'var(--sf-text)' }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#F3F3F3' }}>
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
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-xs px-2.5 py-1 rounded-full border hover:bg-blue-50 transition-colors"
                    style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-secondary)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--sf-border)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Agentforce..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                style={{ border: '1px solid var(--sf-border)' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40"
                style={{ background: 'var(--sf-secondary)' }}
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
