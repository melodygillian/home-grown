import { useState } from 'react';
import Flower from './Flower.jsx';
import GrowthChart from './GrowthChart.jsx';
import CheckIn from './CheckIn.jsx';
import { STATUS, expectedScore, localIso } from '../lib/growth.js';
import { SUN_LABEL, MOISTURE_LABEL, heightText, bloomText, sizeOf } from '../lib/catalog.js';

const DAY = 86400000;

export default function PlantPanel(props) {
  const { plan, plant, species, status, logs, base, today, stake, readings, spot, suggestions, analysis, busy } = props;
  const [mode, setMode] = useState(status === 'removed' ? 'replace' : 'info');
  const [removedReason, setRemovedReason] = useState(null);
  const S = STATUS[status] || STATUS.planned;
  const sizeFt = sizeOf(plan, plant) * plan.cell_ft;

  return (
    <aside className="card panel" aria-label="Plant details">
      <div className="panel-head">
        {status !== 'removed' && (
          <div className="panel-flower" style={{ borderColor: S.ring }}>
            <Flower look={species.look} size={54} />
          </div>
        )}
        <div className="grow min0">
          <span className="pill" style={{ background: S.bg, color: S.fg }}>{status === 'removed' ? 'Empty spot' : S.label}</span>
          <h2 className="h-plant">{status === 'removed' ? 'Choose a new plant' : species.common}</h2>
          {status !== 'removed' && <p className="muted"><em>{species.scientific}</em></p>}
          <p className="muted small">
            {SUN_LABEL[spot.sun]} · {MOISTURE_LABEL[spot.moisture]} soil · {sizeFt} × {sizeFt} ft spot
          </p>
        </div>
        <button type="button" className="icon-btn" aria-label="Close plant details" onClick={props.onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      {mode === 'info' && status === 'planned' && <PlantIt species={species} onPlant={props.onPlant} />}

      {mode === 'info' && status !== 'planned' && status !== 'removed' && (
        <>
          <section className="sec">
            <div className="row-between">
              <h3 className="h3">Growth vs. expected</h3>
              <span className="strong">
                {logs.length ? logs[logs.length - 1].score : '—'} <span className="muted">/ expected {Math.round(expectedScore(species, today, base))}</span>
              </span>
            </div>
            <GrowthChart species={species} logs={logs} today={today} base={base} ring={S.ring} />
            <div className="chart-key">
              <span><i style={{ background: S.ring }} />Your plant</span>
              <span><i className="dash" />Expected for this plant</span>
            </div>
            <p className="muted small">
              Growth score = size and health compared with a fully grown, healthy plant (100). It combines height with leaf color,
              flowers, wilting, pests and disease.{base != null && base !== 30 && ' Your first check-in set this plant’s starting point.'}
            </p>
          </section>

          {stake ? (
            <section className="sec">
              <h3 className="h3">Live from “{stake.name || 'sensor stake'}”</h3>
              <div className="tiles3">
                <div className="tile blue"><span>Soil moisture</span><b>{readings.moisture}%</b></div>
                <div className="tile orange"><span>Soil temp</span><b>{readings.soilTempF}°F</b></div>
                <div className="tile yellow"><span>Sun today</span><b>{readings.sunHours} h</b></div>
              </div>
              <p className="muted small">The stake camera measures this plant every week and updates its score automatically. (Simulated for the demo.)</p>
            </section>
          ) : (
            <section className="sec">
              <h3 className="h3">How is it doing?</h3>
              {logs.length <= 1 && today > 6 && <p className="nudge">No check-in yet. Tell us how it looks so we can keep its score up to date.</p>}
              <CheckIn busy={busy} onSubmit={props.onCheckIn} />
              {analysis && <AnalysisCard a={analysis} />}
            </section>
          )}

          <section className="sec life">
            <div className="row-between small">
              <b>Life so far</b>
              <span>{ageText(today)} · usually lives {species.lifespan_label}</span>
            </div>
            <div className="bar"><div style={{ width: `${Math.max(2, Math.min(100, (today / (species.lifespan_years * 365)) * 100))}%` }} /></div>
          </section>

          <button type="button" className="btn btn-outline" onClick={() => setMode('remove')}>This plant died · remove it</button>
        </>
      )}

      {mode === 'remove' && (
        <section className="sec">
          <p className="h3">What happened?</p>
          <p className="muted small">This goes in your garden journal, so next year’s plan can learn from it.</p>
          <button type="button" className="btn btn-choice" onClick={() => { props.onRemove('natural'); setRemovedReason('lived out its natural life'); setMode('replace'); }}>
            It lived out its natural life
          </button>
          <button type="button" className="btn btn-choice" onClick={() => { props.onRemove('early'); setRemovedReason('died early (weather, pests or disease)'); setMode('replace'); }}>
            It died early (weather, pests, disease)
          </button>
          <button type="button" className="btn btn-text" onClick={() => setMode('info')}>Never mind, keep it</button>
        </section>
      )}

      {(mode === 'replace' || status === 'removed') && mode !== 'remove' && (
        <section className="sec">
          {removedReason && <p className="ok-note">Removed. Saved to your garden journal: <b>{removedReason}</b>.</p>}
          <p className="h3">Plant something new here?</p>
          <p className="muted small">Massachusetts natives that suit this spot and fit the space:</p>
          {suggestions.length === 0 && <p className="muted">Nothing in the catalog fits this exact spot.</p>}
          <div className="choices">
            {suggestions.slice(0, 10).map(({ species: s, size }) => (
              <button key={s.id} type="button" className="choice" onClick={() => props.onReplace(s.id)}>
                <Flower look={s.look} size={40} />
                <span className="grow">
                  <b>{s.common}</b>
                  <span className="muted small">{s.note}</span>
                </span>
                <span className="muted small nowrap">{size * plan.cell_ft} ft</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-text" onClick={props.onClose}>Leave this spot empty for now</button>
        </section>
      )}
    </aside>
  );
}

function PlantIt({ species, onPlant }) {
  const todayIso = localIso();
  const [when, setWhen] = useState(todayIso);
  const opts = [['Today', 0], ['2 weeks ago', 14], ['1 month ago', 30], ['2 months ago', 60]];
  const iso = (d) => localIso(new Date(Date.now() - d * DAY));
  return (
    <section className="sec">
      <p className="lead">This plant is in your plan but not planted yet. Once it’s in the ground, we’ll start tracking how it grows.</p>
      <ul className="facts">
        <li><b>Grows to</b> about {heightText(species.height_cm)} tall</li>
        <li><b>Flowers</b> {bloomText(species.bloom)}</li>
        <li><b>Lives</b> {species.lifespan_label}</li>
        <li>{species.note}</li>
      </ul>
      <p className="h3">When did you plant it?</p>
      <div className="row-wrap">
        {opts.map(([l, d]) => (
          <button key={l} type="button" className={'chip' + (when === iso(d) ? ' on' : '')} aria-pressed={when === iso(d)} onClick={() => setWhen(iso(d))}>
            {l}
          </button>
        ))}
        <label className="chip date">
          <span className="sr">Pick a date</span>
          <input type="date" max={todayIso} value={when} onChange={(e) => e.target.value && setWhen(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn btn-big" onClick={() => onPlant(when)}>Yes, I planted it</button>
    </section>
  );
}

function AnalysisCard({ a }) {
  const f = a.features || {};
  const rows = [
    ['Height', f.height_cm ? `${Math.round(f.height_cm / 2.54)} in (${Math.round(f.height_cm)} cm)` : 'Not mentioned'],
    ['Leaves', { healthy_green: 'Healthy green', pale_or_yellowing: 'Pale or yellowing', browning: 'Browning', not_mentioned: 'Not mentioned' }[f.leaf_color] || '—'],
    ['Flowers', { blooming: 'Blooming', buds: 'Buds forming', none: 'None yet', not_mentioned: 'Not mentioned' }[f.flowering] || '—'],
    ['Problems', [f.wilting && 'drooping', f.pest_damage && 'insect damage', f.disease_signs && 'signs of disease'].filter(Boolean).join(', ') || 'None noticed'],
  ];
  return (
    <div className="analysis">
      <div className="analysis-head">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
        </svg>
        Garden helper read your update · new score {a.score}
      </div>
      {a.summary && a.source === 'gemini' && <p>{a.summary}</p>}
      {rows.map(([k, v]) => (
        <div key={k} className="kv"><b>{k}</b><span>{v}</span></div>
      ))}
      <p className={a.urgent ? 'advice urgent' : 'advice'}>{a.advice}</p>
      <p className="tiny">{a.source === 'gemini' ? `Read by Google Gemini (${a.model})` : 'Read by the simple backup reader. Gemini wasn’t reachable.'}</p>
    </div>
  );
}

function ageText(days) {
  if (days === 0) return 'Planted today';
  if (days < 14) return `Planted ${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 45) return `Planted ${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `Planted ${Math.round(days / 30)} months ago`;
  return `Planted ${(days / 365).toFixed(1)} years ago`;
}
