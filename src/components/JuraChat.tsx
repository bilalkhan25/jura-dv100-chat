import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FlowStep } from '../lib/juraFlow';
import { loadFlow } from '../lib/juraFlow';
import { setAtPath } from '../lib/objectPath';
import { applyDerivedFields, derivedMap } from '../lib/derived';
import { initialDv100Data, loadState, saveState } from '../lib/dv100State';
import pdfToSchemaMapJson from '../data/pdfToSchemaMap.json';

type ChatAuthor = 'jura' | 'user';

export type ChatMessage = {
  id: string;
  from: ChatAuthor;
  text: string;
  createdAt: number;
  renderedText?: string;
  complete?: boolean;
};

export type ProgressSnapshot = {
  completed: number;
  total: number;
};

type JuraChatProps = {
  onProgressChange?: (snapshot: ProgressSnapshot) => void;
};

const pdfToSchemaMap: Record<string, string> = pdfToSchemaMapJson as Record<string, string>;

function filterAskableSteps(allSteps: FlowStep[], derivedKeys: string[]): FlowStep[] {
  const derivedTargets = new Set(derivedKeys);
  return allSteps.filter((step) => {
    if (!step.id) return false;
    if (step.auto) return false;
    if (derivedTargets.has(step.id)) return false;
    return true;
  });
}

async function fetchJuraQuestion(
  step: FlowStep,
  answers: any,
  lastUserMessage: string | null,
): Promise<string> {
  const payload = {
    currentFieldId: step.id,
    context: step.context,
    answers,
    lastUserMessage,
  };

  try {
    console.log('[JuraChat] requesting Jura question for', step.id, 'lastUserMessage:', lastUserMessage);
    const res = await fetch('/api/jura-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('Jura API bad response', res.status);
      return step.context || step.id;
    }

    const text = (await res.text()).trim();
    console.log('Jura question received:', text);
    return text || step.context || step.id;
  } catch (error) {
    console.warn('Falling back to local context for Jura question', error);
    return step.context || step.id;
  }
}

type FieldKind = 'name' | 'shortText' | 'yesNo' | 'longNarrative' | 'number' | 'date';

type FieldRule = {
  kind: FieldKind;
  required?: boolean;
  maxLength?: number;
};

const fieldRules: Record<string, FieldRule> = {
  courtName: { kind: 'shortText', required: false, maxLength: 120 },
  caseNumber: { kind: 'shortText', required: false, maxLength: 60 },
  petitionerName: { kind: 'name', required: true, maxLength: 80 },
  respondentName: { kind: 'name', required: true, maxLength: 80 },
  abuse_details_description: { kind: 'longNarrative', required: true },
  abuse_additional_details_description: { kind: 'longNarrative', required: false },
  abuse_more_details_description: { kind: 'longNarrative', required: false },
};

function getFieldRule(step: FlowStep): FieldRule {
  return fieldRules[step.id as keyof typeof fieldRules] ?? { kind: 'shortText', required: !!step.required };
}

async function extractAnswerForField(
  step: FlowStep,
  userInput: string,
): Promise<{ cleaned: string; unsure: boolean }> {
  const payload = {
    fieldId: step.id,
    fieldKind: getFieldRule(step).kind,
    context: step.context,
    userInput,
  };

  try {
    const res = await fetch('/api/jura-extract-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn('extract-answer bad status', res.status);
      return { cleaned: '', unsure: true };
    }
    const data = await res.json();
    const answer = typeof data.answer === 'string' ? data.answer.trim() : '';
    const flaggedUnsure = Boolean(data.unsure) || !answer || answer === '__UNSURE__';
    if (flaggedUnsure) {
      return { cleaned: '', unsure: true };
    }
    return { cleaned: answer, unsure: false };
  } catch (error) {
    console.error('extract-answer error', error);
    return { cleaned: '', unsure: true };
  }
}

function coerceMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const maybe = entry as Partial<ChatMessage>;
      if (maybe.from !== 'jura' && maybe.from !== 'user') {
        return null;
      }
      if (typeof maybe.text !== 'string' || maybe.text.length === 0) {
        return null;
      }
      return {
        id: typeof maybe.id === 'string' ? maybe.id : `restored-${index}`,
        from: maybe.from,
        text: maybe.text,
        createdAt: typeof maybe.createdAt === 'number' ? maybe.createdAt : Date.now(),
      };
    })
    .filter((msg): msg is ChatMessage => Boolean(msg));
}

const WELCOME_TEXT =
  "Hi, I'm Jura. I'm really sorry you're going through all of this. If you’d like, you can tell me a little about what’s been happening or how you’re feeling, and we’ll take this one small step at a time together.";

function looksLikeIDontKnow(raw: string): boolean {
  const lower = raw.toLowerCase().trim();
  if (!lower) return false;
  return /\b(i don'?t know|dont know|not sure|no idea|i can'?t remember|cant remember)\b/.test(lower);
}

