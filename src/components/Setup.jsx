import { useRef, useState } from 'react';
import { checkPlan } from '../lib/plan.js';
import { isPlannerPlan, convertPlannerPlan } from '../lib/importPlanner.js';
import { readHandoffPlan } from '../lib/storage.js';
import samplePlan from '../data/sample-garden.json';

export function ZipScreen({ onDone, planName }) {
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function go(e) {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) return setErr('Please type a 5-digit ZIP code, like 02481.');
    setBusy(true);
    setErr('');
    try {
      const r = await fetch(`/api/weather?zip=${zip}`, { signal: AbortSignal.timeout(15000) });
      const data = await r.json().catch(() => ({}));
      if (r.status === 404 || r.status === 400) {
        setErr(data.error || 'We couldn’t find that ZIP code.');
        setBusy(false);
        return;
      }
      onDone(zip, data.place || null);
    } catch {
      onDone(zip, null); // offline: continue with sample weather
    }
  }

  return (
    <div className="setup">
      <form className="card setup-card" onSubmit={go}>
        <svg className="sprout" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2F6B3F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22V12" /><path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z" fill="#A9D3B4" /><path d="M12 14c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z" fill="#CFE6C2" />
        </svg>
        <h1 className="h1">Welcome to your garden</h1>
        {planName && <p className="ok-note">Your plan <b>{planName}</b> is ready to open.</p>}
        <p className="lead">First, where is your garden? We use your ZIP code for local weather.</p>
        <label htmlFor="zip" className="h3">ZIP code</label>
        <input id="zip" className="big-input" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))} placeholder="02481" autoFocus />
        {err && <p className="error">{err}</p>}
        <button className="btn btn-big" disabled={busy}>{busy ? 'Looking it up…' : 'Continue'}</button>
      </form>
    </div>
  );
}

export function PlanScreen({ onPlan, onBack }) {
  const [err, setErr] = useState([]);
  const fileRef = useRef(null);
  const handoff = readHandoffPlan();

  function use(raw) {
    const plan = isPlannerPlan(raw) ? convertPlannerPlan(raw) : raw;
    const errors = checkPlan(plan);
    if (errors.length) return setErr(errors);
    onPlan(plan);
  }

  async function upload(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      use(JSON.parse(await f.text()));
    } catch {
      setErr(['That file isn’t valid JSON.']);
    }
  }

  return (
    <div className="setup">
      <div className="card setup-card">
        <h1 className="h1">Bring in your garden plan</h1>
        <p className="lead">Your plan from the BayState Bloom planner becomes your living garden map. In the planner, use “Open in My Garden”, or download the plan file and upload it here. Every plant starts “not planted yet” until you tell us it’s in the ground.</p>
        {handoff && <button className="btn btn-big" onClick={() => use(handoff)}>Use the plan from the planner</button>}
        <button className="btn btn-soft btn-wide" onClick={() => fileRef.current?.click()}>Upload a plan file (.json)</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={upload} />
        <button className={'btn btn-wide ' + (handoff ? 'btn-soft' : 'btn-primary')} onClick={() => use(samplePlan)}>Try the sample backyard</button>
        {err.length > 0 && (
          <div className="error">
            <b>This plan has a problem:</b>
            <ul>{err.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        <button className="btn btn-text" onClick={onBack}>← Change ZIP code</button>
      </div>
    </div>
  );
}
