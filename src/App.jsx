import { useEffect, useMemo, useState } from 'react';
import GardenMap from './components/GardenMap.jsx';
import PlantPanel from './components/PlantPanel.jsx';
import WeatherBar from './components/WeatherBar.jsx';
import { ZipScreen, PlanScreen } from './components/Setup.jsx';
import { getSpecies, sizeOf, cellsOf, majority, suggestionsFor, registerSpecies } from './lib/catalog.js';
import { daysSince, expectedScore, scoreFromFeatures, statusOf, cameraLogs, baseScoreOf, localIso } from './lib/growth.js';
import { stakeFor, readingsFor } from './lib/sensors.js';
import { fetchWeather, sampleSummerWeek } from './lib/weather.js';
import { analyzeCheckIn } from './lib/analyze.js';
import { gardenFromPlan, checkPlan } from './lib/plan.js';
import { isPlannerPlan, convertPlannerPlan, readPlanFromHash, clearHash } from './lib/importPlanner.js';
import { loadState, saveState, clearState } from './lib/storage.js';

function incomingFromHash() {
  const raw = readPlanFromHash();
  if (!raw) return null;
  if (raw.error) return { error: raw.error };
  const plan = isPlannerPlan(raw) ? convertPlannerPlan(raw) : raw;
  const errs = checkPlan(plan);
  return errs.length ? { error: 'This plan couldn’t be opened: ' + errs[0] } : { plan };
}

const EMPTY = { zip: null, place: null, plan: null, plants: [], journal: [], sampleWeather: false };

