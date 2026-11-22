// GET /api/flora/species/:identifier
import { speciesDetail } from '../../_flora.js';
import { localSpecies } from '../../_localPlants.js';
import { sendJson } from '../../_http.js';

export default async function handler(req, res) {
  const id = String(req.query?.identifier || req.url.split('?')[0].split('/').pop() || '');
  const local = localSpecies(id);
  if (local) return sendJson(res, 200, local);
  const key = process.env.FLORA_API_KEY?.trim();
  if (!key) return sendJson(res, 404, { error: 'Species not found.' });
  const r = await speciesDetail(id, key);
  return sendJson(res, r.status, r.body);
}
