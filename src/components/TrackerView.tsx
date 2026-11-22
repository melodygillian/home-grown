import { useFitCell } from '../utils/useFitCell';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  CloudRain,
  CloudSnow,
  CloudSun,
  Lock,
  Map as MapIcon,
  Mic,
  Plus,
  Sparkles,
  Sun,
  ThermometerSun,
  X,
} from 'lucide-react';
import type { GardenProject, GardenTracking, NativePlant, PlantPlacement } from '../types/garden';
import { PlantAvatar } from './PlantAvatar';
import { fetchMassachusettsNativePlants, registerPlants } from '../data/maPlants';
import { getConflictDetails } from '../utils/spatial';
import {
  trackingOf,
  plantStates,
  stakesFor,
  readingsFor,
  weatherContext,
  cellAt,
  speciesFor,
  type PlantState,
  type TrackSpecies,
} from '../utils/tracking';
import { expectedScore, scoreFromFeatures, localIso } from '../lib/growth.js';
import { fetchWeather, sampleSummerWeek, insightsFor, dayLabel, fullDate, iconFor } from '../lib/weather.js';
import { analyzeCheckIn, shrinkImage } from '../lib/analyze.js';
import { useSpeech } from '../lib/useSpeech.js';

interface TrackerViewProps {
  project: GardenProject;
  onUpdateProject: (updater: (proj: GardenProject) => GardenProject) => void;
  onEditMap: () => void;
  onOpenChecklist: () => void;
  onBackToDashboard: () => void;
}

const STATUS: Record<string, { label: string; ring: string; glow: string; pill: string }> = {
  thriving: { label: 'Thriving', ring: '#15803D', glow: 'rgba(21,128,61,0.35)', pill: 'bg-[#DCFCE7] text-[#14532D]' },
  ontrack: { label: 'On track', ring: '#2563EB', glow: 'rgba(37,99,235,0.30)', pill: 'bg-[#DBEAFE] text-[#1E3A8A]' },
  attention: { label: 'Needs attention', ring: '#D97706', glow: 'rgba(217,119,6,0.38)', pill: 'bg-[#FEF3C7] text-[#78350F]' },
  risk: { label: 'At risk', ring: '#DC2626', glow: 'rgba(220,38,38,0.35)', pill: 'bg-[#FEE2E2] text-[#7F1D1D]' },
  planned: { label: 'Planned · not planted yet', ring: '#94A3B8', glow: 'transparent', pill: 'bg-[#F1F5F9] text-[#334155]' },
};

const DAY = 86400000;
const logDate = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function lightOverlay(val: string) {
  const l = val.trim().toLowerCase();
  if (l === 'sun' || l === 'full sun') return 'overlay-light-sun';
  if (l.includes('part')) return 'overlay-light-part-shade';
  if (l.includes('shade')) return 'overlay-light-shade';
  return 'overlay-light-other';
}
function moistureOverlay(val: string) {
  const l = val.trim().toLowerCase();
  if (l === 'dry') return 'overlay-moist-dry';
  if (l === 'moist' || l === 'average' || l === 'medium') return 'overlay-moist-moist';
  if (l === 'wet') return 'overlay-moist-wet';
  return 'overlay-moist-other';
}

