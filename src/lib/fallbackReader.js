// Backup "reader" used only if Gemini can't be reached (no key, no internet, quota hit).
// It looks for simple keywords so the demo never dead-ends. Gemini does the real work.

export function readNoteLocally(note) {
  const t = (note || '').toLowerCase();
  let height_cm = null;
  const m = t.match(/(\d+(?:\.\d+)?)\s*(cm|centimet(?:er|re)s?|inch(?:es)?|in\b|"|ft|feet|foot)/);
  if (m) {
    const v = parseFloat(m[1]);
    const u = m[2];
    height_cm = /^(in|inch|")/.test(u) ? v * 2.54 : /^(ft|feet|foot)/.test(u) ? v * 30.48 : v;
    height_cm = Math.round(height_cm);
  }
  // true if a word appears and isn't directly negated ("no holes", "not wilting")
  const has = (ws) =>
    ws.some((w) => {
      let i = t.indexOf(w);
      while (i >= 0) {
        if (!/\b(no|not|without|never)\s+(any\s+)?$/.test(t.slice(Math.max(0, i - 14), i))) return true;
        i = t.indexOf(w, i + 1);
      }
      return false;
    });
  const yellow = has(['yellow', 'pale']);
  const brown = has(['brown', 'crispy', 'dried up', 'dead leaves']);
  const wilting = has(['wilt', 'droop', 'limp', 'floppy', 'sagging']);
  const pest_damage = has(['hole', 'chewed', 'bug', 'beetle', 'aphid', 'insect', 'eaten', 'caterpillar']);
  const disease_signs = has(['white powder', 'mildew', 'spots', 'mold', 'rot', 'fuzz']);
  const buds = has(['bud']);
  const blooming = has(['blooming', 'in bloom', 'flowering', 'flowers open', 'open flower']) || (has(['flower', 'blossom']) && !buds);
  const green = has(['green', 'healthy', 'lush', 'glossy']);
  const new_growth = has(['new leaves', 'new growth', 'bushy', 'spreading', 'filling in', 'taller']);

  const features = {
    height_cm,
    leaf_color: brown ? 'browning' : yellow ? 'pale_or_yellowing' : green ? 'healthy_green' : 'not_mentioned',
    flowering: blooming ? 'blooming' : buds ? 'buds' : 'not_mentioned',
    wilting,
    pest_damage,
    disease_signs,
    new_growth,
  };
  let advice = 'Looks healthy. Keep doing what you’re doing!';
  if (wilting) advice = 'Drooping often means thirst. Water deeply at the base early in the morning.';
  else if (brown) advice = 'Crispy brown edges usually mean the soil is too dry. Water slowly at the base.';
  else if (disease_signs) advice = 'Spots or white powder can be a fungus. Remove the worst leaves and give the plant more air.';
  else if (pest_damage) advice = 'Holes in leaves usually mean insects. Check under the leaves in the morning.';
  else if (yellow) advice = 'A few yellow lower leaves are normal. If more turn yellow, let the soil dry a bit between waterings.';
  return { features, summary: 'Read with the simple backup reader (Gemini was not available).', advice, urgent: wilting || disease_signs, confidence: 'low' };
}
