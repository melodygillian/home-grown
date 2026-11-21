import { useState } from 'react';
import { dayLabel, fullDate, iconFor, insightsFor } from '../lib/weather.js';

const LEVEL = {
  danger: { head: 'Important', cls: 'al-danger' },
  warn: { head: 'Heads-up', cls: 'al-warn' },
  good: { head: 'Good news', cls: 'al-good' },
};

export default function WeatherBar({ weather, garden, place, loading, sampleMode }) {
  const [sel, setSel] = useState(0);
  if (loading) return <section className="card"><p className="muted">Getting the forecast…</p></section>;
  if (!weather?.length) return null;
  const i = Math.min(sel, weather.length - 1);
  const day = weather[i];
  const ins = insightsFor(weather, i, garden);
  const top = ins.alerts[0];

  return (
    <section className="card weather" aria-label="This week's weather">
      <div className="row-between wrap">
        <h2 className="h2">This week{place ? ` in ${place}` : ''}</h2>
        <span className="muted">{sampleMode ? 'Sample summer week (demo)' : 'Point at or tap a day to see what it means for your garden'}</span>
      </div>
      <div className="days">
        {weather.map((d, k) => {
          const a = insightsFor(weather, k, garden).alerts[0];
          return (
            <button
              key={d.date}
              type="button"
              className={'day' + (k === i ? ' on' : '') + ((d.hi ?? 0) >= 88 ? ' hot' : '') + ((d.lo ?? 99) <= 32 ? ' cold' : '')}
              aria-pressed={k === i}
              onMouseEnter={() => setSel(k)}
              onFocus={() => setSel(k)}
              onClick={() => setSel(k)}
            >
              {a && <span className={'badge ' + LEVEL[a.level].cls}>!</span>}
              <span className="d-name">{dayLabel(d, k)}</span>
              <WeatherIcon kind={iconFor(d)} />
              <span className="d-hi">{d.hi != null ? `${d.hi}°` : '—'}</span>
              <span className="d-lo">{d.lo != null ? `${d.lo}°` : ''}</span>
            </button>
          );
        })}
      </div>

      <div className="day-detail">
        <div className="dd-title">
          {fullDate(day)} · {day.short}
          {day.hi != null && ` · high ${day.hi}°`}
          {day.lo != null && ` · low ${day.lo}°`} · rain {day.pop}%
        </div>
        <div className="dd-grid">
          <div className={'dd-tile alert ' + (top ? LEVEL[top.level].cls : 'al-calm')}>
            <span className="dd-k">{top ? LEVEL[top.level].head : 'No alerts'}</span>
            {top ? ins.alerts.slice(0, 2).map((a, k) => <span key={k} className="dd-v">{a.text}</span>) : <span className="dd-v">Nothing to do today. Enjoy your garden!</span>}
          </div>
          <div className="dd-tile">
            <span className="dd-k blue">Soil moisture</span>
            <span className="dd-v">{ins.moisture.label}</span>
            <span className="dd-n">{ins.moisture.note}</span>
          </div>
          <div className="dd-tile">
            <span className="dd-k brown">Insects · {ins.insects.level}</span>
            <span className="dd-n">{ins.insects.note}</span>
          </div>
          <div className="dd-tile">
            <span className="dd-k green">Plant growth</span>
            <span className="dd-v">{ins.growth.label}</span>
            <span className="dd-n">{ins.growth.note}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function WeatherIcon({ kind }) {
  const rays = (color, r1, r2) =>
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const rad = (a * Math.PI) / 180;
      return <line key={a} x1={20 + Math.cos(rad) * r1} y1={20 + Math.sin(rad) * r1} x2={20 + Math.cos(rad) * r2} y2={20 + Math.sin(rad) * r2} stroke={color} strokeWidth="3" strokeLinecap="round" />;
    });
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      {kind === 'sun' && (<>{rays('#F2B518', 12, 17)}<circle cx="20" cy="20" r="8" fill="#FFCF33" /></>)}
      {kind === 'hot' && (<>{rays('#F07A22', 12, 18)}<circle cx="20" cy="20" r="9" fill="#FF9A3C" /></>)}
      {kind === 'partly' && (<><circle cx="15" cy="15" r="8" fill="#FFCF33" /><path d="M12 32h18a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0-3 10z" fill="#FFFFFF" stroke="#9AA7B4" strokeWidth="2" /></>)}
      {kind === 'rain' && (<><path d="M10 24h20a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0-5 10z" fill="#E8EEF4" stroke="#8796A6" strokeWidth="2" /><g stroke="#3B82C4" strokeWidth="3" strokeLinecap="round"><line x1="14" y1="29" x2="12" y2="35" /><line x1="21" y1="29" x2="19" y2="35" /><line x1="28" y1="29" x2="26" y2="35" /></g></>)}
      {kind === 'snow' && (<><path d="M10 24h20a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0-5 10z" fill="#EEF3F8" stroke="#8796A6" strokeWidth="2" /><g fill="#8FB3D9"><circle cx="13" cy="31" r="2.2" /><circle cx="20" cy="34" r="2.2" /><circle cx="27" cy="31" r="2.2" /></g></>)}
    </svg>
  );
}
