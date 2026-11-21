import { expectedScore } from '../lib/growth.js';

const W = 320, H = 170, L = 34, R = 310, T = 12, B = 140;

export default function GrowthChart({ species, logs, today, ring }) {
  const maxDay = Math.max(120, today + 14);
  const X = (d) => L + (d / maxDay) * (R - L);
  const Y = (v) => B - (Math.min(v, 120) / 120) * (B - T);
  let exp = '';
  for (let d = 0; d <= maxDay; d += 3) exp += (d ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(expectedScore(species, d)).toFixed(1) + ' ';
  const pts = logs.map((l) => [X(l.day), Y(l.score), l]);
  const act = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const last = logs[logs.length - 1];
  const monthTicks = [];
  for (let d = 30; d < maxDay; d += 30) monthTicks.push(d);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" className="chart"
      aria-label={`Growth score ${last ? last.score : 'not measured yet'} compared with expected ${Math.round(expectedScore(species, today))}`}>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke="#E4DDCB" strokeWidth="1" />
          <text x={L - 5} y={Y(v) + 3} textAnchor="end" className="chart-t">{v}</text>
        </g>
      ))}
      {monthTicks.map((d) => (
        <text key={d} x={X(d)} y={B + 14} textAnchor="middle" className="chart-t">{d / 30} mo</text>
      ))}
      <text x={L} y={B + 14} className="chart-t">Planted</text>
      <line x1={X(today)} x2={X(today)} y1={T} y2={B} stroke="#9A9483" strokeDasharray="3 3" />
      <text x={X(today)} y={T + 8} textAnchor={X(today) > R - 30 ? 'end' : 'middle'} className="chart-t strong">Today</text>
      <path d={exp} fill="none" stroke="#9A9483" strokeWidth="2" strokeDasharray="5 4" />
      {pts.length > 1 && <path d={act} fill="none" stroke={ring} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map(([x, y, l], i) =>
        l.source === 'note' ? (
          <circle key={i} cx={x} cy={y} r="6" fill="#FFFFFF" stroke={ring} strokeWidth="3" />
        ) : (
          <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 5.5 : 2.8} fill={ring} stroke="#FFFFFF" strokeWidth={i === pts.length - 1 ? 2 : 0} />
        ),
      )}
    </svg>
  );
}
