import { expectedScore } from '../lib/growth.js';

const W = 320, H = 170, L = 34, R = 310, T = 14, B = 140, YMAX = 130;

export default function GrowthChart({ species, logs, today, base, ring }) {
  const maxDay = Math.max(120, today + 14);
  const X = (d) => L + (d / maxDay) * (R - L);
  const Y = (v) => B - (Math.min(v, YMAX) / YMAX) * (B - T);
  let exp = '';
  for (let d = 0; d <= maxDay; d += 3) exp += (d ? 'L' : 'M') + X(d).toFixed(1) + ' ' + Y(expectedScore(species, d, base)).toFixed(1) + ' ';
  const pts = logs.map((l) => [X(l.day), Y(l.score), l]);
  const act = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const last = logs[logs.length - 1];
  const tx = X(today);
  const monthTicks = [];
  for (let d = 30; d < maxDay; d += 30) if (Math.abs(X(d) - tx) > (today === 0 ? 75 : 26)) monthTicks.push(d);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" className="chart"
      aria-label={`Growth score ${last ? last.score : 'not measured yet'} compared with expected ${Math.round(expectedScore(species, today, base))}`}>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={Y(v)} y2={Y(v)} stroke="#E4DDCB" strokeWidth="1" />
          <text x={L - 5} y={Y(v) + 3} textAnchor="end" className="chart-t">{v}</text>
        </g>
      ))}
      {monthTicks.map((d) => (
        <text key={d} x={X(d)} y={B + 14} textAnchor="middle" className="chart-t">{d / 30} mo</text>
      ))}
      {tx - L > 40 && <text x={L} y={B + 14} className="chart-t">Planted</text>}
      <line x1={tx} x2={tx} y1={T} y2={B} stroke="#9A9483" strokeDasharray="3 3" />
      <text x={tx - L < 20 ? L : tx} y={B + 14} textAnchor={tx - L < 20 ? 'start' : tx > R - 24 ? 'end' : 'middle'} className="chart-t strong">
        {today === 0 ? 'Planted today' : 'Today'}
      </text>
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
