// Backup "reader" used only if Gemini can't be reached (no key, no internet, quota hit).
// It looks for simple keywords so the demo never dead-ends. Gemini does the real work.

export function readNoteLocally(note) {
  const t = (note || '').toLowerCase();
  let height_cm = null;
  const m = t.match(/(\d+(?:\.\d+)?)\s*(cm|centimet(?:er|re)s?|met(?:er|re)s?|m\b|inch(?:es)?|in\b|"|ft|feet|foot)/);
  if (m) {
    const v = parseFloat(m[1]);
    const u = m[2];
    height_cm = /^(in|inch|")/.test(u) ? v * 2.54 : /^(ft|feet|foot)/.test(u) ? v * 30.48 : /^(m\b|met)/.test(u) ? v * 100 : v;
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
  const word = (ws) => ws.some((w) => new RegExp(`\\b${w}\\b`).test(t));
  const yellow = has(['yellow', 'pale']);
  const brown = has(['brown', 'crispy', 'dried up', 'dead leaves']);
  const wilting = has(['wilt', 'droop', 'limp', 'floppy', 'sagging']);
  const pest_damage = has(['hole', 'chewed', 'bug', 'beetle', 'aphid', 'insect', 'eaten', 'caterpillar']);
  const disease_signs = has(['white powder', 'mildew', 'spots', 'mold', 'rot', 'fuzz']);
  const buds = has(['bud']);
  const blooming = has(['blooming', 'in bloom', 'flowering', 'flowers open', 'open flower']) || (has(['flower', 'blossom']) && !buds);
  const green = has(['green', 'healthy', 'lush', 'glossy']) && !word(['neon']);
  const new_growth = has(['new leaves', 'new growth', 'bushy', 'spreading', 'filling in', 'taller']);

  const concerns = [];
  const oddColor = ['neon', 'red', 'purple', 'black', 'white', 'blue', 'orange', 'pink', 'silver'].filter((c) =>
    new RegExp(`\\b${c}\\b[^.]*\\bleaves?\\b|\\bleaves?\\b[^.]*\\b${c}\\b`).test(t),
  );
  if (oddColor.length) concerns.push(`Leaves described as ${oddColor.join(' and ')}, which isn’t a normal healthy leaf color for most plants.`);

  const overall_condition = word(['dead', 'dying', 'died', 'gone', 'rotted'])
    ? 'dying'
    : word(['bad', 'poor', 'terrible', 'awful', 'struggling', 'sad', 'worse', 'sick', 'unhealthy', 'not good', 'not great', 'meh'])
      ? 'poor'
      : word(['ok', 'okay', 'so-so', 'alright', 'could be better'])
        ? 'fair'
        : word(['great', 'thriving', 'excellent', 'amazing', 'wonderful', 'lush', 'perfect', 'beautiful'])
          ? 'excellent'
          : word(['good', 'fine', 'healthy', 'better', 'happy'])
            ? 'good'
            : wilting || brown || disease_signs || pest_damage || yellow || concerns.length
              ? 'fair'
              : green || blooming || buds || new_growth
                ? 'good'
                : 'unknown';
  const vague = height_cm == null && !yellow && !brown && !wilting && !pest_damage && !disease_signs && !buds && !blooming && !green && !new_growth && !concerns.length;

  const features = {
    overall_condition,
    height_cm,
    leaf_color: brown ? 'browning' : yellow ? 'pale_or_yellowing' : green ? 'healthy_green' : 'not_mentioned',
    flowering: blooming ? 'blooming' : buds ? 'buds' : 'not_mentioned',
    wilting,
    pest_damage,
    disease_signs,
    new_growth,
    matches_normal: concerns.length === 0 && !['poor', 'dying'].includes(overall_condition),
    believable: true,
    concerns,
  };
  let advice = overall_condition === 'unknown' ? 'Thanks! Add a few details next time so we can score it accurately.' : 'Looks healthy. Keep doing what you’re doing!';
  if (overall_condition === 'dying') advice = 'Sorry to hear that. Check whether the stems are still green inside; if not, you can mark it as died and pick a replacement.';
  else if (concerns.length) advice = 'Something sounds unusual. Take a close look (or a photo) and check the leaves on both sides.';
  else if (overall_condition === 'poor' && vague) advice = 'Sorry it’s struggling. Check the soil with your finger: water if it’s dry, skip watering if it’s soggy.';
  else if (wilting) advice = 'Drooping often means thirst. Water deeply at the base early in the morning.';
  else if (brown) advice = 'Crispy brown edges usually mean the soil is too dry. Water slowly at the base.';
  else if (disease_signs) advice = 'Spots or white powder can be a fungus. Remove the worst leaves and give the plant more air.';
  else if (pest_damage) advice = 'Holes in leaves usually mean insects. Check under the leaves in the morning.';
  else if (yellow) advice = 'A few yellow lower leaves are normal. If more turn yellow, let the soil dry a bit between waterings.';
  const follow_up_question = vague
    ? overall_condition === 'poor' || overall_condition === 'dying'
      ? 'What looks wrong: drooping, yellow or brown leaves, holes, or spots?'
      : 'Could you add a detail or two, like about how tall it is and the leaf color?'
    : null;
  return {
    features,
    summary: 'Read with the simple backup reader (Gemini was not available).',
    advice,
    urgent: wilting || disease_signs || overall_condition === 'dying',
    confidence: 'low',
    follow_up_question,
  };
}

/**
 * Safety net for any reading (Gemini or backup): a height far beyond what this species can reach
 * is not used, and the gardener is asked to double-check.
 */
export function sanityCheck(result, plant) {
  const f = result.features || (result.features = {});
  const mature = Number(plant?.height_cm) || 0;
  if (f.height_cm != null && mature > 0 && f.height_cm > Math.max(mature * 1.6, mature + 60)) {
    const said = f.height_cm >= 100 ? `${(f.height_cm / 100).toFixed(1)} m` : `${Math.round(f.height_cm)} cm`;
    f.concerns = [...(f.concerns || []), `A height of ${said} isn’t possible for ${plant.common || 'this plant'}, which grows to about ${Math.round(mature)} cm (${Math.round(mature / 2.54)} in).`];
    f.height_cm = null;
    f.believable = false;
    f.matches_normal = false;
    if (Number.isFinite(f.growth_score)) f.growth_score = Math.min(f.growth_score, 60);
    result.follow_up_question = result.follow_up_question || 'Could you double-check the height? Measuring from the soil to the top in inches works best.';
  }
  return result;
}
