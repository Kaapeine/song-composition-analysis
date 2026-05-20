// hi-fi/components.jsx — shared primitives

// ─── Icons (hand-tuned, monoline) ──────────────────────────────────────────
const Icon = {
  Logo: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 22} height={p.size || 22} fill="none" {...p}>
      <path d="M9 3.5v12.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M9 3.5l9.5-1.6v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <ellipse cx="6.5" cy="16.2" rx="3.2" ry="2.4" stroke="currentColor" strokeWidth="1.6"/>
      <ellipse cx="16.0" cy="14.5" rx="3.2" ry="2.4" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  Sun: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" {...p}>
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.6"/>
      {[...Array(8)].map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 12 + Math.cos(a) * 6.5, y1 = 12 + Math.sin(a) * 6.5;
        const x2 = 12 + Math.cos(a) * 9.0, y2 = 12 + Math.sin(a) * 9.0;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>;
      })}
    </svg>
  ),
  Moon: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" {...p}>
      <path d="M19.5 14a8 8 0 1 1-9.5-9.5 6.5 6.5 0 0 0 9.5 9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  Play: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 18} height={p.size || 18} fill="currentColor" {...p}>
      <path d="M7 4.5v15l13-7.5z"/>
    </svg>
  ),
  Pause: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 18} height={p.size || 18} fill="currentColor" {...p}>
      <rect x="6" y="4.5" width="4.2" height="15" rx="1"/>
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/>
    </svg>
  ),
  Prev: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="currentColor" {...p}>
      <rect x="5" y="5" width="2" height="14" rx="0.5"/>
      <path d="M21 5L9 12l12 7z"/>
    </svg>
  ),
  Next: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="currentColor" {...p}>
      <rect x="17" y="5" width="2" height="14" rx="0.5"/>
      <path d="M3 5l12 7L3 19z"/>
    </svg>
  ),
  Share: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <circle cx="6" cy="12" r="2.2"/>
      <circle cx="18" cy="6" r="2.2"/>
      <circle cx="18" cy="18" r="2.2"/>
      <path d="M8 11l8-4M8 13l8 4" strokeLinecap="round"/>
    </svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
      <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5"/>
      <path d="M4 18.5h16"/>
    </svg>
  ),
  Copy: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <rect x="8.5" y="3.5" width="11" height="13" rx="1.5"/>
      <path d="M4.5 8v11.5a1.5 1.5 0 001.5 1.5h9.5" strokeLinecap="round"/>
    </svg>
  ),
  PDF: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M6 3.5h8l4 4v13a1 1 0 01-1 1H6a1 1 0 01-1-1v-16a1 1 0 011-1z" strokeLinejoin="round"/>
      <path d="M14 3.5v4h4" strokeLinejoin="round"/>
      <text x="7" y="17.5" fontSize="5" fontFamily="JetBrains Mono" fontWeight="700" fill="currentColor" stroke="none">PDF</text>
    </svg>
  ),
  Note: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
      <path d="M4 5h16M4 10h16M4 15h10" strokeLinecap="round"/>
      <path d="M17 14l4 4-2 2-4-4z" strokeLinejoin="round"/>
    </svg>
  ),
  Upload: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
      <path d="M12 17V5m0 0l-5 5m5-5l5 5"/>
      <path d="M4 20.5h16"/>
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 12.5L9.5 18 20 6.5"/>
    </svg>
  ),
  Dot: (p) => (
    <svg viewBox="0 0 24 24" width={p.size || 8} height={p.size || 8} fill="currentColor" {...p}><circle cx="12" cy="12" r="6"/></svg>
  ),
};

