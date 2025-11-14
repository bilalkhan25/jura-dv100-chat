export type ChatMessageData = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  fieldId?: string | null;
  timestamp: number;
};

type ChatMessageProps = {
  message: ChatMessageData;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`} data-field={message.fieldId ?? undefined}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser ? 'bg-indigo-600/90 text-white' : 'bg-slate-900/70 text-slate-100 ring-1 ring-white/10'
        }`}
      >
        <p className="whitespace-pre-line">{message.content}</p>
      </div>
    </div>
  );
}
