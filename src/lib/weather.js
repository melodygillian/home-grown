// Weather for the week + what each day means for THIS garden.
// The rules below are deliberately simple and readable, so they're easy to explain and tweak.

export async function fetchWeather(zip) {
  const r = await fetch(`/api/weather?zip=${encodeURIComponent(zip)}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Weather lookup failed');
  return data;
}

// A summer heat-wave week, for demoing alerts when the real forecast is quiet (or offline).
export function sampleSummerWeek() {
  const start = new Date();
  const rows = [
    [84, 66, 0, 'Sunny', 8], [91, 72, 0, 'Hot and sunny', 9], [94, 74, 5, 'Hot and sunny', 7],
    [93, 73, 10, 'Hot and humid', 6], [88, 70, 30, 'Humid, partly cloudy', 10], [79, 63, 90, 'Rain', 14], [76, 60, 10, 'Partly sunny', 8],
  ];
  return rows.map(([hi, lo, pop, short, windMph], i) => {
    const d = new Date(start.getTime() + i * 86400000);
    return { date: d.toISOString().slice(0, 10), hi, lo, pop, short, windMph };
  });
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function dayLabel(day, i) {
  if (i === 0) return day.tonightOnly ? 'Tonight' : 'Today';
  const d = new Date(day.date + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}
export function fullDate(day) {
  const d = new Date(day.date + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function iconFor(day) {
  const s = (day.short || '').toLowerCase();
  if (/snow|sleet|flurr/.test(s)) return 'snow';
  if (/rain|shower|storm|drizzle/.test(s) || day.pop >= 60) return 'rain';
  if ((day.hi ?? 0) >= 88) return 'hot';
  if (/cloud|fog|overcast/.test(s)) return 'partly';
  return 'sun';
}

const names = (list, n = 3) => {
  const u = [...new Set(list.map((p) => p.common))];
  if (!u.length) return '';
  const shown = u.slice(0, n);
  return shown.length === 1 ? shown[0] : shown.slice(0, -1).join(', ') + ' and ' + shown[shown.length - 1];
};

/**
 * garden.planted = [{ common, sunAt, moistureAt, likes: [moistures], daysSincePlanted, id }]
 * Returns { alerts: [{level, text}], moisture: {label, note}, insects: {level, note}, growth: {label, note} }
 */
export function insightsFor(days, i, garden) {
  const day = days[i];
  const hi = day.hi ?? (day.lo != null ? day.lo + 12 : 60);
  const lo = day.lo ?? hi - 15;
  const month = new Date(day.date + 'T12:00:00').getMonth() + 1;
  const planted = garden.planted;
  const any = planted.length > 0;
  const newOnes = planted.filter((p) => p.daysSincePlanted <= 14);
  const thirsty = planted.filter((p) => p.sunAt === 'full_sun' && p.likes.some((m) => m === 'wet' || m === 'wet_mesic' || m === 'mesic') && !p.likes.includes('dry'));
  const tall = planted.filter((p) => p.heightCm >= 120);
  const mildewProne = planted.filter((p) => /bergamot|bee balm|aster/i.test(p.common));
  const wetLovers = planted.filter((p) => p.likes.includes('wet'));

  let dryRun = 0;
  for (let j = i; j >= 0 && days[j].pop < 20; j--) dryRun++;
  const prevHot = i > 0 && (days[i - 1].hi ?? 0) >= 88;

  // ---- alerts (most important first)
  const alerts = [];
  if (lo <= 28) alerts.push({ level: 'danger', text: `Hard freeze tonight (${lo}°F). Established native plants are fine${newOnes.length ? `, but cover the new plantings (${names(newOnes)}) with a sheet or extra mulch` : ''}.` });
  else if (lo <= 33) alerts.push({ level: 'warn', text: `Frost possible tonight (${lo}°F). Bring potted plants inside${newOnes.length ? ` and cover ${names(newOnes)}` : ''}.` });
  if (hi >= 90) alerts.push({ level: hi >= 93 ? 'danger' : 'warn', text: `Very hot (${hi}°F). Water deeply in the early morning, not at midday${thirsty.length ? `, especially ${names(thirsty)}` : ''}.` });
  else if (dryRun >= 4 && hi >= 75) alerts.push({ level: 'warn', text: `${dryRun} days without rain. Give the garden a long, slow watering${newOnes.length ? `, starting with ${names(newOnes)}` : ''}.` });
  if (day.pop >= 70) alerts.push({ level: 'good', text: `Good soaking rain likely (${day.pop}%). Skip watering today${wetLovers.length ? `; ${names(wetLovers)} will love it` : ''}.` });
  if (day.windMph >= 25) alerts.push({ level: 'warn', text: `Windy (gusts near ${day.windMph} mph).${tall.length ? ` Tall plants like ${names(tall, 2)} may flop; tie them to a stake.` : ' Check that nothing tall is flopping over.'}` });
  if (hi >= 82 && day.pop >= 25 && day.pop < 70 && mildewProne.length) alerts.push({ level: 'warn', text: `Warm and humid: watch for white powder (mildew) on ${names(mildewProne, 2)}.` });

  // ---- soil moisture
  let moisture;
  if (day.pop >= 60) moisture = { label: 'Much wetter', note: 'Rain will refill the soil. No watering needed.' };
  else if (day.pop >= 35) moisture = { label: 'About the same', note: 'Some rain may balance out the drying.' };
  else if (hi >= 88) moisture = { label: 'Drying fast', note: `Sunny spots could lose about ${Math.round(4 + (hi - 85) * 0.6)}% moisture today.` };
  else if (hi >= 70) moisture = { label: 'A little drier', note: 'Sunny spots dry out a few percent. Shady and wet spots stay moist.' };
  else if (hi >= 45) moisture = { label: 'Steady', note: 'Cool weather means the soil stays moist.' };
  else moisture = { label: 'Steady (cold)', note: 'Little water is used in cold weather. Don’t water frozen soil.' };

  // ---- insects
  let insects;
  if (day.pop >= 70) insects = { level: 'Low', note: 'Most insects hide during the rain.' };
  else if (hi < 45) insects = { level: 'None', note: 'Too cold for most insects. They’re resting until spring.' };
  else if (hi < 60) insects = { level: 'Low', note: 'A few early bees on warm afternoons.' };
  else if (hi < 78) insects = { level: 'Medium', note: `Bees and butterflies are active.${month >= 7 && month <= 9 && planted.some((p) => /milkweed|butterfly weed/i.test(p.common)) ? ' Look for monarch caterpillars on the milkweed.' : ''}` };
  else insects = { level: 'High', note: month >= 6 && month <= 8 ? 'Japanese beetles love hot afternoons. Check leaves for holes and pick beetles off in the morning.' : 'Lots of activity. Check under leaves for aphids.' };

  // ---- growth
  let growth;
  if (hi < 45) growth = { label: 'Resting', note: 'Plants are dormant for the cold season. That’s normal!' };
  else if (hi < 58) growth = { label: 'Slow', note: 'Cool weather: plants grow slowly.' };
  else if (hi >= 90) growth = { label: 'On pause', note: 'Too hot to grow. Plants are saving water to stay healthy.' };
  else if (day.pop >= 60 && prevHot) growth = { label: 'Big boost', note: 'Rain after heat gives plants a growth spurt.' };
  else growth = { label: 'Good growing day', note: 'Comfortable weather for new leaves and flowers.' };

  if (!any) {
    growth.note += ' (Mark plants as planted to get advice for your garden.)';
  }
  return { alerts, moisture, insects, growth };
}
