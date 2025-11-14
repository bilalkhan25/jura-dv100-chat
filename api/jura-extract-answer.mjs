import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const ALLOWED_METHOD = 'POST';

function createClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function looksLikeNoFax(input) {
  const lower = input.toLowerCase();
  return (
    lower.includes('no fax') ||
    lower.includes('have no fax') ||
    lower.includes("don't have fax") ||
    lower.includes('do not have fax') ||
    (lower.includes('fax') && (lower.includes('none') || lower.includes("don't") || lower.includes('no number')))
  );
}

function looksLikeSelfRepresented(input) {
  const lower = input.toLowerCase();
  return (
    lower.includes('self representing') ||
    lower.includes('self-representing') ||
    lower.includes('self represented') ||
    lower.includes('self-represented') ||
    lower.includes('represent myself') ||
    lower.includes('pro se')
  );
}

function formatExtractionPrompt(payload) {
  const { fieldId, fieldKind, context, userInput } = payload;

  return `
You are a STRICT factual extractor for DV-100 fields.

User input:
"${userInput}"

Field id: ${fieldId}
Field kind: ${fieldKind}
Context: ${context ?? 'N/A'}

YOUR JOB:
- Extract ONLY the minimal, clean answer that belongs in this field.
- Use ONLY words, numbers, or phrases that appear in the user input.
- NEVER return the whole sentence or emotional content.
- NEVER "fix" spelling or guess missing information.
- NEVER return meta responses like "I have it", "I know it", "I'll share later", etc.

RULES BY FIELD KIND:

1) name:
   - Return a short name (1-3 words) that appears in the user input.
   - Do NOT include emotions or extra commentary.
   - Example output: "Zoho", "Maria Lopez".

2) shortText:
   - Return a SHORT phrase (max 3-6 words) that directly answers the context.
   - Do NOT return full sentences.
   - Example for court: "Contra Costa County Superior Court".
   - If the user only says generic phrases like "I have it", "I know it", or "I'll give it later", return "__UNSURE__".

3) yesNo:
   - If the user clearly means yes, return exactly "yes".
   - If clearly no, return exactly "no".
   - If unclear, return "__UNSURE__".

4) number:
   - Return only the numeric part (e.g., "37").
   - If no clear number, return "__UNSURE__".

5) date:
   - Extract only the date-like part (e.g., "May 2024", "around June 3rd").
   - If no clear date, return "__UNSURE__".

6) longNarrative:
   - Return the user's narrative text, trimmed and lightly cleaned.
   - Do NOT add new facts.

SPECIAL CASE: case numbers
- If the field id or context suggests a case number:
  - Only return a string that includes at least one digit.
  - Accept letters + digits + dashes (e.g., "22FL01234").
  - If the user never provides digits, return "__UNSURE__".

GLOBAL CRITICAL RULE:
- If you cannot confidently extract a clean, field-appropriate answer, return "__UNSURE__".
- Do NOT guess. Do NOT fix spelling. Do NOT invent.
- Return ONLY the final answer text with no quotes or explanation.
`;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
  }
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleExtraction(req, res) {
  if (req.method !== ALLOWED_METHOD) {
    res.setHeader('Allow', ALLOWED_METHOD);
    return sendJson(res, 405, { answer: '', error: 'METHOD_NOT_ALLOWED' });
  }

  const client = createClient();
  if (!client) {
    return sendJson(res, 200, { answer: '', error: 'NO_API_KEY' });
  }

  try {
    const payload = await parseBody(req);
    const { fieldId, fieldKind, context, userInput } = payload || {};
    if (!fieldId || !fieldKind || !userInput) {
      return sendJson(res, 200, { answer: '', unsure: true, error: 'MISSING_FIELDS' });
    }

    const fieldIdLower = typeof fieldId === 'string' ? fieldId.toLowerCase() : '';

    if (fieldIdLower.includes('fax')) {
      if (looksLikeNoFax(userInput)) {
        console.log('[JuraExtract] Detected explicit no fax for field:', fieldId);
        return sendJson(res, 200, { answer: 'No fax', unsure: false });
      }
    }

    if (
      fieldIdLower.includes('represent') ||
      fieldIdLower.includes('attorney') ||
      fieldIdLower.includes('lawyer')
    ) {
      if (looksLikeSelfRepresented(userInput)) {
        console.log('[JuraExtract] Detected self-representation for field:', fieldId);
        return sendJson(res, 200, { answer: 'self-represented', unsure: false });
      }
    }

    const prompt = formatExtractionPrompt(payload);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 40,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict extraction engine. You never invent new facts. You only reuse text from the user input. If unsure, output "__UNSURE__".',
        },
        { role: 'user', content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    let answer = raw;
    let unsure = false;

    if (!answer || answer === '__UNSURE__') {
      unsure = true;
    }

    const contextLower = typeof context === 'string' ? context.toLowerCase() : '';
    const looksCaseLike = fieldIdLower.includes('case') || contextLower.includes('case');

    if (!unsure && looksCaseLike && !/\d/.test(answer)) {
      unsure = true;
    }

    if (unsure) {
      console.log('[JuraExtract] UNSURE for field:', fieldId, 'input:', userInput);
      return sendJson(res, 200, { answer: '__UNSURE__', unsure: true });
    }

    console.log('[JuraExtract] CLEAN ANSWER:', fieldId, '=>', answer);
    return sendJson(res, 200, { answer, unsure: false });
  } catch (err) {
    console.error('Failed to extract answer', err);
    return sendJson(res, 200, { answer: '', unsure: true, error: 'EXTRACTION_ERROR' });
  }
}

export default handleExtraction;
