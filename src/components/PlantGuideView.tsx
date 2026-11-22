import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import {
  DEFAULT_LIGHT_CATEGORIES,
  DEFAULT_MOISTURE_CATEGORIES,
  fetchMassachusettsNativePlants,
} from '../data/maPlants';
import type { MoistureLevel, NativePlant, PlantCategory, SunLevel } from '../types/garden';
import { PlantAvatar } from './PlantAvatar';

const PAGE_SIZE = 18;

const CATEGORY_LABELS: Record<'all' | PlantCategory, string> = {
  all: 'All Species',
  perennial: 'Wildflowers',
  grass: 'Grasses & Sedges',
  shrub: 'Shrubs',
  fern: 'Ferns',
};

export function PlantGuideView() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<'all' | PlantCategory>('all');
  const [light, setLight] = useState<'all' | SunLevel>('all');
  const [moisture, setMoisture] = useState<'all' | MoistureLevel>('all');
  const [lightOptions, setLightOptions] = useState<string[]>(DEFAULT_LIGHT_CATEGORIES);
  const [moistureOptions, setMoistureOptions] = useState<string[]>(DEFAULT_MOISTURE_CATEGORIES);
  const [offset, setOffset] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [plants, setPlants] = useState<NativePlant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchMassachusettsNativePlants({
      q: debouncedQuery,
      category,
      light,
      moisture,
      limit: PAGE_SIZE,
      offset,
      signal: controller.signal,
    })
      .then((res) => {
        setConfigured(res.configured);
        setPlants(res.plants);
        setTotalCount(res.totalCount);
        setHasMore(res.hasMore);
        setError(res.error ?? null);
        if (res.lightCategories.length > 0) setLightOptions(res.lightCategories);
        if (res.moistureCategories.length > 0) setMoistureOptions(res.moistureCategories);
        setLoading(false);
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return;
        setError('Unable to load Massachusetts native plants.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, category, light, moisture, offset, reloadNonce]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E3E8E4] pb-6">
        <div className="space-y-1">
          <div className="text-xs font-medium text-[#4A5D52]">
            Massachusetts Native Flora · FloraAPI /v1/search + /v1/species/&#123;id&#125;
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#14261C]">
            Native Plant Guide
          </h1>
          <p className="text-sm text-[#4A5D52] max-w-[65ch]">
            Live Massachusetts native species with scientific names, common names, family, genus,
            light requirements, soil moisture, water use, hardiness zones, and representative
            photos.
          </p>
        </div>
        <div className="font-mono text-xs text-[#4A5D52] tabular-nums">
          {loading
            ? 'Loading Massachusetts natives & growing conditions...'
            : `Showing ${plants.length} of ${totalCount.toLocaleString()} native MA species`}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E3E8E4] rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#6B7D72] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search common name, scientific name, family, genus..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F9FAF8] border border-[#D4DDD7] rounded-lg focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div className="lg:col-span-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F2F5F2] rounded-lg overflow-x-auto">
              {(Object.keys(CATEGORY_LABELS) as ('all' | PlantCategory)[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setOffset(0);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    category === cat
                      ? 'bg-white text-[#14261C] shadow-xs'
                      : 'text-[#4A5D52] hover:text-[#14261C]'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F2F5F2] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setLight('all');
                  setOffset(0);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  light === 'all'
                    ? 'bg-white text-[#14261C] shadow-xs'
                    : 'text-[#4A5D52] hover:text-[#14261C]'
                }`}
              >
                Any Light
              </button>
              {lightOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setLight(opt);
                    setOffset(0);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    light === opt
                      ? 'bg-white text-[#14261C] shadow-xs'
                      : 'text-[#4A5D52] hover:text-[#14261C]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F2F5F2] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMoisture('all');
                  setOffset(0);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  moisture === 'all'
                    ? 'bg-white text-[#14261C] shadow-xs'
                    : 'text-[#4A5D52] hover:text-[#14261C]'
                }`}
              >
                Any Moisture
              </button>
              {moistureOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setMoisture(opt);
                    setOffset(0);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    moisture === opt
                      ? 'bg-white text-[#14261C] shadow-xs'
                      : 'text-[#4A5D52] hover:text-[#14261C]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error / Configuration State */}
      {error && (
        <div className="bg-white border border-[#FECACA] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="font-semibold text-sm text-[#991B1B]">
                {configured ? 'FloraAPI Request Issue' : 'FLORA_API_KEY Setup Needed'}
              </h2>
              <p className="text-xs text-[#4A5D52] leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B4332] bg-[#F2F7F4] hover:bg-[#E4EFE8] border border-[#CFE0D5] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#E3E8E4] rounded-xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-40 rounded-lg bg-[#E9EFEA]" />
              <div className="space-y-2">
                <div className="h-4 bg-[#E9EFEA] rounded w-3/4" />
                <div className="h-3 bg-[#F1F5F2] rounded w-1/2" />
                <div className="h-12 bg-[#F4F7F5] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : plants.length === 0 && !error ? (
        <div className="bg-white border border-[#E3E8E4] rounded-xl p-12 text-center space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#14261C]">
            No matching Massachusetts native species found
          </h2>
          <p className="text-sm text-[#4A5D52]">
            Try broadening your search or clearing the light, soil moisture, or habit filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setLight('all');
              setMoisture('all');
              setOffset(0);
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#2D6A4F] rounded-lg cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plants.map((plant) => (
              <article
                key={plant.id}
                className="bg-white border border-[#E3E8E4] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[16/10] w-full bg-[#F3F7F4] border-b border-[#EEF2EF] overflow-hidden relative flex items-center justify-center">
                    {plant.photoUrl ? (
                      <img
                        src={plant.photoUrl}
                        alt={`${plant.name} (${plant.sci})`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PlantAvatar plant={plant} size={72} />
                    )}
                    {plant.photoAttribution && (
                      <div className="absolute bottom-2 right-2 bg-[#0D1B14]/70 text-white/90 text-[10px] px-2 py-0.5 rounded max-w-[85%] truncate">
                        Photo: {plant.photoAttribution}
                        {plant.photoLicense ? ` (${plant.photoLicense.toUpperCase()})` : ''}
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="space-y-0.5">
                      <div className="text-xs text-[#2D6A4F] font-medium">
                        Native (MA) · <span className="font-mono">{plant.hardinessRange}</span>
                      </div>
                      <h2 className="font-display text-lg font-semibold text-[#14261C] leading-snug">
                        {plant.name}
                      </h2>
                      <div className="text-xs italic text-[#5B6E62]">{plant.sci}</div>
                    </div>

                    {/* Description including Water Use */}
                    <p className="text-xs text-[#35473C] leading-relaxed">{plant.description}</p>

                    {/* Taxonomy & Growing Conditions */}
                    <div className="text-xs text-[#4A5D52] space-y-1.5 pt-2 border-t border-[#EEF2EF]">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          <strong className="text-[#14261C]">Family:</strong> {plant.family}
                        </span>
                        <span>
                          <strong className="text-[#14261C]">Genus:</strong>{' '}
                          <span className="italic">{plant.genus}</span>
                        </span>
                      </div>
                      <div>
                        <strong className="text-[#14261C]">Light:</strong>{' '}
                        {plant.lightRequirements.length > 0
                          ? plant.lightRequirements.join(', ')
                          : 'Not listed'}{' '}
                        · <strong className="text-[#14261C]">Soil Moisture:</strong>{' '}
                        {plant.soilMoisture.length > 0
                          ? plant.soilMoisture.join(', ')
                          : 'Not listed'}
                      </div>
                      {plant.commonNames.length > 1 && (
                        <div>
                          <strong className="text-[#14261C]">Also known as:</strong>{' '}
                          {plant.commonNames.slice(1, 5).join(', ')}
                        </div>
                      )}
                      <div className="font-mono tabular-nums">
                        Spread {plant.spreadFt} ft · Height {plant.heightFt}
                        {plant.bloom !== 'Seasonal' ? ` · Bloom ${plant.bloom}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {(offset > 0 || hasMore) && (
            <div className="flex items-center justify-between pt-4 border-t border-[#E3E8E4]">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#14261C] bg-white border border-[#D4DDD7] rounded-lg hover:bg-[#F2F5F2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="font-mono text-xs text-[#4A5D52] tabular-nums">
                Showing {offset + 1}–{Math.min(totalCount, offset + plants.length)} of{' '}
                {totalCount.toLocaleString()}
              </span>

              <button
                type="button"
                disabled={!hasMore}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#14261C] bg-white border border-[#D4DDD7] rounded-lg hover:bg-[#F2F5F2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