export default function App() {
  const [state, setState] = useState(() => {
    const s = { ...EMPTY, ...(loadState() || {}) };
    if (s.plan) registerSpecies(s.plan.species);
    return s;
  });
  // A plan sent from the planner through the link (https://…/#plan=…)
  const [incoming, setIncoming] = useState(() => incomingFromHash());
  const [selectedId, setSelectedId] = useState(null);
  const [overlay, setOverlay] = useState('plants');
  const [weather, setWeather] = useState({ days: null, loading: false, note: '' });
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    if (incoming) clearHash();
    // The planner can also send a plan while this page is already open.
    const onHash = () => {
      const next = incomingFromHash();
      if (next) {
        setIncoming(next);
        clearHash();
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyPlan(p) {
    registerSpecies(p.species);
    setState((s) => ({ ...s, plan: p, plants: gardenFromPlan(p), journal: [] }));
    setSelectedId(null);
  }

  // First visit with a plan link: open it as soon as we know the ZIP code.
  useEffect(() => {
    if (incoming?.plan && state.zip && !state.plan) {
      applyPlan(incoming.plan);
      setIncoming(null);
    }
  }, [incoming, state.zip, state.plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the forecast whenever the ZIP changes.
  useEffect(() => {
    if (!state.zip) return;
    let alive = true;
    setWeather((w) => ({ ...w, loading: true }));
    fetchWeather(state.zip)
      .then((d) => {
        if (!alive) return;
        if (d.place && !state.place) setState((s) => ({ ...s, place: d.place }));
        setWeather({ days: d.days, loading: false, note: d.days ? '' : d.error || 'Forecast unavailable' });
      })
      .catch((e) => alive && setWeather({ days: null, loading: false, note: e.message }));
    return () => {
      alive = false;
    };
  }, [state.zip]);

  const plan = state.plan;
  const now = Date.now();

  // Everything derived for each plant: species, logs (camera or manual), status, sensor.
  const derived = useMemo(() => {
    if (!plan) return {};
    const out = {};
    for (const p of state.plants) {
      const sp = getSpecies(p.species);
      if (!sp) continue;
      const stake = stakeFor(plan, p);
      const today = p.plantedOn ? daysSince(p.plantedOn, now) : 0;
      let logs = [];
      const base = stake ? undefined : baseScoreOf(p.logs);
      if (p.status === 'planted') {
        const notes = p.logs || [];
        const startsWithNote = notes.length && notes[0].day === 0;
        logs = stake ? cameraLogs(p, sp, now) : startsWithNote ? notes : [{ day: 0, score: Math.round(base), source: 'start' }, ...notes];
      }
      const status = statusOf({ ...p, logs, base }, sp);
      const cells = cellsOf(p.x, p.y, sizeOf(plan, p));
      out[p.id] = { sp, stake, today, logs, status, base, spot: { sun: majority(plan, cells, 'sun'), moisture: majority(plan, cells, 'moisture') } };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plants, plan, Math.floor(now / 60000)]);

  const days = state.sampleWeather || (!weather.loading && !weather.days) ? sampleSummerWeek() : weather.days;
  const usingSample = state.sampleWeather || (!weather.loading && !weather.days);

  if (!state.zip)
    return <ZipScreen planName={incoming?.plan?.name} onDone={(zip, place) => setState((s) => ({ ...s, zip, place }))} />;
  if (!plan)
    return (
      <PlanScreen
        onBack={() => setState((s) => ({ ...s, zip: null, place: null }))}
        onPlan={applyPlan}
      />
    );

  const statusById = Object.fromEntries(Object.entries(derived).map(([id, d]) => [id, d.status]));
  const plantedCount = state.plants.filter((p) => p.status === 'planted').length;
  const activeCount = state.plants.filter((p) => p.status !== 'removed').length;
  const sel = state.plants.find((p) => p.id === selectedId);
  const selD = sel ? derived[sel.id] : null;

  const update = (id, fn) => setState((s) => ({ ...s, plants: s.plants.map((p) => (p.id === id ? fn({ ...p }) : p)) }));

  const gardenCtx = {
    planted: state.plants
      .filter((p) => p.status === 'planted' && derived[p.id])
      .map((p) => {
        const d = derived[p.id];
        return { id: p.id, common: d.sp.common, likes: d.sp.moisture, sunAt: d.spot.sun, moistureAt: d.spot.moisture, daysSincePlanted: d.today, heightCm: d.sp.height_cm };
      }),
  };

  async function checkIn(payload) {
    const p = sel;
    const d = selD;
    setBusy(true);
    const expected = expectedScore(d.sp, d.today, d.base);
    const res = await analyzeCheckIn({
      ...payload,
      plant: { common: d.sp.common, scientific: d.sp.scientific, type: d.sp.type, height_cm: d.sp.height_cm, bloom: d.sp.bloom, sun: d.spot.sun, moisture: d.spot.moisture },
      days_since_planted: d.today,
      expected_height_cm: Math.round((expected / 100) * d.sp.height_cm),
      month: new Date().toLocaleString('en-US', { month: 'long' }),
      weather: days?.[0] ? `${days[0].short}, high ${days[0].hi ?? '?'}°F, low ${days[0].lo ?? '?'}°F` : 'unknown',
    });
    const prevH = [...(p.logs || [])].reverse().find((l) => l.heightPct != null)?.heightPct ?? null;
    const { score, heightPct } = scoreFromFeatures(d.sp, res.features || {}, prevH, expected);
    update(p.id, (q) => {
      const logs = (q.logs || []).filter((l) => l.day !== d.today);
      logs.push({ day: d.today, score, heightPct, source: 'note', features: res.features, note: payload.note });
      q.logs = logs;
      q.analysis = { ...res, score };
      return q;
    });
    setBusy(false);
    return true;
  }

  function demoPlantAll() {
    const iso = localIso(new Date(Date.now() - 60 * 86400000));
    setState((s) => ({ ...s, plants: s.plants.map((p) => (p.status === 'planned' ? { ...p, status: 'planted', plantedOn: iso, logs: [] } : p)) }));
    setMenuOpen(false);
  }

  const placeLabel = state.place ? `${state.place.city}, ${state.place.state}` : `ZIP ${state.zip}`;

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1 className="h1">My Garden</h1>
          <p className="lead">
            {plan.name && plan.name !== 'Sample backyard' ? `${plan.name} · ` : ''}{placeLabel} · {plantedCount} of {activeCount} plants in the ground · {plan.width_ft} × {plan.length_ft} ft
          </p>
        </div>
        <div className="menu-wrap">
          <button type="button" className="btn btn-soft" aria-expanded={menuOpen} onClick={() => setMenuOpen((m) => !m)}>
            Settings
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button role="menuitem" onClick={() => { setState((s) => ({ ...s, zip: null, place: null })); setMenuOpen(false); }}>Change ZIP code</button>
              <button role="menuitem" onClick={() => { setState((s) => ({ ...s, plan: null, plants: [] })); setSelectedId(null); setMenuOpen(false); }}>Load a different garden plan</button>
              {plan.source?.url && (
                <a role="menuitem" className="menu-link" href={plan.source.url} target="_blank" rel="noreferrer">Edit this plan in the planner ↗</a>
              )}
              <hr />
              <span className="menu-h">Demo tools</span>
              <button role="menuitem" onClick={demoPlantAll}>Plant everything 2 months ago</button>
              <button role="menuitem" onClick={() => { setState((s) => ({ ...s, sampleWeather: !s.sampleWeather })); setMenuOpen(false); }}>
                {state.sampleWeather ? 'Use the real forecast' : 'Use a sample summer heat-wave week'}
              </button>
              <button role="menuitem" onClick={() => { setState((s) => ({ ...s, plants: gardenFromPlan(s.plan), journal: [] })); setSelectedId(null); setMenuOpen(false); }}>Reset garden to fresh plan</button>
              <button role="menuitem" onClick={() => { clearState(); setState(EMPTY); setSelectedId(null); setMenuOpen(false); }}>Start over completely</button>
            </div>
          )}
        </div>
      </header>

      {incoming && (
        <div className={'hint' + (incoming.error ? ' hint-error' : '')} role="status">
          {incoming.error ? (
            <>
              <span className="grow">{incoming.error}</span>
              <button type="button" className="btn btn-soft" onClick={() => setIncoming(null)}>OK</button>
            </>
          ) : (
            <>
              <span className="grow">
                A new plan arrived from the planner: <b>{incoming.plan.name}</b> ({incoming.plan.width_ft} × {incoming.plan.length_ft} ft, {incoming.plan.plants.length} plants).
              </span>
              <button type="button" className="btn btn-primary" onClick={() => { applyPlan(incoming.plan); setIncoming(null); }}>Open new plan</button>
              <button type="button" className="btn btn-soft" onClick={() => setIncoming(null)}>Keep my current garden</button>
            </>
          )}
        </div>
      )}

      {plantedCount === 0 && (
        <div className="hint">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2F6B3F" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 22V12" /><path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z" /><path d="M12 14c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z" /></svg>
          <span>Your plan is here. <b>Faded plants aren’t planted yet.</b> Tap a plant once it’s in the ground.</span>
        </div>
      )}

      <div className="main-row">
        <GardenMap
          plan={plan}
          plants={state.plants.filter((p) => derived[p.id])}
          statusById={statusById}
          selectedId={selectedId}
          onSelect={setSelectedId}
          overlay={overlay}
          setOverlay={setOverlay}
        />
        {sel && selD && (
          <PlantPanel
            key={sel.id + sel.species + sel.status}
            plan={plan}
            plant={sel}
            species={selD.sp}
            status={selD.status}
            logs={selD.logs}
            base={selD.base}
            today={selD.today}
            stake={selD.stake}
            readings={selD.stake ? readingsFor(plan, sel, days?.[0], now) : null}
            spot={selD.spot}
            analysis={sel.analysis}
            busy={busy}
            suggestions={suggestionsFor(plan, state.plants, { x: sel.x, y: sel.y, size: sizeOf(plan, sel), id: sel.id })}
            onClose={() => setSelectedId(null)}
            onPlant={(iso) => update(sel.id, (p) => ({ ...p, status: 'planted', plantedOn: iso, logs: [], analysis: null }))}
            onCheckIn={checkIn}
            onRemove={(reason) => {
              setState((s) => ({
                ...s,
                journal: [...s.journal, { species: sel.species, plantedOn: sel.plantedOn, removedOn: localIso(), reason }],
              }));
              update(sel.id, (p) => ({ ...p, status: 'removed', logs: [], analysis: null }));
            }}
            onReplace={(speciesId) => update(sel.id, (p) => ({ ...p, species: speciesId, size: undefined, status: 'planned', plantedOn: null, logs: [], analysis: null }))}
          />
        )}
      </div>

      <WeatherBar weather={days} garden={gardenCtx} place={state.place?.city} loading={weather.loading && !state.sampleWeather} sampleMode={usingSample} />
      {usingSample && !state.sampleWeather && weather.note && <p className="muted small center">Live forecast unavailable ({weather.note}). Showing a sample week.</p>}
      <p className="tiny center">Prototype · sensor readings are simulated · plant check-ins are read by Google Gemini · weather from the US National Weather Service</p>
    </div>
  );
}