export function TrackerView({ project, onUpdateProject, onEditMap, onOpenChecklist, onBackToDashboard }: TrackerViewProps) {
  const tracking = trackingOf(project);
  const [selected, setSelected] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<'plants' | 'sun' | 'moisture'>('plants');
  const [weather, setWeather] = useState<{ days: any[] | null; loading: boolean; note: string }>({ days: null, loading: false, note: '' });
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!tracking.zip) return;
    let alive = true;
    setWeather((w) => ({ ...w, loading: true }));
    fetchWeather(tracking.zip)
      .then((d: any) => {
        if (!alive) return;
        setWeather({ days: d.days, loading: false, note: d.days ? '' : d.error || 'Forecast unavailable' });
        if (d.place && !tracking.place) updateTracking((t) => ({ ...t, place: { city: d.place.city, state: d.place.state } }));
      })
      .catch((e: Error) => alive && setWeather({ days: null, loading: false, note: e.message }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking.zip]);

  const states = useMemo(() => plantStates(project, now), [project, now]);
  const stakes = useMemo(() => stakesFor(project), [project]);
  const useSample = Boolean(tracking.sampleWeather) || (!weather.loading && !weather.days);
  const days = useSample ? sampleSummerWeek() : weather.days;
  const planted = states.filter((s) => s.planted);
  const counts = states.reduce<Record<string, number>>((a, s) => ((a[s.status] = (a[s.status] || 0) + 1), a), {});

  function updateTracking(fn: (t: GardenTracking) => GardenTracking, logEntry?: { plant: string; action: string; notes: string }) {
    onUpdateProject((p) => {
      const next = fn(trackingOf(p));
      const logs = logEntry ? [{ id: 'log_' + Date.now(), date: logDate(), ...logEntry }, ...p.logs] : p.logs;
      return { ...p, tracking: next, logs };
    });
  }

  const selState = states.find((s) => s.placement.uid === selected) || null;
  const selEmpty = tracking.empty.find((e) => 'empty:' + e.id === selected) || null;

  // ---------- actions ----------
  function plantIt(s: PlantState, iso: string) {
    updateTracking(
      (t) => ({ ...t, plants: { ...t.plants, [s.placement.uid]: { status: 'planted', plantedOn: iso, logs: [], analysis: null } } }),
      { plant: s.plant.name, action: 'Planted', notes: `Marked as planted (${iso}). Growth tracking started.` },
    );
  }

  async function checkIn(s: PlantState, payload: { note: string; image: any }) {
    setBusy(true);
    const expected = expectedScore(s.species, s.today, s.base);
    const res: any = await analyzeCheckIn({
      ...payload,
      plant: {
        common: s.plant.name,
        scientific: s.plant.sci,
        type: s.species.type,
        height_cm: s.species.height_cm,
        bloom: s.species.bloom,
        sun: s.cell.sun,
        moisture: s.cell.moisture,
      },
      days_since_planted: s.today,
      expected_height_cm: Math.round((expected / 100) * s.species.height_cm),
      month: new Date().toLocaleString('en-US', { month: 'long' }),
      weather: days?.[0] ? `${days[0].short}, high ${days[0].hi ?? '?'}°F, low ${days[0].lo ?? '?'}°F` : 'unknown',
    });
    const track = tracking.plants[s.placement.uid];
    const prevH = [...(track?.logs || [])].reverse().find((l) => l.heightPct != null)?.heightPct ?? null;
    const { score, heightPct } = scoreFromFeatures(s.species, res.features || {}, prevH, expected);
    updateTracking(
      (t) => {
        const cur = t.plants[s.placement.uid];
        const logs = (cur.logs || []).filter((l) => l.day !== s.today);
        logs.push({ day: s.today, score, heightPct, source: 'note', features: res.features, note: payload.note });
        return { ...t, plants: { ...t.plants, [s.placement.uid]: { ...cur, logs, analysis: { ...res, score } } } };
      },
      { plant: s.plant.name, action: 'Growth check-in', notes: (res.summary || payload.note || 'Photo check-in').slice(0, 160) },
    );
    setBusy(false);
    return true;
  }

  function removePlant(s: PlantState, reason: 'natural' | 'early') {
    const spot = { id: 'e' + Date.now(), cx: s.placement.cx, cy: s.placement.cy, spreadFt: s.plant.spreadFt, was: s.plant.name };
    const track = tracking.plants[s.placement.uid];
    onUpdateProject((p) => {
      const t = trackingOf(p);
      const plants = { ...t.plants };
      delete plants[s.placement.uid];
      return {
        ...p,
        placements: p.placements.filter((x) => x.uid !== s.placement.uid),
        tracking: {
          ...t,
          plants,
          empty: [...t.empty, spot],
          journal: [...t.journal, { plant: s.plant.name, sci: s.plant.sci, plantedOn: track?.plantedOn || null, removedOn: localIso(), reason }],
        },
        logs: [
          { id: 'log_' + Date.now(), date: logDate(), plant: s.plant.name, action: 'Removed', notes: reason === 'natural' ? 'Lived out its natural life.' : 'Died early (weather, pests or disease).' },
          ...p.logs,
        ],
      };
    });
    setSelected('empty:' + spot.id);
  }

  function fillSpot(spotId: string, plant: NativePlant) {
    registerPlants([plant]);
    const uid = `p_${Date.now()}`;
    onUpdateProject((p) => {
      const t = trackingOf(p);
      const spot = t.empty.find((e) => e.id === spotId);
      if (!spot) return p;
      const placement: PlantPlacement = { uid, plantId: plant.id, cx: spot.cx, cy: spot.cy, plantSnapshot: plant };
      return {
        ...p,
        placements: [...p.placements, placement],
        tracking: { ...t, empty: t.empty.filter((e) => e.id !== spotId) },
        logs: [{ id: 'log_' + Date.now(), date: logDate(), plant: plant.name, action: 'Replacement chosen', notes: `Replacing ${spot.was}.` }, ...p.logs],
      };
    });
    setSelected(uid);
  }

  const placeLabel = tracking.place ? `${tracking.place.city}, ${tracking.place.state}` : tracking.zip ? `ZIP ${tracking.zip}` : '';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4 text-[15px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E6E2CC] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-[#4E6656]">
            <button type="button" onClick={onBackToDashboard} className="inline-flex items-center gap-1 hover:text-[#22392A] cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> My Gardens
            </button>
            <span aria-hidden="true">/</span>
            <span>Track My Garden</span>
          </div>
          <h1 className="font-display text-3xl font-medium text-[#30573C]">{project.name}</h1>
          <p className="text-base text-[#4E6656]">
            {placeLabel && <>{placeLabel} · </>}
            <span className="font-semibold text-[#22392A]">{planted.length} of {states.length}</span> plants in the ground ·{' '}
            <span className="font-mono tabular-nums">{project.width} × {project.height} ft</span> · Zone {project.zone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onEditMap} className="inline-flex items-center gap-2 px-4 py-3 text-base font-semibold text-[#30573C] bg-white hover:bg-[#F3F1DC] border border-[#CCC8A8] rounded-full cursor-pointer">
            <MapIcon className="w-5 h-5" /> Edit garden map
          </button>
          <button type="button" onClick={onOpenChecklist} className="inline-flex items-center gap-2 px-4 py-3 text-base font-semibold text-[#30573C] bg-white hover:bg-[#F3F1DC] border border-[#CCC8A8] rounded-full cursor-pointer">
            <ClipboardList className="w-5 h-5" /> Seasonal care checklist
          </button>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map */}
        <section className="lg:col-span-7 bg-white border border-[#E6E2CC] rounded-3xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-[#22392A]">Your garden map</h2>
            <div className="flex bg-[#F2F5F3] rounded-lg p-1 gap-1" role="group" aria-label="Map view">
              {(
                [
                  ['plants', 'Plants'],
                  ['sun', 'Sunlight'],
                  ['moisture', 'Moisture'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={overlay === k}
                  onClick={() => setOverlay(k)}
                  className={`px-3.5 py-2 text-sm font-semibold rounded-md cursor-pointer ${overlay === k ? 'bg-white text-[#22392A] shadow-sm' : 'text-[#4E6656] hover:text-[#22392A]'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {planted.length === 0 && states.length > 0 && (
            <p className="flex items-center gap-2 text-[15px] text-[#3F5747] -mt-1">
              <Lock className="w-4 h-4 text-[#30573C] shrink-0" />
              <span>
                <strong>Faded plants aren’t planted yet.</strong> Tap one once it’s in the ground.
              </span>
            </p>
          )}
          <TrackMap
            project={project}
            states={states}
            empty={tracking.empty}
            stakes={stakes}
            overlay={overlay}
            selected={selected}
            onSelect={setSelected}
          />
          <Legend overlay={overlay} />
        </section>

        {/* Side panel */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[92px]">
        {!tracking.zip && <ZipCard onSave={(zip, place) => updateTracking((t) => ({ ...t, zip, place }))} />}
        <aside className="bg-white border border-[#E6E2CC] rounded-3xl p-5">
          {selState ? (
            <PlantPanel
              key={selState.placement.uid + (selState.planted ? 'p' : 'n')}
              s={selState}
              project={project}
              track={tracking.plants[selState.placement.uid]}
              today={days?.[0]}
              now={now}
              busy={busy}
              onClose={() => setSelected(null)}
              onPlant={(iso) => plantIt(selState, iso)}
              onCheckIn={(payload) => checkIn(selState, payload)}
              onRemove={(reason) => removePlant(selState, reason)}
            />
          ) : selEmpty ? (
            <EmptySpotPanel key={selEmpty.id} project={project} spot={selEmpty} onClose={() => setSelected(null)} onPick={(pl) => fillSpot(selEmpty.id, pl)} />
          ) : (
            <Summary states={states} counts={counts} onSelect={setSelected} />
          )}
        </aside>
        </div>
      </div>

      <WeatherSection
        days={days}
        loading={weather.loading && !tracking.sampleWeather}
        place={tracking.place?.city || ''}
        ctx={weatherContext(states)}
        sample={useSample}
        note={!tracking.sampleWeather && weather.note && tracking.zip ? weather.note : ''}
        noZip={!tracking.zip}
        onToggleSample={() => updateTracking((t) => ({ ...t, sampleWeather: !t.sampleWeather }))}
        forcedSample={Boolean(tracking.sampleWeather)}
      />

      <p className="text-xs text-[#4E6656] text-center">
        Sensor stake readings are simulated for this demo · Check-ins are read by Google Gemini · Weather from the US National Weather Service
      </p>
    </div>
  );
}

// ============================== map ==============================
function TrackMap({ project, states, empty, stakes, overlay, selected, onSelect }: any) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cell = useFitCell(wrapRef, project.width, project.height, { min: 24, max: 64, bottomGap: 110 });

  return (
    <div ref={wrapRef} className="rounded-3xl bg-[#FFFDF3] p-4 border-[3px] border-[#30573C] overflow-x-auto">
      <div className="inline-block">
        <div className="flex items-center pl-7 mb-1.5">
          {Array.from({ length: project.width }, (_, c) => (
            <div key={c} style={{ width: cell }} className="text-center font-mono text-[10px] text-[#30573C] tabular-nums select-none">
              {cell >= 34 || (c + 1) % 2 === 0 ? `${c + 1}ft` : ''}
            </div>
          ))}
        </div>
        <div className="flex items-start">
          <div className="flex flex-col pr-1.5">
            {Array.from({ length: project.height }, (_, r) => (
              <div key={r} style={{ height: cell }} className="w-5 flex items-center justify-end font-mono text-[10px] text-[#30573C] tabular-nums select-none">
                {r + 1}
              </div>
            ))}
          </div>
          <div
            style={{
              width: project.width * cell,
              height: project.height * cell,
              gridTemplateColumns: `repeat(${project.width}, ${cell}px)`,
              gridTemplateRows: `repeat(${project.height}, ${cell}px)`,
            }}
            className="relative grid backyard-turf border border-white/40 select-none"
          >
            {project.cells.map((row: any[], r: number) =>
              row.map((c: any, x: number) => (
                <div key={`${x}-${r}`} className="relative border border-dashed border-white/20" title={`${c.sun}, ${c.moisture}`}>
                  {overlay === 'sun' && <div className={`absolute inset-0 ${lightOverlay(c.sun)}`} />}
                  {overlay === 'moisture' && <div className={`absolute inset-0 ${moistureOverlay(c.moisture)}`} />}
                </div>
              )),
            )}

            {overlay === 'plants' &&
              stakes.map((s: any) => (
                <div key={s.id} className="absolute z-10 pointer-events-none" style={{ left: s.x * cell - 7, top: s.y * cell - 16 }} title={s.name}>
                  <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true">
                    <rect x="1" y="0" width="12" height="8" rx="2.5" fill="#F8FAFC" stroke="#22392A" strokeWidth="1" />
                    <circle cx="7" cy="4" r="1.8" fill="#30573C" />
                    <rect x="5.8" y="8" width="2.4" height="14" rx="1" fill="#F8FAFC" stroke="#22392A" strokeWidth="0.8" />
                  </svg>
                </div>
              ))}

            {empty.map((e: any) => {
              const dia = e.spreadFt * cell;
              const sel = selected === 'empty:' + e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelect('empty:' + e.id)}
                  aria-label={`Empty spot where ${e.was} was. Choose a new plant`}
                  style={{ width: dia, height: dia, left: e.cx * cell - dia / 2, top: e.cy * cell - dia / 2 }}
                  className={`absolute z-20 rounded-full border-[3px] border-dashed flex items-center justify-center cursor-pointer ${sel ? 'border-[#FEF08A] bg-white/40' : 'border-white/90 bg-white/20 hover:bg-white/35'}`}
                >
                  <Plus className="w-6 h-6 text-white drop-shadow" />
                </button>
              );
            })}

            {states.map((s: PlantState) => {
              const dia = s.plant.spreadFt * cell;
              const S = STATUS[s.status];
              const sel = selected === s.placement.uid;
              const avatar = Math.min(76, Math.max(26, Math.round(dia * 0.64)));
              return (
                <button
                  key={s.placement.uid}
                  type="button"
                  onClick={() => onSelect(s.placement.uid)}
                  aria-label={`${s.plant.name}, ${S.label}${sel ? ', selected' : ''}`}
                  title={`${s.plant.name} (${s.plant.sci}) · ${S.label}`}
                  style={{
                    width: dia,
                    height: dia,
                    left: s.placement.cx * cell - dia / 2,
                    top: s.placement.cy * cell - dia / 2,
                    ...(s.planted
                      ? { border: `4px solid ${S.ring}`, background: `radial-gradient(circle, ${S.glow} 0%, rgba(216,243,220,0.55) 70%)` }
                      : {}),
                  }}
                  className={`group absolute rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                    s.planted ? 'z-30' : 'z-20 bg-[#F9D3E2]/40 border-2 border-dashed border-white/90'
                  } ${sel ? 'ring-4 ring-[#FEF08A] scale-105 z-40' : 'hover:scale-105'}`}
                >
                  <span className={s.planted ? '' : 'grayscale-[55%] opacity-75'}>
                    <PlantAvatar plant={s.plant} rounded="full" size={avatar} className="border-2 border-white shadow-xs" />
                  </span>
                  {!s.planted && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-[#475569]" />
                    </span>
                  )}
                  {(dia >= 70 || sel) && (
                    <span
                      className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap shadow ${
                        sel ? 'bg-[#22392A] text-white' : 'bg-white/95 text-[#22392A]'
                      }`}
                    >
                      {s.plant.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ overlay }: { overlay: string }) {
  if (overlay === 'sun')
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#4E6656]">
        {['Sun', 'Part Shade', 'Shade'].map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded-xs border border-[#64748B] ${lightOverlay(c)}`} /> {c}
          </span>
        ))}
      </div>
    );
  if (overlay === 'moisture')
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#4E6656]">
        {['Dry', 'Moist', 'Wet'].map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded-xs bg-white ${moistureOverlay(c)}`} /> {c}
          </span>
        ))}
      </div>
    );
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#22392A]">
      {['thriving', 'ontrack', 'attention', 'risk'].map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full border-[3px] bg-white" style={{ borderColor: STATUS[k].ring }} /> {STATUS[k].label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full border-2 border-dashed border-[#94A3B8] bg-[#F1F5F9]" /> Not planted yet
      </span>
      <span className="inline-flex items-center gap-1.5 text-[#4E6656]">
        <svg width="10" height="16" viewBox="0 0 14 22" aria-hidden="true">
          <rect x="1" y="0" width="12" height="8" rx="2.5" fill="#F8FAFC" stroke="#22392A" />
          <rect x="5.8" y="8" width="2.4" height="14" rx="1" fill="#94A3B8" />
        </svg>
        Sensor stake
      </span>
    </div>
  );
}

// ============================== side panels ==============================
function Summary({ states, counts, onSelect }: { states: PlantState[]; counts: Record<string, number>; onSelect: (id: string) => void }) {
  const needs = states.filter((s) => s.status === 'attention' || s.status === 'risk');
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-[#22392A]">Garden at a glance</h2>
        <p className="text-base text-[#4E6656] mt-1">Tap any plant on the map to see how it’s growing, log a check-in, or mark it as planted.</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {['thriving', 'ontrack', 'attention', 'risk', 'planned'].map((k) => (
          <div key={k} className={`rounded-lg px-3 py-2.5 ${STATUS[k].pill} ${k === 'planned' ? 'col-span-2' : ''}`}>
            <div className="font-mono tabular-nums text-2xl font-semibold">{counts[k] || 0}</div>
            <div className="text-sm font-medium">{STATUS[k].label}</div>
          </div>
        ))}
      </div>
      {needs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-[#22392A]">Needs you</h3>
          {needs.map((s) => (
            <button
              key={s.placement.uid}
              type="button"
              onClick={() => onSelect(s.placement.uid)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[#E6E2CC] hover:border-[#30573C] text-left cursor-pointer"
            >
              <PlantAvatar plant={s.plant} rounded="full" size={40} />
              <span className="flex-1">
                <span className="block font-semibold text-[#22392A]">{s.plant.name}</span>
                <span className={`inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS[s.status].pill}`}>{STATUS[s.status].label}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelHead({ plant, status, onClose, sub }: { plant: NativePlant; status: string; onClose: () => void; sub: string }) {
  const S = STATUS[status];
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-full p-1" style={{ border: `4px solid ${S.ring}` }}>
        <PlantAvatar plant={plant} rounded="full" size={64} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${S.pill}`}>{S.label}</span>
        <h2 className="font-display text-2xl font-semibold text-[#22392A] leading-tight mt-1">{plant.name}</h2>
        <p className="text-sm text-[#4E6656] italic">{plant.sci}</p>
        <p className="text-sm text-[#4E6656]">{sub}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-lg bg-[#F2F5F3] hover:bg-[#E4ECE7] flex items-center justify-center cursor-pointer shrink-0">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function PlantPanel({ s, project, track, today, now, busy, onClose, onPlant, onCheckIn, onRemove }: any) {
  const [mode, setMode] = useState<'info' | 'remove'>('info');
  const sp: TrackSpecies = s.species;
  const sub = `${s.cell.sun} · ${s.cell.moisture} soil · ${s.plant.spreadFt} ft spread`;

  if (!s.planted) return <PlantItPanel s={s} sub={sub} onClose={onClose} onPlant={onPlant} />;

  const last = s.logs[s.logs.length - 1];
  const exp = Math.round(expectedScore(sp, s.today, s.base));
  const lifePct = Math.max(2, Math.min(100, (s.today / (sp.lifespan_years * 365)) * 100));
  const readings = s.stake ? readingsFor(project, s.placement, today, now) : null;

  return (
    <div className="space-y-5">
      <PanelHead plant={s.plant} status={s.status} onClose={onClose} sub={sub} />

      {mode === 'remove' ? (
        <div className="space-y-3">
          <p className="text-lg font-semibold text-[#22392A]">What happened?</p>
          <p className="text-sm text-[#4E6656]">It’s saved to your garden journal, and the spot opens up for a new plant.</p>
          <button type="button" onClick={() => onRemove('natural')} className="w-full text-left px-4 py-3.5 text-base font-semibold border border-[#CCC8A8] rounded-lg hover:border-[#30573C] cursor-pointer">
            It lived out its natural life
          </button>
          <button type="button" onClick={() => onRemove('early')} className="w-full text-left px-4 py-3.5 text-base font-semibold border border-[#CCC8A8] rounded-lg hover:border-[#30573C] cursor-pointer">
            It died early (weather, pests, disease)
          </button>
          <button type="button" onClick={() => setMode('info')} className="w-full py-3 text-base font-semibold text-[#30573C] cursor-pointer">
            Never mind, keep it
          </button>
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-[#22392A]">Growth vs. expected</h3>
              <span className="text-base font-semibold text-[#22392A]">
                {last ? last.score : '—'} <span className="font-normal text-[#4E6656]">/ expected {exp}</span>
              </span>
            </div>
            <GrowthChart species={sp} logs={s.logs} today={s.today} base={s.base} ring={STATUS[s.status].ring} />
            <p className="text-sm text-[#4E6656]">
              Growth score = size and health compared with a fully grown, healthy plant (100). It combines height with leaf color, flowers, wilting, pests and disease.
            </p>
          </section>

          {readings ? (
            <section className="space-y-2">
              <h3 className="text-base font-semibold text-[#22392A]">Live from the {s.stake.name.toLowerCase()}</h3>
              <div className="grid grid-cols-3 gap-2">
                <Tile label="Soil moisture" value={`${readings.moisture}%`} cls="bg-[#EFF6FF] text-[#1E3A8A]" />
                <Tile label="Soil temp" value={`${readings.soilTempF}°F`} cls="bg-[#FFF7ED] text-[#7C2D12]" />
                <Tile label="Sun today" value={`${readings.sunHours} h`} cls="bg-[#FEFCE8] text-[#713F12]" />
              </div>
              <p className="text-sm text-[#4E6656]">The stake camera measures this plant every week and updates its score automatically.</p>
            </section>
          ) : (
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-[#22392A]">How is it doing?</h3>
              {s.logs.length <= 1 && s.today > 6 && (
                <p className="text-sm font-semibold text-[#78350F] bg-[#FEF3C7] rounded-lg px-3 py-2">No check-in yet. Tell us how it looks to keep its score up to date.</p>
              )}
              <CheckIn busy={busy} onSubmit={onCheckIn} />
              {track?.analysis && <Analysis a={track.analysis} />}
            </section>
          )}

          <section className="bg-[#F6F8F6] rounded-lg p-4 space-y-2">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold text-[#22392A]">Life so far</span>
              <span className="text-[#4E6656]">
                {ageText(s.today)} · usually lives {sp.lifespan_label}
              </span>
            </div>
            <div className="h-3 bg-[#E6E2CC] rounded-full overflow-hidden">
              <div className="h-full bg-[#40916C] rounded-full" style={{ width: `${lifePct}%` }} />
            </div>
          </section>

          <button type="button" onClick={() => setMode('remove')} className="w-full py-3 text-base font-semibold text-[#7F1D1D] bg-white border border-[#E6E2CC] hover:border-[#DC2626] rounded-lg cursor-pointer">
            This plant died · remove it
          </button>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${cls}`}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="font-mono tabular-nums text-xl font-semibold">{value}</div>
    </div>
  );
}

function PlantItPanel({ s, sub, onClose, onPlant }: any) {
  const todayIso = localIso();
  const [when, setWhen] = useState(todayIso);
  const iso = (d: number) => localIso(new Date(Date.now() - d * DAY));
  const opts: [string, number][] = [
    ['Today', 0],
    ['2 weeks ago', 14],
    ['1 month ago', 30],
    ['2 months ago', 60],
  ];
  const sp: TrackSpecies = s.species;
  return (
    <div className="space-y-5">
      <PanelHead plant={s.plant} status="planned" onClose={onClose} sub={sub} />
      <p className="text-base text-[#3F5747] leading-relaxed">This plant is in your plan but not in the ground yet. Once you plant it, we’ll start tracking how it grows.</p>
      <ul className="text-sm text-[#3F5747] space-y-1 list-disc pl-5">
        <li>Grows to about {s.plant.heightFt || `${Math.round(sp.height_cm / 30.48)} ft`}</li>
        <li>Flowers: {s.plant.bloom || 'seasonal'}</li>
        <li>Usually lives {sp.lifespan_label}</li>
      </ul>
      <div className="space-y-2">
        <p className="text-base font-semibold text-[#22392A]">When did you plant it?</p>
        <div className="flex flex-wrap gap-2">
          {opts.map(([l, d]) => (
            <button
              key={l}
              type="button"
              aria-pressed={when === iso(d)}
              onClick={() => setWhen(iso(d))}
              className={`px-4 py-2.5 text-sm font-semibold rounded-full border cursor-pointer ${when === iso(d) ? 'border-[#30573C] bg-[#EEEBD2] text-[#22392A]' : 'border-[#CCC8A8] bg-white text-[#3F5747]'}`}
            >
              {l}
            </button>
          ))}
          <input
            type="date"
            aria-label="Pick a planting date"
            max={todayIso}
            value={when}
            onChange={(e) => e.target.value && setWhen(e.target.value)}
            className="px-3 py-2 text-sm border border-[#CCC8A8] rounded-full"
          />
        </div>
      </div>
      <button type="button" onClick={() => onPlant(when)} className="w-full inline-flex items-center justify-center gap-2 py-4 text-lg font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-lg cursor-pointer">
        <CheckCircle2 className="w-5 h-5" /> Yes, I planted it
      </button>
    </div>
  );
}

function EmptySpotPanel({ project, spot, onClose, onPick }: any) {
  const cell = cellAt(project, spot.cx, spot.cy);
  const [list, setList] = useState<NativePlant[] | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchMassachusettsNativePlants({ light: cell.sun, moisture: cell.moisture, limit: 24, signal: ctrl.signal } as any)
      .then((r: any) => {
        const fits = r.plants.filter((pl: NativePlant) => {
          const cand = { uid: '__cand', plantId: pl.id, cx: spot.cx, cy: spot.cy, plantSnapshot: pl };
          registerPlants([pl]);
          return !getConflictDetails([...project.placements, cand], project.width, project.height).get('__cand');
        });
        setList(fits);
      })
      .catch(() => setList([]));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#334155]">Empty spot</span>
          <h2 className="font-display text-2xl font-semibold text-[#22392A] mt-1">Plant something new here?</h2>
          <p className="text-sm text-[#4E6656]">
            Where {spot.was} was · {cell.sun} · {cell.moisture} soil
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-lg bg-[#F2F5F3] hover:bg-[#E4ECE7] flex items-center justify-center cursor-pointer shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-[#4E6656]">Massachusetts natives that like this spot’s light and soil, and fit without crowding neighbors:</p>
      {list === null && <p className="text-base text-[#4E6656]">Finding plants…</p>}
      {list && list.length === 0 && <p className="text-base text-[#4E6656]">No matching plant fits this exact spot. Try “Edit garden map” to adjust the layout.</p>}
      <div className="space-y-2 max-h-[440px] overflow-auto pr-1">
        {(list || []).map((pl) => (
          <button
            key={pl.id}
            type="button"
            onClick={() => onPick(pl)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[#E6E2CC] hover:border-[#30573C] text-left cursor-pointer"
          >
            <PlantAvatar plant={pl} rounded="full" size={44} />
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-[#22392A]">{pl.name}</span>
              <span className="block text-sm text-[#4E6656] italic truncate">{pl.sci}</span>
            </span>
            <span className="text-sm font-mono tabular-nums text-[#4E6656]">{pl.spreadFt} ft</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onClose} className="w-full py-3 text-base font-semibold text-[#30573C] cursor-pointer">
        Leave this spot empty for now
      </button>
    </div>
  );
}

// ============================== check-in ==============================
function CheckIn({ busy, onSubmit }: { busy: boolean; onSubmit: (p: { note: string; image: any }) => Promise<boolean> }) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<any>(null);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const speech: any = useSpeech(setText);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setPhoto(await shrinkImage(f));
    } catch (x: any) {
      setErr(x.message);
    }
  }
  async function save() {
    if (speech.listening) speech.stop();
    if (!text.trim() && !photo) return setErr('Type or say something about the plant first, or add a photo.');
    setErr('');
    const ok = await onSubmit({ note: text.trim(), image: photo ? { mimeType: photo.mimeType, data: photo.data } : null });
    if (ok) {
      setText('');
      setPhoto(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <label htmlFor="checkin-note" className="block text-sm text-[#4E6656]">
        No sensor here. Type, say, or snap a photo of what you see: height, leaf color, flowers, anything odd.
      </label>
      <textarea
        id="checkin-note"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. About 16 inches tall, leaves are green but a couple at the bottom are yellow. I see flower buds."
        className="w-full px-3.5 py-3 text-base border border-[#CCC8A8] rounded-lg focus:outline-none focus:border-[#30573C] bg-[#FCFDFC]"
      />
      {photo && (
        <div className="flex items-center gap-3">
          <img src={photo.previewUrl} alt="Your plant" className="w-20 h-20 object-cover rounded-lg" />
          <button type="button" onClick={() => setPhoto(null)} className="text-sm font-semibold text-[#30573C] cursor-pointer">
            Remove photo
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {speech.supported ? (
          <button
            type="button"
            aria-pressed={speech.listening}
            onClick={() => (speech.listening ? speech.stop() : speech.start(text))}
            className={`inline-flex items-center gap-2 px-4 py-3 text-base font-semibold rounded-lg border cursor-pointer ${speech.listening ? 'border-[#DC2626] bg-[#FEE2E2] text-[#7F1D1D]' : 'border-[#CCC8A8] bg-white text-[#22392A]'}`}
          >
            <Mic className="w-5 h-5" /> {speech.listening ? 'Stop recording' : 'Speak'}
          </button>
        ) : (
          <span className="text-sm text-[#4E6656] self-center">Voice works in Chrome, Edge or Safari.</span>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-3 text-base font-semibold rounded-lg border border-[#CCC8A8] bg-white text-[#22392A] cursor-pointer">
          <Camera className="w-5 h-5" /> Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        <button type="button" onClick={save} disabled={busy} className="flex-1 min-w-[140px] px-4 py-3 text-base font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] disabled:opacity-60 rounded-full cursor-pointer">
          {busy ? 'Reading your update…' : 'Save update'}
        </button>
      </div>
      {speech.listening && <p className="text-sm font-semibold text-[#7F1D1D]">Listening… speak naturally, then tap “Stop recording”.</p>}
      {(err || speech.error) && <p className="text-sm text-[#7F1D1D] bg-[#FEE2E2] rounded-lg px-3 py-2">{err || speech.error}</p>}
    </div>
  );
}

function Analysis({ a }: { a: any }) {
  const f = a.features || {};
  const COND: Record<string, string> = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', dying: 'Dying', unknown: 'Not said' };
  const rows: [string, string][] = [
    ['Overall', COND[f.overall_condition] || 'Not said'],
    ['Height', f.height_cm ? `${Math.round(f.height_cm / 2.54)} in (${Math.round(f.height_cm)} cm)` : 'Not mentioned'],
    ['Leaves', ({ healthy_green: 'Healthy green', pale_or_yellowing: 'Pale or yellowing', browning: 'Browning', not_mentioned: 'Not mentioned' } as any)[f.leaf_color] || '—'],
    ['Flowers', ({ blooming: 'Blooming', buds: 'Buds forming', none: 'None yet', not_mentioned: 'Not mentioned' } as any)[f.flowering] || '—'],
    ['Problems', [f.wilting && 'drooping', f.pest_damage && 'insect damage', f.disease_signs && 'signs of disease'].filter(Boolean).join(', ') || 'None noticed'],
  ];
  return (
    <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 font-semibold text-[#4C1D95]">
        <Sparkles className="w-5 h-5" /> Garden helper read your update · new score {a.score}
      </div>
      {a.summary && a.source === 'gemini' && <p className="text-base text-[#22392A]">{a.summary}</p>}
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 text-sm border-b border-[#EDE9FE] pb-1">
          <span className="font-semibold">{k}</span>
          <span className="text-right">{v}</span>
        </div>
      ))}
      <p className={`text-base font-semibold ${a.urgent ? 'text-[#7F1D1D]' : 'text-[#22392A]'}`}>{a.advice}</p>
      {a.follow_up_question && (
        <p className="text-base bg-white border border-[#DDD6FE] rounded-lg px-3 py-2 text-[#4C1D95]">
          <span className="font-semibold">To score it more accurately:</span> {a.follow_up_question}
        </p>
      )}
      <p className="text-xs text-[#6B7280]">{a.source === 'gemini' ? `Read by Google Gemini (${a.model})` : 'Read by the simple backup reader. Gemini wasn’t reachable.'}</p>
    </div>
  );
}

function ageText(days: number) {
  if (days === 0) return 'Planted today';
  if (days < 14) return `Planted ${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 45) return `Planted ${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `Planted ${Math.round(days / 30)} months ago`;
  return `Planted ${(days / 365).toFixed(1)} years ago`;
}

// ============================== chart ==============================
function GrowthChart({ species, logs, today, base, ring }: any) {
  const W = 320,
    L = 34,
    R = 310,
    T = 14,
    B = 140,
    YMAX = 130;
  const maxDay = Math.max(120, today + 14);
  const X = (d: number) => L + (d / maxDay) * (R - L);
  const Y = (v: number) => B - (Math.min(v, YMAX) / YMAX) * (B - T);
  let exp = '';
  for (let d = 0; d <= maxDay; d += 3) exp += (d ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(expectedScore(species, d, base)).toFixed(1) + ' ';
  const pts = logs.map((l: any) => [X(l.day), Y(l.score), l]);
  const act = pts.map(([x, y]: any, i: number) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const tx = X(today);
  const ticks: number[] = [];
  for (let d = 30; d < maxDay; d += 30) if (Math.abs(X(d) - tx) > (today === 0 ? 75 : 26)) ticks.push(d);
  return (
    <div className="space-y-1.5">
      <svg viewBox={`0 0 ${W} 170`} width="100%" role="img" aria-label="Growth score compared with expected growth" className="block bg-[#F6F8F6] rounded-lg">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke="#E6E2CC" />
            <text x={L - 5} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="#4E6656">
              {v}
            </text>
          </g>
        ))}
        {ticks.map((d) => (
          <text key={d} x={X(d)} y={B + 14} textAnchor="middle" fontSize="9" fill="#4E6656">
            {d / 30} mo
          </text>
        ))}
        {tx - L > 40 && (
          <text x={L} y={B + 14} fontSize="9" fill="#4E6656">
            Planted
          </text>
        )}
        <line x1={tx} x2={tx} y1={T} y2={B} stroke="#94A3B8" strokeDasharray="3 3" />
        <text x={tx - L < 20 ? L : tx} y={B + 14} textAnchor={tx - L < 20 ? 'start' : tx > R - 24 ? 'end' : 'middle'} fontSize="9" fontWeight="700" fill="#22392A">
          {today === 0 ? 'Planted today' : 'Today'}
        </text>
        <path d={exp} fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="5 4" />
        {pts.length > 1 && <path d={act} fill="none" stroke={ring} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
        {pts.map(([x, y, l]: any, i: number) =>
          l.source === 'note' ? (
            <circle key={i} cx={x} cy={y} r="6" fill="#fff" stroke={ring} strokeWidth="3" />
          ) : (
            <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 5.5 : 2.8} fill={ring} stroke="#fff" strokeWidth={i === pts.length - 1 ? 2 : 0} />
          ),
        )}
      </svg>
      <div className="flex gap-4 text-sm text-[#4E6656]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 h-1 rounded" style={{ background: ring }} /> Your plant
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-[#94A3B8]" /> Expected
        </span>
      </div>
    </div>
  );
}

// ============================== ZIP & weather ==============================
function ZipCard({ onSave }: { onSave: (zip: string, place: any) => void }) {
  const [zip, setZip] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) return setErr('Please type a 5-digit ZIP code, like 02481.');
    setBusy(true);
    setErr('');
    try {
      const r = await fetch(`/api/weather?zip=${zip}`, { signal: AbortSignal.timeout(15000) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 404 || r.status === 400) {
        setErr(d.error || 'We couldn’t find that ZIP code.');
        setBusy(false);
        return;
      }
      onSave(zip, d.place ? { city: d.place.city, state: d.place.state } : null);
    } catch {
      onSave(zip, null);
    }
  }
  return (
    <form onSubmit={go} className="bg-white border-[2.5px] border-[#30573C] rounded-[32px] px-5 py-4 flex flex-col gap-3">
      <div className="flex-1">
        <h2 className="font-display text-lg font-medium text-[#30573C]">Where is this garden?</h2>
        <p className="text-base text-[#4E6656]">Your ZIP code gives you a local 7-day forecast and weather alerts for your plants.</p>
      </div>
      <div className="flex gap-2">
        <input
          aria-label="ZIP code"
          inputMode="numeric"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
          placeholder="02481"
          className="w-36 px-4 py-2 text-xl font-mono tracking-widest text-center border border-[#CCC8A8] rounded-lg focus:outline-none focus:border-[#30573C]"
        />
        <button disabled={busy} className="px-5 py-3 text-base font-semibold text-white bg-[#30573C] hover:bg-[#3E6E4D] rounded-full cursor-pointer disabled:opacity-60">
          {busy ? 'Looking up…' : 'Save'}
        </button>
      </div>
      {err && <p className="text-sm text-[#7F1D1D]">{err}</p>}
    </form>
  );
}

const LEVEL: Record<string, { head: string; tile: string; badge: string }> = {
  danger: { head: 'Important', tile: 'bg-[#FEE2E2] text-[#7F1D1D]', badge: 'bg-[#DC2626]' },
  warn: { head: 'Heads-up', tile: 'bg-[#FEF3C7] text-[#78350F]', badge: 'bg-[#D97706]' },
  good: { head: 'Good news', tile: 'bg-[#DBEAFE] text-[#1E3A8A]', badge: 'bg-[#2563EB]' },
};

function WeatherIcon({ kind }: { kind: string }) {
  const cls = 'w-8 h-8';
  if (kind === 'hot') return <ThermometerSun className={`${cls} text-[#EA580C]`} />;
  if (kind === 'rain') return <CloudRain className={`${cls} text-[#2563EB]`} />;
  if (kind === 'snow') return <CloudSnow className={`${cls} text-[#64748B]`} />;
  if (kind === 'partly') return <CloudSun className={`${cls} text-[#CA8A04]`} />;
  return <Sun className={`${cls} text-[#EAB308]`} />;
}

function WeatherSection({ days, loading, place, ctx, sample, note, noZip, onToggleSample, forcedSample }: any) {
  const [sel, setSel] = useState(0);
  if (loading)
    return (
      <section className="bg-white border border-[#E6E2CC] rounded-3xl p-5">
        <p className="text-base text-[#4E6656]">Getting your forecast…</p>
      </section>
    );
  if (!days?.length) return null;
  const i = Math.min(sel, days.length - 1);
  const day = days[i];
  const ins: any = insightsFor(days, i, ctx);
  const top = ins.alerts[0];
  return (
    <section className="bg-white border border-[#E6E2CC] rounded-3xl p-5 space-y-4" aria-label="This week's weather">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-[#22392A]">This week{place ? ` in ${place}` : ''}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#4E6656]">
          <span>{sample ? (noZip ? 'Sample summer week · add your ZIP for real weather' : 'Sample summer heat-wave week (demo)') : 'Point at or tap a day to see what it means for your garden'}</span>
          {!noZip && (
            <button type="button" onClick={onToggleSample} className="font-semibold text-[#30573C] underline underline-offset-4 cursor-pointer">
              {forcedSample ? 'Show real forecast' : 'Preview a summer heat wave'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map((d: any, k: number) => {
          const a = insightsFor(days, k, ctx).alerts[0];
          const on = k === i;
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={on}
              onMouseEnter={() => setSel(k)}
              onFocus={() => setSel(k)}
              onClick={() => setSel(k)}
              className={`relative flex flex-col items-center gap-1 rounded-3xl py-3 border-2 cursor-pointer transition-transform ${
                on ? 'border-[#30573C] bg-[#F7F5E5] -translate-y-0.5' : (d.hi ?? 0) >= 88 ? 'border-transparent bg-[#FFF7ED]' : (d.lo ?? 99) <= 32 ? 'border-transparent bg-[#EFF6FF]' : 'border-transparent bg-[#F6F8F6]'
              }`}
            >
              {a && <span className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center ${LEVEL[a.level].badge}`}>!</span>}
              <span className="text-base font-semibold text-[#22392A]">{dayLabel(d, k)}</span>
              <WeatherIcon kind={iconFor(d)} />
              <span className="font-mono tabular-nums text-lg font-semibold text-[#22392A]">{d.hi != null ? `${d.hi}°` : '—'}</span>
              <span className="font-mono tabular-nums text-sm text-[#4E6656]">{d.lo != null ? `${d.lo}°` : ''}</span>
            </button>
          );
        })}
      </div>
      <div className="bg-[#F6F8F6] rounded-3xl p-4 space-y-3">
        <div className="font-display text-lg font-semibold text-[#22392A]">
          {fullDate(day)} · {day.short}
          {day.hi != null && ` · high ${day.hi}°`}
          {day.lo != null && ` · low ${day.lo}°`} · rain {day.pop}%
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className={`md:col-span-1 rounded-lg p-3.5 space-y-1 ${top ? LEVEL[top.level].tile : 'bg-[#DCFCE7] text-[#14532D]'}`}>
            <div className="text-xs font-bold uppercase tracking-wide">{top ? LEVEL[top.level].head : 'No alerts'}</div>
            {top ? ins.alerts.slice(0, 2).map((a: any, k: number) => <p key={k} className="text-base font-semibold leading-snug">{a.text}</p>) : <p className="text-base font-semibold">Nothing to do today. Enjoy your garden!</p>}
          </div>
          <InfoTile head="Soil moisture" color="text-[#1E3A8A]" value={ins.moisture.label} note={ins.moisture.note} />
          <InfoTile head={`Insects · ${ins.insects.level}`} color="text-[#78350F]" note={ins.insects.note} />
          <InfoTile head="Plant growth" color="text-[#14532D]" value={ins.growth.label} note={ins.growth.note} />
        </div>
      </div>
      {note && <p className="text-sm text-[#4E6656]">Live forecast unavailable ({note}). Showing a sample week.</p>}
    </section>
  );
}

function InfoTile({ head, color, value, note }: { head: string; color: string; value?: string; note: string }) {
  return (
    <div className="bg-white rounded-lg p-3.5 space-y-1">
      <div className={`text-xs font-bold uppercase tracking-wide ${color}`}>{head}</div>
      {value && <div className="text-base font-semibold text-[#22392A]">{value}</div>}
      <p className="text-sm text-[#3F5747] leading-snug">{note}</p>
    </div>
  );
}

