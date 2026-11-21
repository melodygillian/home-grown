// Cartoon drawings for each plant "look" in the catalog (daisy, cluster, grass, ...).
const STEM = '#4F8A3E';
const LEAF = '#6BAA4F';

function Stem({ d = 'M30 62 C30 52 30 44 30 34' }) {
  return <path d={d} stroke={STEM} strokeWidth="3.5" fill="none" strokeLinecap="round" />;
}
function Leaf({ cx, cy, rot }) {
  return <ellipse cx={cx} cy={cy} rx="8" ry="4" fill={LEAF} transform={`rotate(${rot} ${cx} ${cy})`} />;
}
function Face({ cx = 30, cy = 24, color = '#FFFFFF' }) {
  return (
    <g>
      <circle cx={cx - 3} cy={cy - 1} r="1.4" fill={color} />
      <circle cx={cx + 3} cy={cy - 1} r="1.4" fill={color} />
      <path d={`M${cx - 2.5} ${cy + 2.5} Q${cx} ${cy + 4.5} ${cx + 2.5} ${cy + 2.5}`} stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  );
}

const KINDS = {
  daisy: ({ c1, c2 }) => (
    <>
      <Stem />
      <Leaf cx={21} cy={50} rot={-30} />
      <g fill={c1}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <ellipse key={a} cx="30" cy="11" rx="5.5" ry="9" transform={`rotate(${a} 30 24)`} />
        ))}
      </g>
      <circle cx="30" cy="24" r="8" fill={c2} />
      <Face color={isLight(c2) ? '#5A3416' : '#FFFFFF'} />
    </>
  ),
  cluster: ({ c1, c2 }) => (
    <>
      <Stem d="M30 62 C30 52 30 42 30 30" />
      <Leaf cx={39} cy={48} rot={30} />
      <Leaf cx={21} cy={42} rot={-30} />
      <g fill={c1}>
        {[[20, 22, 6], [30, 18, 6.5], [40, 22, 6], [25, 12, 5.5], [35, 12, 5.5], [25, 27, 5.5], [35, 27, 5.5]].map(([x, y, r]) => (
          <circle key={x + '-' + y} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g fill={c2}>
        <circle cx="25" cy="11" r="2" />
        <circle cx="34" cy="17" r="2" />
        <circle cx="22" cy="21" r="2" />
        <circle cx="38" cy="25" r="1.8" />
      </g>
    </>
  ),
  grass: ({ c1, c2 }) => (
    <>
      <g fill="none" strokeLinecap="round" strokeWidth="4.5">
        <path d="M30 60 Q20 38 11 16" stroke={c1} />
        <path d="M30 60 Q27 34 24 7" stroke={c2} />
        <path d="M30 60 Q33 32 37 5" stroke={c1} />
        <path d="M30 60 Q40 38 49 15" stroke={c2} />
        <path d="M30 60 Q31 40 30 18" stroke={c1} />
      </g>
      <ellipse cx="30" cy="61" rx="12" ry="2.5" fill="rgba(0,0,0,0.12)" />
    </>
  ),
  pom: ({ c1, c2 }) => (
    <>
      <Stem d="M30 62 C30 52 30 42 30 32" />
      <Leaf cx={21} cy={48} rot={-30} />
      <Leaf cx={39} cy={44} rot={30} />
      <g stroke={c1} strokeWidth="4.5" strokeLinecap="round">
        {[[44, 20], [40, 30], [20, 30], [16, 20], [20, 10], [30, 5], [40, 10]].map(([x, y]) => (
          <line key={x + '-' + y} x1="30" y1="20" x2={x} y2={y} />
        ))}
      </g>
      <circle cx="30" cy="20" r="6.5" fill={c2} />
      <circle cx="28" cy="18" r="2" fill="#FFFFFF" opacity="0.6" />
    </>
  ),
  bell: ({ c1, c2 }) => (
    <>
      <path d="M24 62 C24 46 30 30 40 18" stroke={STEM} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Leaf cx={16} cy={50} rot={-25} />
      <circle cx="33" cy="22" r="3" fill={c1} />
      <circle cx="47" cy="22" r="3" fill={c1} />
      <path d="M31 24 Q40 12 49 24 L47 39 Q40 44 33 39 Z" fill={c1} />
      <ellipse cx="40" cy="40" rx="7" ry="4" fill={c2} />
      <circle cx="37" cy="29" r="1.4" fill={isLight(c1) ? '#4F6B3A' : '#FFFFFF'} />
      <circle cx="43" cy="29" r="1.4" fill={isLight(c1) ? '#4F6B3A' : '#FFFFFF'} />
    </>
  ),
  iris: ({ c1, c2 }) => (
    <>
      <Stem d="M30 62 C30 52 30 44 30 32" />
      <path d="M22 62 Q18 44 14 36" stroke={LEAF} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M38 62 Q42 46 46 38" stroke={LEAF} strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="13" rx="6.5" ry="11" fill={c1} opacity="0.85" />
      <ellipse cx="20" cy="26" rx="8" ry="12" fill={c1} transform="rotate(-40 20 26)" />
      <ellipse cx="40" cy="26" rx="8" ry="12" fill={c1} transform="rotate(40 40 26)" />
      <ellipse cx="21" cy="27" rx="2" ry="6" fill={c2} transform="rotate(-40 21 27)" />
      <ellipse cx="39" cy="27" rx="2" ry="6" fill={c2} transform="rotate(40 39 27)" />
    </>
  ),
  bush: ({ c1, c2 }) => (
    <>
      <ellipse cx="30" cy="60" rx="22" ry="3" fill="rgba(0,0,0,0.12)" />
      <g fill={c2}>
        <circle cx="18" cy="40" r="15" />
        <circle cx="42" cy="40" r="15" />
        <circle cx="30" cy="26" r="17" />
      </g>
      <circle cx="24" cy="20" r="5" fill="#FFFFFF" opacity="0.18" />
      <g fill={c1}>
        {[[20, 36], [25, 44], [38, 30], [43, 42], [33, 47], [29, 22]].map(([x, y]) => (
          <circle key={x + '-' + y} cx={x} cy={y} r="3.3" />
        ))}
      </g>
    </>
  ),
  fern: ({ c1, c2 }) => (
    <>
      <ellipse cx="30" cy="61" rx="14" ry="2.5" fill="rgba(0,0,0,0.12)" />
      <g fill={c1}>
        <ellipse cx="17" cy="36" rx="5.5" ry="21" transform="rotate(-38 17 36)" />
        <ellipse cx="43" cy="36" rx="5.5" ry="21" transform="rotate(38 43 36)" />
        <ellipse cx="24" cy="30" rx="5" ry="22" transform="rotate(-14 24 30)" />
        <ellipse cx="36" cy="30" rx="5" ry="22" transform="rotate(14 36 30)" />
      </g>
      <g stroke={c2} strokeWidth="1.2" opacity="0.6">
        <line x1="30" y1="60" x2="10" y2="20" />
        <line x1="30" y1="60" x2="50" y2="20" />
        <line x1="30" y1="60" x2="21" y2="10" />
        <line x1="30" y1="60" x2="39" y2="10" />
      </g>
      <circle cx="30" cy="22" r="4" fill="none" stroke={c2} strokeWidth="2.5" />
    </>
  ),
  spike: ({ c1, c2 }) => (
    <>
      <Stem d="M30 62 C30 52 30 44 30 30" />
      <Leaf cx={21} cy={52} rot={-30} />
      <Leaf cx={39} cy={46} rot={30} />
      <g fill={c1}>
        {[[30, 6, 3.2], [27, 12, 4], [33, 12, 4], [27, 19, 4.6], [33, 19, 4.6], [27, 27, 5], [33, 27, 5], [30, 33, 5]].map(([x, y, r]) => (
          <circle key={x + '-' + y} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g fill={c2}>
        <circle cx="30" cy="15" r="1.6" />
        <circle cx="30" cy="24" r="1.8" />
      </g>
    </>
  ),
  umbel: ({ c1, c2 }) => (
    <>
      <Stem d="M30 62 C30 52 30 44 30 30" />
      <path d="M30 30 L18 20 M30 30 L42 20 M30 30 L30 18" stroke={STEM} strokeWidth="2" strokeLinecap="round" />
      <Leaf cx={21} cy={50} rot={-30} />
      <ellipse cx="30" cy="17" rx="19" ry="8" fill={c2} opacity="0.5" />
      <g fill={c1}>
        {[12, 18, 24, 30, 36, 42, 48].map((x) => (
          <circle key={'a' + x} cx={x} cy={18} r="3.2" />
        ))}
        {[15, 21, 27, 33, 39, 45].map((x) => (
          <circle key={'b' + x} cx={x} cy={13} r="3.2" />
        ))}
      </g>
    </>
  ),
  ground: ({ c1, c2 }) => (
    <>
      <ellipse cx="30" cy="58" rx="24" ry="3" fill="rgba(0,0,0,0.12)" />
      <g fill={c2}>
        <ellipse cx="16" cy="48" rx="11" ry="7" />
        <ellipse cx="44" cy="48" rx="11" ry="7" />
        <ellipse cx="30" cy="42" rx="13" ry="9" />
        <ellipse cx="22" cy="54" rx="10" ry="5" />
        <ellipse cx="38" cy="54" rx="10" ry="5" />
      </g>
      {[[20, 34], [34, 30], [44, 38]].map(([x, y]) => (
        <g key={x + '-' + y}>
          <path d={`M${x} ${y + 4} L${x} ${y + 12}`} stroke={STEM} strokeWidth="2" />
          <g fill={c1}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={x} cy={y - 3.5} rx="2.6" ry="3.6" transform={`rotate(${a} ${x} ${y})`} />
            ))}
          </g>
          <circle cx={x} cy={y} r="2" fill="#F7C948" />
        </g>
      ))}
    </>
  ),
};

function isLight(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export default function Flower({ look, size = 56 }) {
  const Kind = KINDS[look?.kind] || KINDS.daisy;
  return (
    <svg width={size} height={size * (64 / 60)} viewBox="0 0 60 64" aria-hidden="true">
      <Kind c1={look?.c1 || '#F7B801'} c2={look?.c2 || '#5A3416'} />
    </svg>
  );
}
