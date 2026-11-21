// GET /api/weather?zip=02481
// ZIP code -> town + coordinates (zippopotam.us) -> 7-day forecast (US National Weather Service).
// Both services are free and need no key. Runs on the server because NWS asks for a User-Agent.
import { sendJson } from './_http.js';

const UA = 'SmartGardenHackathon/1.0 (student project)';

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json, application/json' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    const e = new Error(`${url} -> ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

export default async function handler(req, res) {
  const zip = String(req.query?.zip || new URL(req.url, 'http://x').searchParams.get('zip') || '').trim();
  if (!/^\d{5}$/.test(zip)) return sendJson(res, 400, { error: 'Please enter a 5-digit ZIP code.' });

  let place;
  try {
    const z = await getJson(`https://api.zippopotam.us/us/${zip}`);
    const p = z.places[0];
    place = { zip, city: p['place name'], state: p['state abbreviation'], lat: Number(p.latitude), lon: Number(p.longitude) };
  } catch (err) {
    return sendJson(res, err.status === 404 ? 404 : 502, { error: err.status === 404 ? 'We couldn’t find that ZIP code.' : 'ZIP lookup failed. Try again.' });
  }

  try {
    const pt = await getJson(`https://api.weather.gov/points/${place.lat.toFixed(4)},${place.lon.toFixed(4)}`);
    const fc = await getJson(pt.properties.forecast);
    const byDate = new Map();
    for (const p of fc.properties.periods) {
      const date = p.startTime.slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, { date, hi: null, lo: null, pop: 0, short: '', windMph: 0, detail: '' });
      const d = byDate.get(date);
      const pop = p.probabilityOfPrecipitation?.value ?? 0;
      d.pop = Math.max(d.pop, pop);
      const wind = (p.windSpeed || '').match(/\d+/g)?.map(Number) || [0];
      d.windMph = Math.max(d.windMph, ...wind);
      if (p.isDaytime) {
        d.hi = p.temperature;
        d.short = p.shortForecast;
        d.detail = p.detailedForecast;
      } else {
        d.lo = p.temperature;
        if (!d.short) {
          d.short = p.shortForecast;
          d.detail = p.detailedForecast;
          d.tonightOnly = true;
        }
      }
    }
    const days = [...byDate.values()].slice(0, 7);
    return sendJson(res, 200, { place, days, source: 'nws', updated: fc.properties.updated || fc.properties.generatedAt }, { 'Cache-Control': 's-maxage=1800' });
  } catch (err) {
    return sendJson(res, 200, { place, days: null, source: 'error', error: 'The weather service didn’t answer. Showing sample weather.' });
  }
}
