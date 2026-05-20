// hi-fi/signals.jsx — synced signal lanes with shared crosshair

const SignalLane = ({
  label, unit, series, range, color, height = 76, ticks = [], step = false,
  callouts = [], showSections = true, last,
}) => {
  const [ref, w] = useElementWidth(900);
  const { t: hoverT, setT, playT } = useCrosshair();

  const dur = ANALYSIS.duration;
  const [lo, hi] = range;
  const pad = 8;
  const yTop = pad, yBot = height - pad;

  const xFor = (t) => (t / dur) * w;
  const yFor = (v) => yBot - ((v - lo) / (hi - lo)) * (yBot - yTop);

  const pts = series.map(([t, v]) => [xFor(t), yFor(v)]);
  const path = step
    ? pts.map((p, i) => i === 0 ? `M${p[0]},${p[1]}` : `H${p[0]} V${p[1]}`).join(' ')
    : 'M ' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
  const area = `M 0 ${yBot} L ` + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ') + ` L ${w} ${yBot} Z`;

  // value at hover
  const t = hoverT ?? playT;
  const idx = Math.max(0, Math.min(series.length - 1, Math.round((t / dur) * (series.length - 1))));
  const val = series[idx] ? series[idx][1] : null;
  const tX = xFor(t);

  const handleMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    setT(Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur)));
  };
  const handleLeave = () => setT(null);

  return (
    <div
      ref={ref}
      style={{
        position: 'relative', width: '100%', height,
        borderBottom: last ? 'none' : '1px solid var(--rule-soft)',
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <svg width={w} height={height} style={{ display: 'block' }}>
        {/* section bands faint */}
        {showSections && ANALYSIS.sections.map((s, i) => {
          const x = xFor(s.start), ww = xFor(s.end) - x;
          return <rect key={i} x={x} y={0} width={ww} height={height} fill={sectionVar(s.label, 'fill')} opacity="0.22"/>;
        })}

        {/* y-axis ticks (dotted grid) */}
        {ticks.map((v, i) => (
          <line key={i} x1={0} x2={w} y1={yFor(v)} y2={yFor(v)}
            stroke="var(--ink)" opacity="0.08" strokeDasharray="1 4"/>
        ))}

        {/* fill */}
        <path d={area} fill={color} opacity="0.13"/>
        {/* line */}
        <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>

        {/* callouts */}
        {callouts.map((c, i) => {
          const cx = xFor(c.t);
          const cIdx = Math.round((c.t / dur) * (series.length - 1));
          const cy = yFor(series[cIdx][1]);
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3" fill={color}/>
              <line x1={cx} x2={cx} y1={cy - 4} y2={6} stroke={color} strokeDasharray="2 2" strokeWidth="0.8" opacity="0.7"/>
              <text x={cx + 5} y={9}
                fontFamily="var(--font-display)" fontStyle="italic"
                fontSize="11.5" fill={color}>
                {c.label}
              </text>
            </g>
          );
        })}

        {/* hover crosshair */}
        {hoverT != null && (
          <>
            <line x1={tX} x2={tX} y1={0} y2={height} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6"/>
            <circle cx={tX} cy={yFor(val)} r="3.5" fill={color} stroke="var(--paper-3)" strokeWidth="1.2"/>
          </>
        )}

        {/* playhead (faint) */}
        <line x1={xFor(playT)} x2={xFor(playT)} y1={0} y2={height} stroke="var(--accent)" strokeWidth="1" opacity="0.35"/>
      </svg>

      {/* label badge (left) */}
      <div style={{
        position: 'absolute', left: 8, top: 6,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'color-mix(in oklab, var(--paper-3) 80%, transparent)',
        padding: '2px 8px', borderRadius: 999,
        border: '1px solid var(--rule)',
        fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--ink-2)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: color }}/>
        {label}
      </div>

      {/* y range right */}
      <div style={{
        position: 'absolute', right: 6, top: 4, bottom: 4,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-3)',
        pointerEvents: 'none',
      }}>
        <span>{hi}{unit}</span>
        <span>{lo}{unit}</span>
      </div>

      {/* hover readout */}
      {hoverT != null && val != null && (
        <div style={{
          position: 'absolute',
          left: Math.min(Math.max(tX + 8, 0), w - 96),
          top: yFor(val) - 28,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          background: 'var(--paper-3)',
          border: `1px solid ${color}`, borderRadius: 4,
          padding: '2px 6px',
          color: 'var(--ink)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {typeof val === 'number' ? val.toFixed(unit === '' ? 2 : 1) : val}{unit}
        </div>
      )}
    </div>
  );
};