// ─── Card / Section ────────────────────────────────────────────────────────
const Card = ({ title, italicTitle, eyebrow, right, children, style = {}, padded = true }) => (
  <section className="paper-card" style={style}>
    {(title || eyebrow || right) && (
      <header className="card-head">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          {eyebrow && <span className="d-eyebrow">{eyebrow}</span>}
          {title && (
            <h3 className="title" style={{ margin: 0 }}>
              {title}
              {italicTitle && <em style={{ marginLeft: 8, fontSize: 18 }}>{italicTitle}</em>}
            </h3>
          )}
        </div>
        {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
      </header>
    )}
    {padded ? <div className="card-pad">{children}</div> : children}
  </section>
);

// ─── Section chip (re-themed) ──────────────────────────────────────────────
const SectionChip = ({ label, big, style = {} }) => (
  <span className="sc" style={{
    background: sectionVar(label, 'fill'),
    color: sectionVar(label, 'ink'),
    fontSize: big ? 12 : 11,
    padding: big ? '3px 12px' : '2px 9px',
    ...style,
  }}>
    <span className="dot" style={{ background: sectionVar(label, 'ink') }} />
    {label}
  </span>
);

// ─── Pill ──────────────────────────────────────────────────────────────────
const Pill = ({ children, accent, style = {} }) => (
  <span className={`pill ${accent ? 'accent' : ''}`} style={style}>{children}</span>
);

// ─── Toggle (skeuomorphic) ─────────────────────────────────────────────────
const Toggle = ({ on, onChange, label }) => (
  <div role="switch" aria-checked={on} aria-label={label}
    className={`tg ${on ? 'on' : ''}`} onClick={() => onChange && onChange(!on)} />
);

// ─── Confidence dots ───────────────────────────────────────────────────────
const ConfidenceDots = ({ v, color }) => {
  const n = Math.round(v * 5);
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[0,1,2,3,4].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < n ? (color || 'var(--accent)') : 'color-mix(in oklab, var(--ink) 15%, transparent)',
        }} />
      ))}
    </span>
  );
};

// ─── Big inset display "tape screen" ───────────────────────────────────────
const Screen = ({ children, style = {} }) => (
  <div className="screen" style={style}>{children}</div>
);

