// GET /api/flora/ma-plants  (used by the planner's plant search)
// Uses FloraAPI when FLORA_API_KEY is set; otherwise (or if FloraAPI fails) answers from
// our own Massachusetts native plant list, so the planner always works in a demo.
import { searchMaPlants } from '../_flora.js';
import { localSearch } from '../_localPlants.js';
import { sendJson } from '../_http.js';

export default async function handler(req, res) {
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const key = process.env.FLORA_API_KEY?.trim();
  if (key) {
    try {
      const r = await searchMaPlants(query, key);
      if (r.status === 200 && r.body?.results?.length) return sendJson(res, 200, r.body, { 'Cache-Control': 's-maxage=900' });
    } catch {
      /* fall through to the local list */
    }
  }
  return sendJson(res, 200, localSearch(query));
}
