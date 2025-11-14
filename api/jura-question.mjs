import { readFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';

const STYLE_GUIDE_PATH = path.join(process.cwd(), 'src', 'config', 'juraStyleGuide.txt');
const FALLBACK_RESPONSE = 'Could you share more about this step?';
const ALLOWED_METHOD = 'POST';

let cachedGuide = null;

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

async function loadStyleGuide() {
  if (cachedGuide) {
    return cachedGuide;
  }
  cachedGuide = await readFile(STYLE_GUIDE_PATH, 'utf8');
  return cachedGuide;
}

async function parseBody(req) {
  const existingBody = req.body;
  if (existingBody) {
    return typeof existingBody === 'string' ? JSON.parse(existingBody) : existingBody;
  }

  let raw = '';
  for await (const chunk of req) {
    raw += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
  }

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function formatPrompt(payload) {
  const { currentFieldId, context, answers, lastUserMessage } = payload;
  const answerSnapshot = JSON.stringify(answers ?? {}, null, 2);
  const last = (lastUserMessage ?? '').trim();
  return [
    `Current field id: ${currentFieldId ?? 'unknown'}`,
    `Context hint: ${context ?? 'N/A'}`,
    'Known answers (JSON):',
    answerSnapshot,
    '',
    last
      ? `The user just said (verbatim): "${last}"`
      : 'The user has not shared anything yet for this field.',
    '',
    'TASK:',
    '- First, respond directly to what the user just said with emotional intelligence (2-5 sentences).',
    '- Mention at least one specific detail or emotion they expressed, in your own words.',
    '- Normalize their reaction and reassure them.',
    '- Then, in 1-3 sentences, gently ask ONE clear question that will help them answer ONLY this field.',
    '- Make it feel like a natural conversation, not a form.',
    '',
    'CONSTRAINTS:',
    '- Do not repeat the user\'s sentence word-for-word.',
    '- Do not mention forms, fields, or DV-100.',
    '- Do not be robotic or overly formal.',
  ].join('\n');
}

function sendText(res, status, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(text);
}

async function generateQuestion(payload) {
  const client = createClient();
  if (!client) {
    return FALLBACK_RESPONSE;
  }

  const styleGuide = await loadStyleGuide();
  const userPrompt = formatPrompt(payload);
  const baseSystemMessage = `
You are Jura — a warm, trauma-aware companion helping someone complete a domestic violence restraining order request in California.

The person you're talking to may feel hurt, betrayed, unsafe, angry, numb, or overwhelmed. They might say things like "everyone treats me like shit" or "I can't believe this is happening."

Your job in each reply is to:
1) Show them you really heard what they said, in a deep and specific way.
2) Normalize their feelings and offer calm reassurance.
3) Then gently connect to ONE small question that moves the process forward.

STYLE:
- Speak like ChatGPT would in a caring, thoughtful conversation.
- Use 3-8 sentences when needed; it's okay to be a bit longer if it feels natural.
- Reflect their feelings in your own words (do NOT just say "It sounds like...").
- Reference at least one concrete detail or theme from what they wrote.
- Be steady, calm, and non-judgmental.

DO NOT:
- Mention forms, fields, schemas, or DV-100.
- Use robotic phrases like "Please provide" or "What is".
- Give legal advice or strategies.
- Sound like a script; vary your language and phrasing.

Your reply should feel like a real person sitting next to them, calmly talking through the next small step with warmth and patience.
`.trim();
  console.log('[JuraQuestion] field:', payload.currentFieldId);

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 1.1,
      max_tokens: 260,
      messages: [
        { role: 'system', content: baseSystemMessage },
        ...(styleGuide ? [{ role: 'system', content: styleGuide }] : []),
        { role: 'user', content: userPrompt },
      ],
    });

    const message = completion.choices[0]?.message?.content?.trim();
    if (message) {
      console.log('[JuraQuestion] lastUserMessage:', payload.lastUserMessage);
      console.log('[JuraQuestion] question:', message);
      return message;
    }
  } catch (error) {
    console.error('Failed to generate Jura question', error);
  }

  return FALLBACK_RESPONSE;
}

export default async function handler(req, res) {
  if (req.method !== ALLOWED_METHOD) {
    res.setHeader('Allow', ALLOWED_METHOD);
    sendText(res, 405, FALLBACK_RESPONSE);
    return;
  }

  try {
    const payload = await parseBody(req);
    const question = await generateQuestion(payload);
    sendText(res, 200, question);
  } catch {
    sendText(res, 200, FALLBACK_RESPONSE);
  }
}