// ─── Knob (skeuomorphic dial) ──────────────────────────────────────────────
// Used for the transposition selector. Click ticks or drag.
const Knob = ({ value, min = -4, max = 4, step = 2, onChange, size = 120, labels = [], unit = '' }) => {
  const ref = React.useRef(null);
  const dragging = React.useRef(false);
  const range = max - min;
  const ANGLE_MIN = -135, ANGLE_MAX = 135;
  const angle = ANGLE_MIN + ((value - min) / range) * (ANGLE_MAX - ANGLE_MIN);
  const ticks = [];
  for (let v = min; v <= max; v += step) ticks.push(v);

  const angleFor = (v) => ANGLE_MIN + ((v - min) / range) * (ANGLE_MAX - ANGLE_MIN);

  const handleMove = (e) => {
    if (!dragging.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dy = e.clientY - cy, dx = e.clientX - cx;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg > 180) deg -= 360;
    deg = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, deg));
    let raw = min + ((deg - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN)) * range;
    const snapped = Math.round(raw / step) * step;
    if (snapped !== value) onChange && onChange(snapped);
  };
  React.useEffect(() => {
    const up = () => { dragging.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', up); };
  });

  const start = (e) => { dragging.current = true; document.body.style.cursor = 'grabbing'; handleMove(e); };

  const R = size / 2;
  return (
    <div ref={ref} style={{ width: size, height: size, position: 'relative', userSelect: 'none' }}>
      {/* tick marks */}
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {ticks.map((v, i) => {
          const a = (angleFor(v) - 90) * Math.PI / 180;
          const ri = R - 4, ro = R - 12;
          const x1 = R + Math.cos(a) * ri, y1 = R + Math.sin(a) * ri;
          const x2 = R + Math.cos(a) * ro, y2 = R + Math.sin(a) * ro;
          const lx = R + Math.cos(a) * (ro - 8), ly = R + Math.sin(a) * (ro - 8);
          const active = v === value;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={active ? 'var(--accent)' : 'var(--ink-3)'}
                strokeWidth={active ? 2 : 1} strokeLinecap="round" />
              <text x={lx} y={ly + 3} textAnchor="middle"
                fontFamily="JetBrains Mono" fontSize="9.5"
                fill={active ? 'var(--accent)' : 'var(--ink-3)'}
                style={{ fontWeight: active ? 600 : 400 }}>
                {(labels[i] != null) ? labels[i] : `${v > 0 ? '+' : ''}${v}${unit}`}
              </text>
            </g>
          );
        })}
      </svg>

      {/* brass knob body */}
      <div
        onMouseDown={start}
        style={{
          position: 'absolute',
          left: 24, top: 24, right: 24, bottom: 24,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--accent-2) 50%, #f6deb5) 0%, color-mix(in oklab, var(--accent) 60%, #a86a3a) 65%, color-mix(in oklab, var(--accent) 50%, #4a2a16) 100%)',
          boxShadow:
            '0 1px 0 #ffffff60 inset, 0 -2px 6px #00000040 inset, 0 6px 12px -2px #00000050',
          cursor: 'grab',
        }}
      >
        {/* concentric ring */}
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #ffffff10, #00000020, #ffffff15, #00000018, #ffffff10)',
          maskImage: 'radial-gradient(circle, transparent 60%, black 62%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 60%, black 62%)',
        }} />
        {/* pointer */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 3, height: (size / 2) - 24,
          background: '#1a120a',
          transformOrigin: 'top center',
          transform: `translate(-50%, 0) rotate(${angle + 180}deg)`,
          borderRadius: 2,
          boxShadow: '0 0 0 1px #ffffff30',
        }}>
          <span style={{
            position: 'absolute', left: -1.5, top: 3,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)', boxShadow: '0 0 6px var(--accent), 0 0 0 1px #1a120a',
          }} />
        </div>
        {/* central jewel */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 14, height: 14, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle at 35% 30%, #fff8e0, #c89358 70%, #3a1f0a)',
          boxShadow: '0 1px 2px #00000060, 0 0 0 1px #ffffff30 inset',
        }} />
      </div>
    </div>
  );
};

// ─── Crosshair context (shared playhead time across lanes) ─────────────────
const CrosshairContext = React.createContext({ t: null, setT: () => {}, playT: 70 });
const useCrosshair = () => React.useContext(CrosshairContext);
const CrosshairProvider = ({ children, playT = 70 }) => {
  const [t, setT] = React.useState(null);
  return <CrosshairContext.Provider value={{ t, setT, playT }}>{children}</CrosshairContext.Provider>;
};

// ─── Tiny stat ─────────────────────────────────────────────────────────────
const Stat = ({ value, unit, label, mono, big }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <div className={mono ? 'd-mono' : 'd-display'} style={{
      fontSize: big ? 44 : 30,
      lineHeight: 1, color: 'var(--ink)',
      letterSpacing: mono ? '0' : '-0.015em',
      fontWeight: mono ? 500 : 400,
    }}>
      {value}
      {unit && <span style={{ fontSize: big ? 18 : 14, marginLeft: 6, color: 'var(--ink-3)', fontFamily: 'var(--font-ui)', fontWeight: 400 }}>{unit}</span>}
    </div>
    {label && <div className="d-eyebrow">{label}</div>}
  </div>
);

// ─── Button ────────────────────────────────────────────────────────────────
const Button = ({ children, primary, ghost, iconOnly, onClick, title, style = {} }) => (
  <button
    className={`btn ${primary ? 'primary' : ''} ${ghost ? 'ghost' : ''} ${iconOnly ? 'icon-only' : ''}`}
    onClick={onClick} title={title} style={style}>
    {children}
  </button>
);

Object.assign(window, {
  Icon, Card, SectionChip, Pill, Toggle, ConfidenceDots, Screen, Knob,
  CrosshairProvider, useCrosshair, Stat, Button,
});
