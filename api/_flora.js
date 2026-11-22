const FLORA_API_BASE = "https://api.floraapi.com";
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1e3;
const SPECIES_CACHE_TTL_MS = 30 * 60 * 1e3;
const MAX_SEARCH_CACHE = 100;
const MAX_SPECIES_CACHE = 500;
const searchCache = /* @__PURE__ */ new Map();
const speciesCache = /* @__PURE__ */ new Map();
function getCached(map, key) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.payload;
}
function setCached(map, maxSize, ttlMs, key, payload) {
  if (map.size >= maxSize) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, { expiresAt: Date.now() + ttlMs, payload });
}
function sanitizeImageUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
function cleanStringArray(val) {
  if (!Array.isArray(val)) return [];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of val) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        out.push(trimmed);
      }
    }
  }
  return out;
}
const CATEGORY_TO_FLORA_HABIT = {
  perennial: "Forb/herb",
  grass: "Graminoid",
  shrub: "Shrub"
};
const CANONICAL_LIGHTS = ["Sun", "Part Shade", "Shade"];
const CANONICAL_MOISTURES = ["Dry", "Moist", "Wet"];
function normalizeFloraItem(summary, detail) {
  const src = detail ?? summary;
  const familyName = src.family_name || (typeof src.family === "string" ? src.family : src.family?.name) || summary.family_name || (typeof summary.family === "string" ? summary.family : summary.family?.name) || "Unknown Family";
  const genusName = src.genus_name || (typeof src.genus === "string" ? src.genus : src.genus?.name) || summary.genus_name || (typeof summary.genus === "string" ? summary.genus : summary.genus?.name) || (src.scientific_name ? src.scientific_name.split(" ")[0] : "Unknown Genus");
  const commonNames = cleanStringArray(
    Array.isArray(src.common_names) && src.common_names.length > 0 ? src.common_names : summary.common_names
  );
  const photoUrl = sanitizeImageUrl(
    src.preferred_image_url ?? src.preferred_image?.url ?? summary.preferred_image_url ?? summary.preferred_image?.url
  );
  const preferredImage = src.preferred_image ?? summary.preferred_image;
  const sourcePageUrl = sanitizeImageUrl(preferredImage?.source_page_url);
  const rawSize = src.size;
  const size = rawSize ? {
    height_min_ft: typeof rawSize.height_min_ft === "number" ? rawSize.height_min_ft : null,
    height_max_ft: typeof rawSize.height_max_ft === "number" ? rawSize.height_max_ft : null,
    spread_min_ft: typeof rawSize.spread_min_ft === "number" ? rawSize.spread_min_ft : null,
    spread_max_ft: typeof rawSize.spread_max_ft === "number" ? rawSize.spread_max_ft : null
  } : null;
  return {
    id: String(src.id ?? summary.id ?? src.usda_symbol ?? src.scientific_name ?? ""),
    scientific_name: typeof (src.scientific_name ?? summary.scientific_name) === "string" ? String(src.scientific_name ?? summary.scientific_name).trim() : "",
    common_names: commonNames,
    family_name: familyName,
    genus_name: genusName,
    nativity: "Native",
    usda_symbol: typeof (src.usda_symbol ?? summary.usda_symbol) === "string" ? String(src.usda_symbol ?? summary.usda_symbol) : void 0,
    photo_url: photoUrl,
    photo_attribution: typeof preferredImage?.attribution === "string" ? preferredImage.attribution : null,
    photo_license: typeof preferredImage?.license === "string" ? preferredImage.license : null,
    photo_source_url: sourcePageUrl,
    light_requirements: cleanStringArray(src.light_requirements),
    soil_moisture: cleanStringArray(src.soil_moisture),
    water_use: cleanStringArray(src.water_use),
    hardiness_zone_min: typeof src.hardiness_zone_min === "string" && src.hardiness_zone_min.trim() ? src.hardiness_zone_min.trim() : null,
    hardiness_zone_max: typeof src.hardiness_zone_max === "string" && src.hardiness_zone_max.trim() ? src.hardiness_zone_max.trim() : null,
    bloom_months: cleanStringArray(src.bloom_months),
    plant_habits: cleanStringArray(src.plant_habits),
    description: typeof src.description === "string" && src.description.trim() ? src.description.trim() : null,
    habitat: typeof src.habitat === "string" && src.habitat.trim() ? src.habitat.trim() : null,
    maintenance_tasks: cleanStringArray(src.maintenance_tasks),
    size
  };
}
async function fetchSpeciesDetail(summary, apiKey) {
  const id = String(summary.id ?? "").trim();
  if (!id || !/^[A-Za-z0-9_-]{1,32}$/.test(id)) {
    return normalizeFloraItem(summary, null);
  }
  const cached = getCached(speciesCache, id);
  if (cached) return cached;
  try {
    const upstream = await fetch(`${FLORA_API_BASE}/v1/species/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    });
    if (!upstream.ok) {
      return normalizeFloraItem(summary, null);
    }
    const detail = await upstream.json();
    const normalized = normalizeFloraItem(summary, detail);
    setCached(speciesCache, MAX_SPECIES_CACHE, SPECIES_CACHE_TTL_MS, id, normalized);
    return normalized;
  } catch {
    return normalizeFloraItem(summary, null);
  }
}
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx]);
    }
  }
  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
function mergeCategoryOrder(canonical, observed) {
  const result = [...canonical];
  const seen = new Set(canonical.map((c) => c.toLowerCase()));
  for (const val of observed) {
    if (!seen.has(val.toLowerCase())) {
      seen.add(val.toLowerCase());
      result.push(val);
    }
  }
  return result;
}
async function searchMaPlants(query, apiKey) {
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  const family = typeof query.family === "string" ? query.family.trim().slice(0, 60) : "";
  const genus = typeof query.genus === "string" ? query.genus.trim().slice(0, 60) : "";
  const lightReq = typeof query.light === "string" ? query.light.trim().slice(0, 40) : "";
  const moistureReq = typeof query.moisture === "string" ? query.moisture.trim().slice(0, 40) : "";
  const category = typeof query.category === "string" ? query.category.trim().toLowerCase() : "";
  const withPhotosOnly = query.has_images !== "false";
  const rawLimit = Number.parseInt(String(query.limit ?? "18"), 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(36, Math.max(1, rawLimit)) : 18;
  const rawOffset = Number.parseInt(String(query.offset ?? "0"), 10);
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;
  const fetchLimit = moistureReq && moistureReq.toLowerCase() !== "all" ? Math.max(40, limit * 3) : limit;
  const params = new URLSearchParams({
    state: "MA",
    native_only: "true",
    exclude_invasive: "true",
    limit: String(Math.min(60, fetchLimit)),
    offset: String(offset)
  });
  if (withPhotosOnly) params.set("has_images", "true");
  if (q) params.set("q", q);
  if (family) params.set("family", family);
  if (genus) params.set("genus", genus);
  if (lightReq && lightReq.toLowerCase() !== "all") {
    params.set("light_requirement", lightReq);
  }
  if (category && CATEGORY_TO_FLORA_HABIT[category]) {
    params.set("plant_habit", CATEGORY_TO_FLORA_HABIT[category]);
  }
  const cacheKey = `ma-enriched:${params.toString()}:moist=${moistureReq.toLowerCase()}:lim=${limit}`;
  const cached = getCached(searchCache, cacheKey);
  if (cached) {
    return { status: 200, body: cached };
  }
  try {
    const upstreamUrl = `${FLORA_API_BASE}/v1/search?${params.toString()}`;
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    });
    if (!upstream.ok) {
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status;
      return { status, body: { configured: true, error: `FloraAPI returned status ${upstream.status}. Verify your FLORA_API_KEY and quota.` } };
    }
    const data = await upstream.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];
    const nativeOnly = rawResults.filter(
      (item) => !item.invasive_alert && (!item.nativity || item.nativity.toLowerCase() === "native")
    );
    const enriched = await mapWithConcurrency(
      nativeOnly,
      10,
      (item) => fetchSpeciesDetail(item, apiKey)
    );
    const observedLights = /* @__PURE__ */ new Set();
    const observedMoistures = /* @__PURE__ */ new Set();
    for (const sp of enriched) {
      sp.light_requirements.forEach((l) => observedLights.add(l));
      sp.soil_moisture.forEach((m) => observedMoistures.add(m));
    }
    let filtered = enriched.filter((sp) => sp.id && sp.scientific_name);
    if (lightReq && lightReq.toLowerCase() !== "all") {
      const targetLight = lightReq.toLowerCase();
      const strictLight = filtered.filter(
        (sp) => sp.light_requirements.some((l) => l.toLowerCase() === targetLight)
      );
      if (strictLight.length > 0) {
        filtered = strictLight;
      }
    }
    if (moistureReq && moistureReq.toLowerCase() !== "all") {
      const targetMoist = moistureReq.toLowerCase();
      filtered = filtered.filter(
        (sp) => sp.soil_moisture.some((m) => m.toLowerCase() === targetMoist)
      );
    }
    const sliced = filtered.slice(0, limit);
    const payload = {
      configured: true,
      state: "MA",
      native_only: true,
      total_count: moistureReq && moistureReq.toLowerCase() !== "all" ? filtered.length : typeof data.total_count === "number" ? data.total_count : sliced.length,
      page_size: sliced.length,
      offset: typeof data.offset === "number" ? data.offset : offset,
      has_more: Boolean(data.has_more),
      light_categories: mergeCategoryOrder(CANONICAL_LIGHTS, observedLights),
      moisture_categories: mergeCategoryOrder(CANONICAL_MOISTURES, observedMoistures),
      results: sliced
    };
    setCached(searchCache, MAX_SEARCH_CACHE, SEARCH_CACHE_TTL_MS, cacheKey, payload);
    return { status: 200, body: payload };
  } catch {
    return { status: 502, body: { configured: true, error: "Unable to reach FloraAPI right now. Please try again in a moment." } };
  }
}
async function speciesDetail(identifierRaw, apiKey) {
  const identifier = String(identifierRaw ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(identifier)) {
    return { status: 400, body: { error: "Invalid species identifier." } };
  }
  const cached = getCached(speciesCache, identifier);
  if (cached) {
    return { status: 200, body: cached };
  }
  try {
    const upstream = await fetch(
      `${FLORA_API_BASE}/v1/species/${encodeURIComponent(identifier)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      }
    );
    if (!upstream.ok) {
      return { status: upstream.status, body: { error: `FloraAPI species lookup returned ${upstream.status}` } };
    }
    const data = await upstream.json();
    const normalized = normalizeFloraItem(data, data);
    setCached(speciesCache, MAX_SPECIES_CACHE, SPECIES_CACHE_TTL_MS, identifier, normalized);
    return { status: 200, body: normalized };
  } catch {
    return { status: 502, body: { error: "Unable to reach FloraAPI." } };
  }
}
export {
  searchMaPlants,
  speciesDetail
};
