// POST /api/analyze
// Sends the gardener's check-in (typed or spoken note, optional photo) to Gemini.
// Gemini compares the plant with a NORMAL, HEALTHY plant of the same species at the same age and
// returns a growth score plus what it saw (height, leaves, flowers, problems) and anything that
// isn't normal. A server-side safety check rejects impossible measurements.
import { readJson, sendJson } from './_http.js';
import { readNoteLocally, sanityCheck } from '../src/lib/fallbackReader.js';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    believable: {
      type: 'BOOLEAN',
      description: 'False if anything reported is physically impossible or wildly implausible for this species (for example a height far above its maximum).',
    },
    matches_normal: {
      type: 'BOOLEAN',
      description: 'True only if everything reported looks like a normal, healthy plant of this species at this time of year.',
    },
    concerns: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        'Each observation that differs from a normal, healthy plant of this species, in plain words (e.g. "Neon green and red leaves are not normal for butterfly weed, whose leaves are medium green"). Empty if nothing is unusual.',
    },
    growth_score: {
      type: 'INTEGER',
      description:
        'Your score from 0 to 130 for this plant compared with a normal, healthy plant of the same species at the same age. 100 = a fully grown, healthy mature plant. The expected score for a healthy plant today is given in the prompt: a plant doing exactly as expected gets about that number. Lower it for anything abnormal (odd leaf colors, pests, disease, wilting, poor overall condition, a size well below normal). Ignore impossible measurements when scoring. If the note is vague, stay near the expected score but adjust for the gardener\'s tone.',
    },
    overall_condition: {
      type: 'STRING',
      enum: ['excellent', 'good', 'fair', 'poor', 'dying', 'unknown'],
      description:
        "Overall health judged from the gardener's words, tone and the details. 'bad', 'not great', 'struggling' = poor. 'dead', 'dying' = dying. 'ok', 'so-so' = fair. 'fine', 'healthy' = good. 'great', 'thriving' = excellent. Abnormal details lower it. unknown ONLY if nothing about health is said.",
    },
    follow_up_question: {
      type: 'STRING',
      nullable: true,
      description:
        'If the note is vague, missing key details, or contains something implausible, ONE short, friendly question to ask the gardener. Otherwise null.',
    },
    height_cm: {
      type: 'NUMBER',
      nullable: true,
      description: 'Height in centimeters if stated or clearly visible; convert inches/feet/meters. Null if not stated OR if impossible for this species.',
    },
    leaf_color: { type: 'STRING', enum: ['healthy_green', 'pale_or_yellowing', 'browning', 'abnormal_color', 'not_mentioned'] },
    flowering: { type: 'STRING', enum: ['blooming', 'buds', 'none', 'not_mentioned'] },
    wilting: { type: 'BOOLEAN' },
    pest_damage: { type: 'BOOLEAN' },
    disease_signs: { type: 'BOOLEAN' },
    new_growth: { type: 'BOOLEAN' },
    summary: { type: 'STRING', description: 'One honest, friendly sentence on how the plant is doing compared with a normal healthy one.' },
    advice: { type: 'STRING', description: 'One or two short, practical sentences for a beginner or older gardener. No jargon.' },
    urgent: { type: 'BOOLEAN', description: 'True only if the plant needs action within a day or two.' },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
  },
  required: [
    'believable', 'matches_normal', 'concerns', 'growth_score', 'overall_condition', 'follow_up_question', 'height_cm',
    'leaf_color', 'flowering', 'wilting', 'pest_damage', 'disease_signs', 'new_growth', 'summary', 'advice', 'urgent', 'confidence',
  ],
};

