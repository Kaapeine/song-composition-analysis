// hi-fi/waveform.jsx — refined waveform with sheet-music section bars

const useElementWidth = (defaultW = 1000) => {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(defaultW);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
};

const Waveform = ({
  height = 220,
  showBeats = true,
  showDownbeats = true,
  showChords = true,
  showSections = true,
  onSeek = null,
  selectedChord = null,
  onChordClick = null,
}) => {
  const [ref, w] = useElementWidth(1100);
  const { t: hoverT, setT, playT } = useCrosshair();

  const dur = ANALYSIS.duration;
  const peaks = ANALYSIS.waveform;

  const sectionH = 22;
  const chordH = 26;
  const beatH = 14;
  const waveH = height - sectionH - chordH - beatH;
  const mid = sectionH + waveH / 2;

  const xFor = (t) => (t / dur) * w;

  // Build sample wave (mirrored)
  const stepX = w / peaks.length;
  const bars = peaks.map((p, i) => {
    const x = i * stepX;
    const h = Math.max(1.2, p * (waveH / 2 - 8));
    return { x, h };
  });

  const handleMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const t = Math.max(0, Math.min(dur, (x / r.width) * dur));
    setT(t);
  };
  const handleLeave = () => setT(null);
  const handleClick = (e) => {
    if (!onSeek) return;
    const r = ref.current.getBoundingClientRect();
    onSeek((e.clientX - r.left) / r.width);
  };

  const t = hoverT ?? playT;
  const tX = xFor(t);
  const playX = xFor(playT);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', width: '100%', height, cursor: onSeek ? 'pointer' : 'default' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      <svg width={w} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="wfShade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.85" />
            <stop offset="50%" stopColor="var(--ink)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--ink)" stopOpacity="0.85" />
          </linearGradient>
          <pattern id="paperGrain" patternUnits="userSpaceOnUse" width="3" height="3">
            <rect width="3" height="3" fill="transparent"/>
            <circle cx="1" cy="1" r="0.3" fill="var(--ink)" opacity="0.05"/>
          </pattern>
        </defs>

        {/* Section bars — sheet music style */}
        {showSections && ANALYSIS.sections.map((s, i) => {
          const x = xFor(s.start);
          const ww = xFor(s.end) - x;
          return (
            <g key={i}>
              {/* full-height tint */}
              <rect x={x} y={sectionH} width={ww} height={waveH} fill={sectionVar(s.label, 'fill')} opacity="0.25"/>
              {/* top label band */}
              <rect x={x} y={0} width={ww} height={sectionH} fill={sectionVar(s.label, 'fill')} />
              <line x1={x} x2={x} y1={0} y2={sectionH + waveH} stroke="var(--rule)" strokeWidth="0.75" />
              {ww > 36 && (
                <text x={x + 8} y={sectionH - 7}
                  fontFamily="var(--font-ui)" fontSize="10.5"
                  fontWeight="600"
                  letterSpacing="0.12em"
                  fill={sectionVar(s.label, 'ink')}>
                  {s.label.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {/* faint paper grain over wave */}
        <rect x="0" y={sectionH} width={w} height={waveH} fill="url(#paperGrain)"/>

        {/* Waveform bars — mirrored, antialiased look */}
        {bars.map((b, i) => (
          <rect key={i}
            x={b.x}
            y={mid - b.h}
            width={Math.max(0.8, stepX - 0.6)}
            height={b.h * 2}
            rx="0.6"
            fill="url(#wfShade)"
            opacity="0.78"
          />
        ))}

        {/* mid line */}
        <line x1={0} x2={w} y1={mid} y2={mid} stroke="var(--ink)" strokeWidth="0.5" opacity="0.18"/>

        {/* beat ticks */}
        {showBeats && ANALYSIS.beats.map((b, i) => {
          const x = xFor(b);
          const y = sectionH + waveH;
          return <line key={i} x1={x} x2={x} y1={y} y2={y + 5} stroke="var(--ink-3)" strokeWidth="0.6"/>;
        })}
        {showDownbeats && ANALYSIS.downbeats.map((b, i) => {
          const x = xFor(b);
          const y = sectionH + waveH;
          return <line key={i} x1={x} x2={x} y1={y} y2={y + 10} stroke="var(--ink-2)" strokeWidth="1.3"/>;
        })}

        {/* chord ribbon */}
        {showChords && (() => {
          const yBase = sectionH + waveH + beatH;
          // group every 2 chord cells visually (downbeat aligned)
          const cells = ANALYSIS.chords.filter((_, i) => i % 2 === 0);
          return cells.map((c, i) => {
            const x = xFor(c.start);
            const next = cells[i + 1];
            const endX = next ? xFor(next.start) : xFor(dur);
            const ww = Math.max(8, endX - x - 1);
            const isSelected = selectedChord != null && selectedChord === c.roman;
            return (
              <g key={i} style={{ cursor: onChordClick ? 'pointer' : 'default' }}
                onClick={(e) => { e.stopPropagation(); onChordClick && onChordClick(c.roman); }}>
                <rect x={x + 0.5} y={yBase + 3} width={ww} height={chordH - 6}
                  fill={isSelected ? 'color-mix(in oklab, var(--accent) 35%, var(--paper-3))' : 'var(--paper-3)'}
                  stroke={isSelected ? 'var(--accent)' : 'var(--rule)'} strokeWidth="0.85"
                  rx="3"/>
                {ww > 14 && (
                  <text x={x + ww/2 + 0.5} y={yBase + chordH - 9}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)" fontSize="11" fontWeight="500"
                    fill={isSelected ? 'var(--accent-ink)' : 'var(--ink)'}>
                    {c.roman}
                  </text>
                )}
              </g>
            );
          });
        })()}

        {/* hover crosshair */}
        {hoverT != null && (
          <line x1={tX} x2={tX} y1={0} y2={height}
            stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6"/>
        )}

        {/* playhead */}
        <g>
          <line x1={playX} x2={playX} y1={0} y2={height}
            stroke="var(--accent)" strokeWidth="1.4"/>
          <polygon points={`${playX-5},0 ${playX+5},0 ${playX},6`} fill="var(--accent)"/>
          <circle cx={playX} cy={mid} r="3.5" fill="var(--accent)" stroke="var(--paper-3)" strokeWidth="1.2"/>
        </g>
      </svg>

      {/* time legend along bottom */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)',
        position: 'absolute', left: 0, right: 0, bottom: -16,
      }}>
        <span>0:00</span>
        <span>{fmtTime(dur * 0.25)}</span>
        <span>{fmtTime(dur * 0.5)}</span>
        <span>{fmtTime(dur * 0.75)}</span>
        <span>{fmtTime(dur)}</span>
      </div>

      {/* hover readout */}
      {hoverT != null && (
        <div style={{
          position: 'absolute',
          left: Math.min(Math.max(tX + 8, 0), w - 130),
          top: 2,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          background: 'var(--paper-3)', color: 'var(--ink)',
          border: '1px solid var(--rule)', borderRadius: 4,
          padding: '3px 6px',
          boxShadow: '0 4px 10px -4px #00000022',
          pointerEvents: 'none',
        }}>
          {fmtTime(hoverT)}
        </div>
      )}
    </div>
  );
};

window.Waveform = Waveform;
