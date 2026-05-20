// hi-fi/wheel.jsx — pitch class wheel (radial bar chart, tonic-relative)

const PitchClassWheel = ({ size = 240, onHover }) => {
  const order = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
  const data = ANALYSIS.pitchClass;
  const avoid = new Set(ANALYSIS.avoidNotes);
  const cx = size / 2, cy = size / 2;
  const inner = size * 0.20;
  const outer = size * 0.42;
  const labelR = size * 0.475;
  const [hover, setHover] = React.useState(null);

  const arc = 360 / order.length;

  const polar = (r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const arcPath = (r1, r2, a1, a2) => {
    const [x1, y1] = polar(r1, a1);
    const [x2, y2] = polar(r1, a2);
    const [x3, y3] = polar(r2, a2);
    const [x4, y4] = polar(r2, a1);
    const large = (a2 - a1) > 180 ? 1 : 0;
    return `M${x1},${y1} A${r1},${r1} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 ${large} 0 ${x4},${y4} Z`;
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size}>
        {/* concentric guides */}
        {[0.25, 0.5, 0.75, 1].map((f, i) => (
          <circle key={i} cx={cx} cy={cy} r={inner + (outer - inner) * f}
            fill="none" stroke="var(--ink)" opacity="0.06" strokeWidth="0.8"/>
        ))}
        {/* inner cream disk */}
        <circle cx={cx} cy={cy} r={inner - 6}
          fill="var(--paper-3)" stroke="var(--rule)" strokeWidth="0.8"/>

        {/* radial bars */}
        {order.map((iv, i) => {
          const v = data[iv];
          const a1 = i * arc + 2;
          const a2 = (i + 1) * arc - 2;
          const r2 = inner + (outer - inner) * v;
          const isAvoid = avoid.has(iv);
          const isTonic = iv === '1';
          const isHover = hover === iv;
          const fillColor = isTonic
            ? 'var(--accent)'
            : isAvoid
              ? 'color-mix(in oklab, var(--ink) 25%, var(--paper-edge))'
              : 'color-mix(in oklab, var(--accent) 55%, var(--paper-3))';
          return (
            <g key={iv}
              onMouseEnter={() => { setHover(iv); onHover && onHover(iv); }}
              onMouseLeave={() => { setHover(null); onHover && onHover(null); }}
              style={{ cursor: 'pointer' }}>
              <path d={arcPath(inner, r2, a1, a2)}
                fill={fillColor}
                opacity={isHover ? 1 : 0.92}
                stroke={isHover ? 'var(--ink)' : 'none'}
                strokeWidth="1"/>
            </g>
          );
        })}

        {/* labels */}
        {order.map((iv, i) => {
          const a = i * arc + arc / 2;
          const [lx, ly] = polar(labelR, a);
          const isAvoid = avoid.has(iv);
          const isTonic = iv === '1';
          return (
            <g key={iv}>
              <text x={lx} y={ly + 4} textAnchor="middle"
                fontFamily="var(--font-mono)" fontSize="11"
                fontWeight={isTonic ? 700 : 500}
                fill={isAvoid ? 'var(--ink-4)' : 'var(--ink)'}
                style={{ textDecoration: isAvoid ? 'line-through' : 'none' }}>
                {iv}
              </text>
            </g>
          );
        })}

        {/* center label */}
        <text x={cx} y={cy - 2} textAnchor="middle"
          fontFamily="var(--font-display)" fontSize="14" fontStyle="italic"
          fill="var(--ink-3)">tonic</text>
        <text x={cx} y={cy + 16} textAnchor="middle"
          fontFamily="var(--font-display)" fontSize="22" fill="var(--accent)">A</text>
      </svg>

      {hover && (
        <div style={{
          position: 'absolute', left: '50%', bottom: -34, transform: 'translateX(-50%)',
          background: 'var(--paper-3)', border: '1px solid var(--rule)', borderRadius: 4,
          padding: '4px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)',
          whiteSpace: 'nowrap', boxShadow: '0 4px 10px -4px #00000030',
        }}>
          <strong>{hover}</strong>
          <span style={{ color: 'var(--ink-3)' }}> · {INTERVAL_NAMES[hover]} · {(data[hover] * 100).toFixed(0)}%</span>
          {avoid.has(hover) && <span style={{ color: 'var(--warn)' }}> · avoid</span>}
        </div>
      )}
    </div>
  );
};

window.PitchClassWheel = PitchClassWheel;