function buildPrompt(b) {
  const p = b.plant || {};
  const expectedScore = p.height_cm && b.expected_height_cm ? Math.round((b.expected_height_cm / p.height_cm) * 100) : null;
  return [
    'You are an expert, honest garden helper for beginner and older gardeners in Massachusetts.',
    'Compare the gardener\'s check-in (and photo, if any) with what a NORMAL, HEALTHY plant of this species looks like at this age and time of year.',
    'Use your own botanical knowledge of this species: its normal leaf color and shape, flower color and season, and maximum height.',
    'Rules:',
    '- Never assume the plant is healthy. Anything unusual (strange leaf colors, impossible sizes, odd shapes) must go in concerns and lower growth_score.',
    '- If a measurement is impossible for this species (e.g. 10 meters for a 2-foot plant), set believable=false, height_cm=null, add a concern, and ask a follow_up_question to double-check.',
    '- Vague negative notes ("bad", "not great") mean overall_condition=poor, even without details. A vague note is never good news.',
    '- Only use leaf_color "healthy_green" if healthy, normal-colored leaves are actually described or shown. Use "abnormal_color" for colors that are not normal for this species.',
    '- Negations matter: "no holes" means pest_damage is false.',
    '- summary and advice: plain, warm, honest language. If something is wrong or doesn\'t add up, say so and suggest the most likely fix.',
    '',
    `Plant: ${p.common} (${p.scientific}), a ${p.type}. A healthy mature plant is about ${p.height_cm} cm (${Math.round((p.height_cm || 0) / 2.54)} in) tall. Usually blooms in months ${JSON.stringify(p.bloom || [])}.`,
    `Planted ${b.days_since_planted} days ago. A healthy plant would be about ${b.expected_height_cm} cm tall today${expectedScore != null ? `, so the expected growth_score today is about ${expectedScore}` : ''}.`,
    `Current month: ${b.month}. Spot: ${p.sun} sun, ${p.moisture} soil. Weather today: ${b.weather || 'unknown'}.`,
    '',
    `Gardener's note: """${(b.note || '').slice(0, 2000)}"""`,
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
    signal: AbortSignal.timeout(20000),
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

/** Put concerns and the follow-up question into the advice text so every version of the page shows them. */
function finish(res, body, result) {
  sanityCheck(result, body.plant);
  const f = result.features;
  if (f.leaf_color === 'abnormal_color') f.leaf_color = 'not_mentioned';
  const bits = [];
  if (f.concerns?.length) bits.push('Not normal: ' + f.concerns.join(' '));
  if (result.advice) bits.push(result.advice);
  if (result.follow_up_question) bits.push('To score it accurately: ' + result.follow_up_question);
  result.advice = bits.join(' ');
  result.follow_up_question = null;
  return sendJson(res, 200, result);
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
    console.log('\n[Backup reader used]', reason);
    return finish(res, body, { source: 'fallback', reason, ...readNoteLocally(body.note || '') });
  };
  if (!key) return fallback('GEMINI_API_KEY is not set on the server.');

  // If one model is busy (Google returns 503 "high demand" or 429), try the next one.
  const models = [...new Set([process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'].filter(Boolean))];
  let lastErr;
  for (const model of models) {
    try {
      const started = Date.now();
      const out = await callGemini(model, key, body);
      console.log(`\n[Gemini ${model}] ${((Date.now() - started) / 1000).toFixed(1)}s · note: "${(body.note || '').slice(0, 80)}"${body.image ? ' + photo' : ''}\n→`, out);
      const { summary, advice, urgent, confidence, follow_up_question, ...features } = out;
      return finish(res, body, { source: 'gemini', model, features, summary, advice, urgent, confidence, follow_up_question });
    } catch (err) {
      lastErr = err;
      if (err.name === 'TimeoutError') err.message = `Gemini ${model} took longer than 20 seconds.`;
      console.log(`\n[Gemini ${model} failed, trying the next model]`, String(err.message).slice(0, 160));
      // A wrong or blocked API key won't work with any model, so stop early.
      if (err.status === 401 || err.status === 403) break;
    }
  }
  console.error(lastErr);
  return fallback(String(lastErr?.message || lastErr).slice(0, 200));
}