// Chord lane (sits at top of the synced strip)
const ChordLaneTimeline = ({ height = 40, selectedChord, onChordClick }) => {
  const [ref, w] = useElementWidth(900);
  const { t: hoverT, setT, playT } = useCrosshair();
  const dur = ANALYSIS.duration;
  const xFor = (t) => (t / dur) * w;
  const tX = xFor(hoverT ?? playT);

  // pair chords (downbeat-aligned)
  const cells = ANALYSIS.chords.filter((_, i) => i % 2 === 0);

  const handleMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    setT(Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur)));
  };
  const handleLeave = () => setT(null);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height, borderBottom: '1px solid var(--rule-soft)' }}
      onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        {ANALYSIS.sections.map((s, i) => {
          const x = xFor(s.start), ww = xFor(s.end) - x;
          return <rect key={i} x={x} y={0} width={ww} height={height} fill={sectionVar(s.label, 'fill')} opacity="0.22"/>;
        })}
        {cells.map((c, i) => {
          const x = xFor(c.start);
          const next = cells[i + 1];
          const ww = (next ? xFor(next.start) : xFor(dur)) - x - 1;
          const selected = selectedChord === c.roman;
          return (
            <g key={i} style={{ cursor: onChordClick ? 'pointer' : 'default' }}
              onClick={() => onChordClick && onChordClick(c.roman)}>
              <rect x={x + 0.5} y={6} width={Math.max(8, ww)} height={height - 12}
                fill={selected ? 'color-mix(in oklab, var(--accent) 35%, var(--paper-3))' : 'var(--paper-3)'}
                stroke={selected ? 'var(--accent)' : 'var(--rule)'} strokeWidth="0.85" rx="3"/>
              {ww > 14 && (
                <text x={x + ww/2 + 0.5} y={height/2 + 4}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize="11" fontWeight="500"
                  fill={selected ? 'var(--accent-ink)' : 'var(--ink)'}>
                  {c.roman}
                </text>
              )}
            </g>
          );
        })}
        {hoverT != null && <line x1={tX} x2={tX} y1={0} y2={height} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6"/>}
        <line x1={xFor(playT)} x2={xFor(playT)} y1={0} y2={height} stroke="var(--accent)" strokeWidth="1" opacity="0.5"/>
      </svg>
      <div style={{
        position: 'absolute', left: 8, top: 6,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'color-mix(in oklab, var(--paper-3) 80%, transparent)',
        padding: '2px 8px', borderRadius: 999, border: '1px solid var(--rule)',
        fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-2)',
      }}>chords (roman)</div>
    </div>
  );
};

// Beat ruler lane (small)
const BeatRulerLane = ({ height = 26, last }) => {
  const [ref, w] = useElementWidth(900);
  const { t: hoverT, setT, playT } = useCrosshair();
  const dur = ANALYSIS.duration;
  const xFor = (t) => (t / dur) * w;

  const handleMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    setT(Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur)));
  };
  const handleLeave = () => setT(null);

  // major ticks every 15s
  const majors = [];
  for (let s = 0; s <= dur; s += 15) majors.push(s);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height, borderBottom: last ? 'none' : '1px solid var(--rule-soft)' }}
      onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        {ANALYSIS.beats.map((b, i) => {
          const x = xFor(b);
          return <line key={i} x1={x} x2={x} y1={6} y2={11} stroke="var(--ink-3)" strokeWidth="0.5"/>;
        })}
        {ANALYSIS.downbeats.map((b, i) => {
          const x = xFor(b);
          return <line key={i} x1={x} x2={x} y1={4} y2={14} stroke="var(--ink-2)" strokeWidth="1"/>;
        })}
        {majors.map((s, i) => {
          const x = xFor(s);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={4} y2={18} stroke="var(--ink)" strokeWidth="0.6" opacity="0.6"/>
              <text x={x + 3} y={height - 6} fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--ink-3)">
                {fmtTime(s)}
              </text>
            </g>
          );
        })}
        {hoverT != null && <line x1={xFor(hoverT)} x2={xFor(hoverT)} y1={0} y2={height} stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 3" opacity="0.7"/>}
        <line x1={xFor(playT)} x2={xFor(playT)} y1={0} y2={height} stroke="var(--accent)" strokeWidth="1" opacity="0.6"/>
      </svg>
    </div>
  );
};

Object.assign(window, { SignalLane, ChordLaneTimeline, BeatRulerLane });
