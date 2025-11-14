'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
  sender: 'ai' | 'user';
  text: string;
};

export default function AIChatCard({ className }: { className?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: '👋 Hello! I’m your AI assistant.' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) {
      return;
    }

    setMessages([...messages, { sender: 'user', text: input }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'ai', text: '🤖 This is a sample AI response.' }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className={cn('relative w-full min-h-[460px] overflow-hidden rounded-2xl p-[2px]', className)}>
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-white/20"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-gray-800 via-black to-gray-900"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ backgroundSize: '200% 200%' }}
        />

        {Array.from({ length: 20 }).map((_, index) => (
          <motion.div
            key={index}
            className="absolute h-1 w-1 rounded-full bg-white/10"
            animate={{
              y: ['0%', '-140%'],
              x: [Math.random() * 200 - 100, Math.random() * 200 - 100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: index * 0.5,
              ease: 'easeInOut',
            }}
            style={{ left: `${Math.random() * 100}%`, bottom: '-10%' }}
          />
        ))}

        <div className="relative z-10 border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">🤖 AI Assistant</h2>
        </div>

        <div className="relative z-10 flex flex-1 flex-col space-y-3 overflow-y-auto px-4 py-3 text-sm">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                'max-w-[80%] rounded-xl px-3 py-2 shadow-md backdrop-blur-md',
                message.sender === 'ai'
                  ? 'self-start bg-white/10 text-white'
                  : 'self-end bg-white/30 font-semibold text-black',
              )}
            >
              {message.text}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              className="flex max-w-[30%] items-center gap-1 self-start rounded-xl bg-white/10 px-3 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-white delay-200" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-white delay-400" />
            </motion.div>
          )}
        </div>

        <div className="relative z-10 flex items-center gap-2 border-t border-white/10 p-3">
          <input
            className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/50"
            placeholder="Type a message..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            className="rounded-lg bg-white/10 p-2 transition-colors hover:bg-white/20"
            aria-label="Send message"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