function looksLikeMetaResponse(raw: string): boolean {
  const lower = raw.toLowerCase().trim();
  if (!lower) return false;
  return /\b(i have it|i know it|i got it|i will give it later|i'll give it later|later)\b/.test(lower);
}

function getTherapyRetryText(attempt: number): string {
  const safe = Math.min(Math.max(attempt, 1), 3);
  const prompts = [
    "I really appreciate you sharing what you have so far - even telling me you're unsure takes effort when you're already overwhelmed. For this part, the court does need at least a little something, but it doesn't have to be perfect. If you think about it slowly, is there any small detail - a number, a city, or even a rough idea - that feels okay to share right now?",
    "Thank you for hanging in there with me. Lots of people in your situation aren't sure what to say here at first, and that's completely normal. We're just looking for a small piece that belongs in this spot, not your whole story. As you sit with it for a moment, does any little clue come to mind that we could use - even if it feels incomplete?",
    "You're doing your best in a really hard moment, and I don't take that lightly. It's okay if your memory feels foggy or if this part feels uncomfortable. If truly nothing clear is coming up, we can leave this limited for now and you can come back to it later - but if there's even a tiny detail you feel okay sharing, I'm here to help you gently put it into words.",
  ];
  return prompts[safe - 1] ?? prompts[prompts.length - 1];
}

export function JuraChat({ onProgressChange }: JuraChatProps) {
  const [dv100Data, setDv100Data] = useState<any>(structuredClone(initialDv100Data));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [input, setInput] = useState('');
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const [hasStartedFlow, setHasStartedFlow] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const askableSteps = useMemo(
    () => filterAskableSteps(steps, Object.keys(derivedMap)),
    [steps],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('jura-thinking-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'jura-thinking-keyframes';
    style.textContent = `
      @keyframes juraShimmer {
        0% { background-position: 200% 0%; }
        100% { background-position: -200% 0%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    if (!messages.some((msg) => msg.from === 'jura' && !msg.complete)) {
      return;
    }
    const timer = window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.from !== 'jura' || msg.complete) {
            return msg;
          }
          const current = msg.renderedText ?? '';
          if (current.length >= msg.text.length) {
            return { ...msg, renderedText: msg.text, complete: true };
          }
          const nextSpace = msg.text.indexOf(' ', current.length);
          const nextLength = nextSpace === -1 ? msg.text.length : nextSpace + 1;
          const nextText = msg.text.slice(0, nextLength);
          return {
            ...msg,
            renderedText: nextText,
            complete: nextText.length === msg.text.length,
          };
        }),
      );
    }, 80);

    return () => window.clearTimeout(timer);
  }, [messages, setMessages]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const allSteps = await loadFlow();
      if (cancelled) return;
      setSteps(allSteps);

      const askables = filterAskableSteps(allSteps, Object.keys(derivedMap));
      const saved = loadState();
      const savedMessages = coerceMessages(saved.messages);
      const savedData = saved.data ?? structuredClone(initialDv100Data);
      const savedStepId = typeof saved.step === 'string' ? saved.step : null;

      if (savedMessages.length > 0) {
        setDv100Data(savedData);
        const hydratedMessages = savedMessages.map((msg: ChatMessage) => ({
          ...msg,
          renderedText: msg.text,
          complete: true,
        }));
        setMessages(hydratedMessages);
        setHasStartedFlow(Boolean(savedStepId));
        if (savedStepId) {
          const idx = askables.findIndex((stepItem) => stepItem.id === savedStepId);
          setCurrentIndex(idx >= 0 ? idx : 0);
        } else {
          setCurrentIndex(0);
        }
        return;
      }

      setDv100Data(savedData);
      setHasStartedFlow(false);
      const intro: ChatMessage = {
        id: 'jura-intro',
        from: 'jura',
        text: WELCOME_TEXT,
        createdAt: Date.now(),
        renderedText: '',
        complete: false,
      };
      setMessages([intro]);
      saveState({ data: savedData, messages: [intro], step: null });
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const totalSteps = Math.max(askableSteps.length, 1);
    const completedSteps = Math.min(currentIndex, askableSteps.length);
    onProgressChange?.({ completed: completedSteps, total: totalSteps });
  }, [askableSteps.length, currentIndex, onProgressChange]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingQuestion) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      from: 'user',
      text: trimmed,
      createdAt: Date.now(),
      renderedText: trimmed,
      complete: true,
    };

    const baseMessages = [...messages, userMessage];
    setMessages(baseMessages);
    setInput('');

    if (!hasStartedFlow) {
      const firstStep = askableSteps[0];
      if (!firstStep) {
        saveState({ data: dv100Data, messages: baseMessages, step: null });
        return;
      }

      setHasStartedFlow(true);
      setCurrentIndex(0);
      setLoadingQuestion(true);
      try {
        const nextQuestion = await fetchJuraQuestion(firstStep, dv100Data, trimmed);
        const juraMessage: ChatMessage = {
          id: `jura-${firstStep.id}-${Date.now()}`,
          from: 'jura',
          text: nextQuestion,
          createdAt: Date.now(),
          renderedText: '',
          complete: false,
        };
        const updatedMessages = [...baseMessages, juraMessage];
        setMessages(updatedMessages);
        saveState({
          data: dv100Data,
          messages: updatedMessages,
          step: firstStep.id,
        });
      } finally {
        setLoadingQuestion(false);
      }
      return;
    }

    const step = askableSteps[currentIndex];
    if (!step || !step.id) {
      saveState({ data: dv100Data, messages: baseMessages, step: null });
      return;
    }

    setLoadingQuestion(true);

    try {
      let { cleaned, unsure } = await extractAnswerForField(step, trimmed);
      const rule = getFieldRule(step);
      const fieldKey = step.id;
      const isDontKnow = looksLikeIDontKnow(trimmed);
      const isMeta = looksLikeMetaResponse(trimmed);
      const isMissingAnswer = unsure || !cleaned || isDontKnow || isMeta;

      if (rule.required && isMissingAnswer) {
        const attempt = (retryCounts[fieldKey] ?? 0) + 1;
        setRetryCounts((prev) => ({ ...prev, [fieldKey]: attempt }));
        const retryText = getTherapyRetryText(attempt);
        const retryMessage: ChatMessage = {
          id: `retry-${step.id}-${Date.now()}`,
          from: 'jura',
          text: retryText,
          createdAt: Date.now(),
          renderedText: '',
          complete: false,
        };
        const updatedMessages = [...baseMessages, retryMessage];
        setMessages(updatedMessages);
        saveState({
          data: dv100Data,
          messages: updatedMessages,
          step: step.id,
        });
        return;
      }

      let finalAnswer = cleaned;
      if (isMissingAnswer) {
        finalAnswer = '';
      }

      const nextData = { ...dv100Data };
      const schemaPath = pdfToSchemaMap[step.id] ?? step.id;
      const sanitizedAnswer = finalAnswer.trim();
      setAtPath(nextData, schemaPath, sanitizedAnswer);
      const { derived } = applyDerivedFields(nextData, derivedMap);
      Object.entries(derived).forEach(([targetPath, value]) => {
        setAtPath(nextData, targetPath, value);
      });
      setDv100Data(nextData);
      setRetryCounts((prev) => {
        if (!(fieldKey in prev)) {
          return prev;
        }
        const copy = { ...prev };
        delete copy[fieldKey];
        return copy;
      });

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      const nextStep = askableSteps[nextIndex];
      let finalMessages = baseMessages;

      if (nextStep) {
        const nextQuestion = await fetchJuraQuestion(nextStep, nextData, trimmed);
        const juraMessage: ChatMessage = {
          id: `jura-${nextStep.id}-${Date.now()}`,
          from: 'jura',
          text: nextQuestion,
          createdAt: Date.now(),
          renderedText: '',
          complete: false,
        };
        finalMessages = [...baseMessages, juraMessage];
        setMessages(finalMessages);
      } else {
        finalMessages = baseMessages;
      }

      saveState({
        data: nextData,
        messages: finalMessages,
        step: nextStep?.id ?? null,
      });
    } finally {
      setLoadingQuestion(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.from === 'jura'
                  ? 'self-start max-w-3xl text-base leading-relaxed text-slate-100'
                  : 'self-end max-w-xl rounded-3xl bg-[#303030] px-4 py-3 text-white shadow-lg shadow-black/30'
              }
            >
              {message.renderedText ?? message.text}
              {message.from === 'jura' &&
                (!message.renderedText || message.renderedText.length < message.text.length) && (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-white/70 align-middle" />
                )}
            </div>
          ))}
          {loadingQuestion && (
            <div className="self-start text-sm italic text-slate-400">
              <span
                className="inline-block rounded-full px-4 py-2"
                style={{
                  background:
                    'linear-gradient(120deg, rgba(255,255,255,0.05), rgba(255,255,255,0.35), rgba(255,255,255,0.05))',
                  backgroundSize: '200% 100%',
                  animation: 'juraShimmer 1.4s ease-in-out infinite',
                }}
              >
                Jura is thinking…
              </span>
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-800 p-3">
        <input
          className="flex-1 rounded-xl bg-slate-900/70 px-3 py-2 text-slate-50 outline-none placeholder:text-slate-500 disabled:opacity-60"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={loadingQuestion ? 'Waiting for Jura...' : 'Type your answer...'}
          disabled={loadingQuestion}
        />
        <button
          type="submit"
          className="rounded-xl bg-white px-4 py-2 font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loadingQuestion || input.trim().length === 0}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default JuraChat;
