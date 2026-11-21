// POST /api/analyze
// Sends the gardener's note (typed or spoken) and an optional photo to Gemini and gets back
// structured features: height, leaf color, flowers, wilting, pests, disease, new growth,
// plus a short summary and advice. The growth score itself is computed in the browser
// (src/lib/growth.js) from these features.
import { readJson, sendJson } from './_http.js';
import { readNoteLocally } from '../src/lib/fallbackReader.js';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    height_cm: { type: 'NUMBER', nullable: true, description: 'Plant height in centimeters if the gardener stated it or it can be estimated reliably; otherwise null. Convert inches/feet to cm.' },
    leaf_color: { type: 'STRING', enum: ['healthy_green', 'pale_or_yellowing', 'browning', 'not_mentioned'] },
    flowering: { type: 'STRING', enum: ['blooming', 'buds', 'none', 'not_mentioned'] },
    wilting: { type: 'BOOLEAN' },
    pest_damage: { type: 'BOOLEAN' },
    disease_signs: { type: 'BOOLEAN' },
    new_growth: { type: 'BOOLEAN' },
    summary: { type: 'STRING', description: 'One friendly sentence describing how the plant is doing.' },
    advice: { type: 'STRING', description: 'One or two short, practical sentences for a beginner or older gardener. No jargon.' },
    urgent: { type: 'BOOLEAN', description: 'True only if the plant needs action within a day or two.' },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
  },
  required: ['height_cm', 'leaf_color', 'flowering', 'wilting', 'pest_damage', 'disease_signs', 'new_growth', 'summary', 'advice', 'urgent', 'confidence'],
};

function buildPrompt(b) {
  const p = b.plant || {};
  return [
    'You are a friendly garden helper for beginner and older gardeners in Massachusetts.',
    'Read the gardener\'s check-in about one plant (and look at the photo if there is one).',
    'Extract only what the note or photo actually shows. Use "not_mentioned" or false when unsure. Do not invent a height.',
    'Negations matter: "no holes" means pest_damage is false.',
    '',
    `Plant: ${p.common} (${p.scientific}), a ${p.type}. Mature height about ${p.height_cm} cm. Usually blooms in months ${JSON.stringify(p.bloom || [])}.`,
    `Planted ${b.days_since_planted} days ago. Expected height today: about ${b.expected_height_cm} cm. Current month: ${b.month}.`,
    `Spot: ${p.sun} sun, ${p.moisture} soil. Weather today: ${b.weather || 'unknown'}.`,
    '',
    `Gardener\'s note: """${(b.note || '').slice(0, 2000)}"""`,
  ].join('\n');
}

async function callGemini(model, key, body) {
  const parts = [{ text: buildPrompt(body) }];
  if (body.image?.data && body.image?.mimeType) parts.push({ inline_data: { mime_type: body.image.mimeType, data: body.image.data } });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    const err = new Error(`Gemini ${model} ${r.status}: ${text.slice(0, 300)}`);
    err.status = r.status;
    throw err;
  }
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map((x) => x.text || '').join('') || '';
  return JSON.parse(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Use POST' });
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: 'Bad JSON' });
  }
  if (!body.note && !body.image) return sendJson(res, 400, { error: 'Add a note or a photo.' });

  const key = process.env.GEMINI_API_KEY;
  const fallback = (reason) => {
    const r = readNoteLocally(body.note || '');
    return sendJson(res, 200, { source: 'fallback', reason, ...r });
  };
  if (!key) return fallback('GEMINI_API_KEY is not set on the server.');

  const models = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);
  let lastErr;
  for (const model of models) {
    try {
      const out = await callGemini(model, key, body);
      const { summary, advice, urgent, confidence, ...features } = out;
      return sendJson(res, 200, { source: 'gemini', model, features, summary, advice, urgent, confidence });
    } catch (err) {
      lastErr = err;
      if (err.status !== 404 && err.status !== 400) break; // only try the next model if this one doesn't exist
    }
  }
  console.error(lastErr);
  return fallback(String(lastErr?.message || lastErr).slice(0, 200));
}
