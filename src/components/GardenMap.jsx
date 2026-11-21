import { useEffect, useRef, useState } from 'react';
import Flower from './Flower.jsx';
import { getSpecies, footprint, SUN_LABEL, MOISTURE_LABEL } from '../lib/catalog.js';
import { STATUS } from '../lib/growth.js';

const SOIL = { dry: '#E8CFA0', dry_mesic: '#DEC191', mesic: '#D3B282', wet_mesic: '#C6A374', wet: '#B7936A' };
const SHADE_TINT = { full_sun: 'transparent', part_shade: 'rgba(40,70,40,0.10)', shade: 'rgba(30,50,30,0.22)' };
const SUN_COLOR = { full_sun: '#FFD966', part_shade: '#D9D3AE', shade: '#A4AE9F' };
const WET_COLOR = { dry: '#F4E4C4', dry_mesic: '#DCE8EE', mesic: '#B7D4E7', wet_mesic: '#87B7DB', wet: '#4F8FC9' };

export default function GardenMap({ plan, plants, statusById, selectedId, onSelect, overlay, setOverlay }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = plan.cells[0].length;
  const rows = plan.cells.length;
  const cell = Math.max(34, Math.min(96, Math.floor((width - 70) / cols)));
  const W = cols * cell;
  const H = rows * cell;
  const labelEvery = cell >= 44 ? 1 : cell >= 30 ? 2 : 4;

  const cellBg = (c) =>
    overlay === 'sun' ? SUN_COLOR[c.sun] : overlay === 'moisture' ? WET_COLOR[c.moisture] : SOIL[c.moisture];

  return (
    <section className="card map-card" aria-label="Garden map">
      <div className="map-toolbar">
        <h2 className="h2">Garden map</h2>
        <div className="seg" role="group" aria-label="Map view">
          {[['plants', 'Plants'], ['sun', 'Sunlight'], ['moisture', 'Moisture']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={overlay === k} className={overlay === k ? 'on' : ''} onClick={() => setOverlay(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="map-wrap">
        {/* top ruler */}
        <div className="ruler-top" style={{ width: W, marginLeft: 46 }}>
          <div className="ruler-total">{plan.width_ft} ft wide</div>
          <div className="ruler-line" />
          {Array.from({ length: cols + 1 }, (_, i) =>
            i % labelEvery === 0 || i === cols ? (
              <span key={i} className="tick" style={{ left: i * cell }}>
                {+(i * plan.cell_ft).toFixed(1)}
              </span>
            ) : null,
          )}
        </div>

        <div className="map-row">
          {/* left ruler */}
          <div className="ruler-left" style={{ height: H }}>
            <div className="ruler-total-v">{plan.length_ft} ft long</div>
            {Array.from({ length: rows + 1 }, (_, i) =>
              i % labelEvery === 0 || i === rows ? (
                <span key={i} className="tick-v" style={{ top: i * cell }}>
                  {+(i * plan.cell_ft).toFixed(1)}
                </span>
              ) : null,
            )}
          </div>

          <div className="yard">
            <div className="grid" style={{ width: W, height: H, gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: `${cell}px` }}>
              {plan.cells.flatMap((row, y) =>
                row.map((c, x) => (
                  <div
                    key={x + '-' + y}
                    className="cell"
                    title={`${SUN_LABEL[c.sun]}, ${MOISTURE_LABEL[c.moisture]}`}
                    style={{ background: cellBg(c), boxShadow: overlay === 'plants' ? `inset 0 0 0 999px ${SHADE_TINT[c.sun]}` : undefined }}
                  />
                )),
              )}

              {(plan.sensors || []).map((s) => (
                <div key={s.id} className="stake" style={{ left: (s.x + 0.5) * cell - 9, top: (s.y + 0.5) * cell - 12 }} title={s.name || 'Sensor stake'}>
                  <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden="true">
                    <rect x="3" y="0" width="12" height="9" rx="3" fill="#2F6B3F" />
                    <circle cx="9" cy="4.5" r="2.2" fill="#A9D3B4" />
                    <rect x="7.5" y="9" width="3" height="15" rx="1" fill="#6B665A" />
                  </svg>
                </div>
              ))}

              {plants.map((p) => {
                const sp = getSpecies(p.species);
                const size = footprint(sp, plan.cell_ft);
                const st = statusById[p.id];
                const S = STATUS[st] || STATUS.planned;
                const isSel = p.id === selectedId;
                const box = size * cell;
                const fsz = Math.max(30, Math.min(150, box * 0.74));
                const left = p.x * cell;
                const top = p.y * cell;
                if (st === 'removed') {
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={'spot-empty' + (isSel ? ' sel' : '')}
                      style={{ left: left + 4, top: top + 4, width: box - 8, height: box - 8 }}
                      onClick={() => onSelect(p.id)}
                      aria-label="Empty spot. Choose a new plant"
                    >
                      +
                    </button>
                  );
                }
                const live = st !== 'planned';
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={'plant' + (isSel ? ' sel' : '')}
                    style={{ left, top, width: box, height: box }}
                    onClick={() => onSelect(p.id)}
                    aria-label={`${sp.common}, ${S.label}${isSel ? ', selected' : ''}`}
                  >
                    <span
                      className="halo"
                      style={{
                        width: fsz + 14,
                        height: fsz + 14,
                        ...(live
                          ? { background: `radial-gradient(circle, ${S.glow} 0%, rgba(255,255,255,0) 72%)`, border: `4px solid ${S.ring}` }
                          : { border: '2px dashed #7F7A6E', background: 'rgba(255,255,255,0.28)' }),
                      }}
                    />
                    <span className="fwrap">
                      <span className={'flower' + (live ? '' : ' locked')}>
                        <Flower look={sp.look} size={fsz} />
                      </span>
                      {!live && (
                        <span className="lock" aria-hidden="true">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B665A" strokeWidth="2.6" strokeLinecap="round">
                            <rect x="5" y="11" width="14" height="10" rx="2" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                          </svg>
                        </span>
                      )}
                    </span>
                    {(box >= 56 || isSel) && (
                    <span
                      className="plant-label"
                      style={{
                        maxWidth: Math.max(box + 20, 84),
                        ...(isSel
                          ? { background: '#2B3A2E', color: '#fff' }
                          : live
                            ? { boxShadow: `inset 0 0 0 2px ${S.ring}` }
                            : { background: 'rgba(255,255,255,0.8)', color: '#4F4B42' }),
                      }}
                    >
                      {sp.common}
                    </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <MapLegend overlay={overlay} />
    </section>
  );
}

function MapLegend({ overlay }) {
  if (overlay === 'sun')
    return (
      <div className="legend">
        {Object.entries(SUN_COLOR).map(([k, c]) => (
          <span key={k}><i style={{ background: c }} />{SUN_LABEL[k]}</span>
        ))}
      </div>
    );
  if (overlay === 'moisture')
    return (
      <div className="legend">
        {Object.entries(WET_COLOR).reverse().map(([k, c]) => (
          <span key={k}><i style={{ background: c }} />{MOISTURE_LABEL[k]}</span>
        ))}
      </div>
    );
  return (
    <div className="legend">
      {['thriving', 'ontrack', 'attention', 'risk'].map((k) => (
        <span key={k}><i className="ring" style={{ borderColor: STATUS[k].ring, background: STATUS[k].bg }} />{STATUS[k].label}</span>
      ))}
      <span><i className="ring dashed" />Not planted yet</span>
      <span>
        <svg width="14" height="18" viewBox="0 0 18 24" aria-hidden="true"><rect x="3" y="0" width="12" height="9" rx="3" fill="#2F6B3F" /><rect x="7.5" y="9" width="3" height="15" rx="1" fill="#6B665A" /></svg>
        Sensor stake
      </span>
    </div>
  );
}
