// hi-fi/cards.jsx — hero summary, instruments, section comparison, transposition

// ─── Hero Summary (top-of-page) ────────────────────────────────────────────
// Shows: key + mode + confidence, BPM/time sig, progression fingerprint,
// duration, file. Sheet-music inspired: italic descriptors, large display type.
const HeroSummary = () => {
  const k = ANALYSIS.key;
  const keyLabel = `${k.root} ${k.mode_quality}`;
  const lowConfidence = k.key_confidence < 0.6;

  return (
    <Card padded={false}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1.2fr 1fr',
        gap: 0,
        alignItems: 'stretch',
      }}>
        {/* KEY */}
        <div style={{ padding: '24px 26px', borderRight: '1px solid var(--rule-soft)' }}>
          <div className="d-eyebrow">key + mode</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span className="d-display" style={{ fontSize: 68, color: 'var(--ink)' }}>{k.root}</span>
            <span className="d-display-i" style={{ fontSize: 36, color: 'var(--accent)' }}>
              {k.mode_quality}
            </span>
          </div>
          <div className="d-italic-explain" style={{ marginTop: 4 }}>
            <span style={{ color: 'var(--ink-2)' }}>{k.mode_name}</span> mode
            <span style={{ marginLeft: 8, color: 'var(--ink-3)' }}>
              · confidence {(k.key_confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ConfidenceDots v={k.key_confidence} />
            {lowConfidence && <Pill style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>uncertain</Pill>}
          </div>
        </div>

        {/* TEMPO */}
        <div style={{ padding: '24px 26px', borderRight: '1px solid var(--rule-soft)' }}>
          <div className="d-eyebrow">tempo</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <span className="d-mono" style={{ fontSize: 56, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {Math.round(ANALYSIS.bpm)}
            </span>
            <span className="d-italic-explain" style={{ fontSize: 18 }}>bpm</span>
          </div>
          <div className="d-italic-explain" style={{ marginTop: 4 }}>
            {ANALYSIS.timeSig} time · andante
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
            <BeatPulse />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              steady · σ ±0.4 BPM
            </span>
          </div>
        </div>

        {/* PROGRESSION */}
        <div style={{ padding: '24px 26px', borderRight: '1px solid var(--rule-soft)' }}>
          <div className="d-eyebrow">progression fingerprint</div>
          <div className="d-mono" style={{
            fontSize: 30, marginTop: 8, color: 'var(--ink)', letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>i</span>
            <ProgArrow />
            <span>V</span>
            <ProgArrow />
            <span style={{ color: 'var(--accent)' }}>VI</span>
            <ProgArrow />
            <span>III</span>
          </div>
          <div className="d-italic-explain" style={{ marginTop: 6 }}>
            classic minor — descending bass over A→E→F→C
          </div>
        </div>

        {/* DURATION + FILE */}
        <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="d-eyebrow">duration</div>
            <div className="d-display" style={{ fontSize: 44, marginTop: 6 }}>
              {fmtTime(ANALYSIS.duration)}
            </div>
            <div className="d-italic-explain" style={{ marginTop: 2 }}>
              8 sections · {ANALYSIS.beats.length} beats
            </div>
          </div>
          <div style={{
            marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon.Note color="var(--ink-3)" size={14}/>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="d-mono" style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ANALYSIS.filename}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ANALYSIS.fileMeta}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Tiny "→" with a sheet-music feel
const ProgArrow = () => (
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" style={{ color: 'var(--ink-4)' }}>
    <path d="M1 7h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Pulsing beat indicator
const BeatPulse = () => {
  const period = 60 / ANALYSIS.bpm;
  return (
    <>
      <style>{`
        @keyframes hifi-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }
      `}</style>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--accent)',
        animation: `hifi-pulse ${period}s ease-in-out infinite`,
        boxShadow: '0 0 8px var(--accent)',
      }}/>
    </>
  );
};

// ─── Instruments card ──────────────────────────────────────────────────────
const InstrumentsCard = () => (
  <Card title="Instruments"
    right={<Pill>{ANALYSIS.stems.length} stems</Pill>}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ANALYSIS.stems.map((s, i) => {
        const low = s.conf < 0.6;
        return (
          <div key={s.id} style={{
            display: 'grid',
            gridTemplateColumns: '20px 1fr auto auto',
            alignItems: 'center',
            gap: 12,
            padding: '8px 4px',
            borderBottom: i < ANALYSIS.stems.length - 1 ? '1px dashed var(--rule-soft)' : 'none',
          }}>
            <StemGlyph kind={s.id}/>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{s.label}</span>
                {low && <span className="d-italic-explain" style={{ fontSize: 12, color: 'var(--warn)' }}>could also be synth</span>}
              </div>
              {s.range && (
                <span className="d-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {s.range.min} – {s.range.max} <span style={{ color: 'var(--ink-4)' }}>· median {s.range.median}</span>
                </span>
              )}
            </div>
            <span className="d-mono" style={{ fontSize: 11, color: low ? 'var(--warn)' : 'var(--ink-2)' }}>
              {(s.conf * 100).toFixed(0)}%
            </span>
            <ConfidenceDots v={s.conf} color={low ? 'var(--warn)' : 'var(--accent)'}/>
          </div>
        );
      })}
    </div>
  </Card>
);

// Simple monoline glyphs for stems
const StemGlyph = ({ kind }) => {
  const c = 'var(--ink-2)';
  if (kind === 'vocals') return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
      <rect x="9" y="3.5" width="6" height="11" rx="3"/>
      <path d="M5 12a7 7 0 0014 0M12 19v3M9 22h6"/>
    </svg>
  );
  if (kind === 'drums') return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={c} strokeWidth="1.4">
      <ellipse cx="12" cy="6" rx="8" ry="2.4"/>
      <path d="M4 6v8.5c0 1.3 3.6 2.5 8 2.5s8-1.2 8-2.5V6" strokeLinecap="round"/>
      <line x1="6.5" y1="14" x2="3.5" y2="20.5" strokeLinecap="round"/>
      <line x1="17.5" y1="14" x2="20.5" y2="20.5" strokeLinecap="round"/>
    </svg>
  );
  if (kind === 'bass') return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
      <path d="M3 19c0-3 2-5 5-5s3 2 5 2 4-3 7-3"/>
      <circle cx="5" cy="19" r="2"/>
      <circle cx="20" cy="13" r="2"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
      <path d="M14 3l5 5-9 9-3 3-3-3 3-3 9-9z"/>
      <circle cx="7" cy="17" r="1"/>
    </svg>
  );
};

// ─── Section comparison table ──────────────────────────────────────────────
const SectionComparison = () => {
  const stats = ANALYSIS.sectionStats;
  const maxBy = (key) => Math.max(...stats.map(s => s[key]));
  const minBy = (key) => Math.min(...stats.map(s => s[key]));

  const Bar = ({ value, k, color }) => {
    const lo = minBy(k), hi = maxBy(k);
    const f = (value - lo) / (hi - lo || 1);
    return (
      <div style={{ position: 'relative', height: 4, background: 'var(--rule-soft)', borderRadius: 2, marginTop: 4 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${Math.max(8, f * 100)}%`,
          background: color, borderRadius: 2,
        }}/>
      </div>
    );
  };

  return (
    <Card title="Section comparison" italicTitle="— averages across all instances">
      <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--rule)' }}>
            {['section', '#', 'loudness', 'brightness', 'tension', 'density'].map((h, i) => (
              <th key={i} style={{
                textAlign: i === 0 ? 'left' : 'right', padding: '6px 8px',
                fontSize: 10, fontWeight: 500,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-3)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} style={{ borderBottom: i < stats.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
              <td style={{ padding: '8px 8px' }}>
                <SectionChip label={s.label}/>
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
                ×{s.instances}
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right', minWidth: 90 }}>
                <div className="d-mono" style={{ fontSize: 12 }}>{s.lufs.toFixed(1)} <span style={{ color: 'var(--ink-3)' }}>LUFS</span></div>
                <Bar value={s.lufs} k="lufs" color="color-mix(in oklab, var(--section-verse-i) 70%, transparent)"/>
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right', minWidth: 90 }}>
                <div className="d-mono" style={{ fontSize: 12 }}>{Math.round(s.bright)} <span style={{ color: 'var(--ink-3)' }}>Hz</span></div>
                <Bar value={s.bright} k="bright" color="color-mix(in oklab, var(--section-bridge-i) 70%, transparent)"/>
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right', minWidth: 80 }}>
                <div className="d-mono" style={{ fontSize: 12 }}>{s.tension.toFixed(2)}</div>
                <Bar value={s.tension} k="tension" color="var(--accent)"/>
              </td>
              <td style={{ padding: '8px 8px', textAlign: 'right', minWidth: 80 }}>
                <div className="d-mono" style={{ fontSize: 12 }}>{s.density.toFixed(1)} <span style={{ color: 'var(--ink-3)' }}>stems</span></div>
                <Bar value={s.density} k="density" color="color-mix(in oklab, var(--section-inst-i) 70%, transparent)"/>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  );
};

// ─── Pitch class card (wraps wheel) ────────────────────────────────────────
const PitchClassCard = () => (
  <Card title="Pitch class" italicTitle="— tonic-relative"
    right={<Pill>aeolian fit</Pill>}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
      <div>
        <p className="d-italic-explain" style={{ margin: 0 }}>
          The 1, b3, 5, b6 and b7 carry the song — a textbook A aeolian palette. 
          The b2 and major 7th hardly appear; treat them as <span style={{ color: 'var(--warn)' }}>avoid notes</span> when soloing.
        </p>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SmallBar label="b3" v={0.71} note="minor third — defines the mode" highlight/>
          <SmallBar label="5"  v={0.65} note="anchor"/>
          <SmallBar label="b6" v={0.52} note="aeolian color tone" highlight/>
          <SmallBar label="b7" v={0.44} note="cadential pull"/>
        </div>
      </div>
      <PitchClassWheel size={220}/>
    </div>
  </Card>
);

const SmallBar = ({ label, v, note, highlight }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 10, alignItems: 'center' }}>
    <span className="d-mono" style={{ fontSize: 12, color: highlight ? 'var(--accent)' : 'var(--ink-2)', fontWeight: highlight ? 600 : 500 }}>{label}</span>
    <div style={{ height: 5, background: 'var(--rule-soft)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${v * 100}%`, height: '100%',
        background: highlight ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 55%, var(--paper-edge))' }}/>
    </div>
    <span className="d-italic-explain" style={{ fontSize: 12 }}>{note}</span>
  </div>
);

// ─── Transposition (brass knob) ────────────────────────────────────────────
const TranspositionCard = () => {
  const [semi, setSemi] = React.useState(0);
  const all = ANALYSIS.transpose;
  const current = all.find(s => s.semitones === semi) || all[2];

  return (
    <Card title="Transposition"
      italicTitle="— shift the key, see who could sing it"
      right={<Pill>vocal range: A3 — E5</Pill>}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'center' }}>
        {/* Brass knob */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Knob value={semi} min={-4} max={4} step={2} size={180}
            onChange={setSemi} unit="" />
          <Screen style={{ minWidth: 160, textAlign: 'center', fontSize: 14 }}>
            {semi > 0 ? '+' : ''}{semi}  semi · {current.newKey.toUpperCase()}
          </Screen>
        </div>

        {/* Stacked range bars for each transposition */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {all.map((s, i) => {
            const isCurrent = s.semitones === semi;
            return (
              <div key={s.semitones}
                onClick={() => setSemi(s.semitones)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 130px 1fr 1fr',
                  gap: 14, alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isCurrent ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'transparent',
                  border: isCurrent ? '1px solid color-mix(in oklab, var(--accent) 35%, transparent)' : '1px solid transparent',
                }}>
                <span className="d-mono" style={{
                  fontSize: 13, color: isCurrent ? 'var(--accent)' : 'var(--ink-3)',
                  fontWeight: isCurrent ? 600 : 500,
                }}>
                  {s.semitones > 0 ? '+' : ''}{s.semitones} st
                </span>
                <span className="d-display" style={{
                  fontSize: 20, color: isCurrent ? 'var(--accent)' : 'var(--ink)',
                }}>{s.newKey}</span>
                <VoiceRange range={s.range}/>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.voices.map(v => (
                    <VoicePill key={v} type={v} active={isCurrent}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

// Voice range as a piano-keyboard-like bar
const VoiceRange = ({ range }) => {
  // Map note name to MIDI for positioning
  const noteToMidi = (n) => {
    const m = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const match = n.match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return 60;
    return 12 + (parseInt(match[2]) + 1) * 12 + m[match[1]];
  };
  const minMidi = 36; // C2
  const maxMidi = 84; // C6
  const lo = noteToMidi(range.min);
  const hi = noteToMidi(range.max);
  const f1 = (lo - minMidi) / (maxMidi - minMidi);
  const f2 = (hi - minMidi) / (maxMidi - minMidi);

  return (
    <div style={{ position: 'relative', height: 14, background: 'var(--rule-soft)', borderRadius: 7 }}>
      <div style={{
        position: 'absolute',
        left: `${f1 * 100}%`,
        width: `${(f2 - f1) * 100}%`,
        top: 0, bottom: 0,
        background: 'linear-gradient(90deg, var(--accent-2), var(--accent))',
        borderRadius: 7,
        boxShadow: '0 1px 0 #ffffff20 inset',
      }}/>
      <span className="d-mono" style={{
        position: 'absolute', left: `${f1 * 100}%`, top: 16,
        fontSize: 10, color: 'var(--ink-3)', transform: 'translateX(-50%)',
      }}>{range.min}</span>
      <span className="d-mono" style={{
        position: 'absolute', left: `${f2 * 100}%`, top: 16,
        fontSize: 10, color: 'var(--ink-3)', transform: 'translateX(-50%)',
      }}>{range.max}</span>
    </div>
  );
};

const VoicePill = ({ type, active }) => {
  const swatch = {
    bass: '#4a3c2e',
    baritone: '#6b4a2a',
    tenor: '#a8541f',
    'mezzo-soprano': '#b96a37',
    soprano: '#d97e44',
  }[type] || 'var(--ink-3)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, padding: '2px 8px', borderRadius: 999,
      background: active ? 'var(--paper-3)' : 'transparent',
      border: '1px solid var(--rule)',
      color: 'var(--ink-2)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: swatch }}/>
      {type}
    </span>
  );
};

Object.assign(window, {
  HeroSummary, InstrumentsCard, SectionComparison, PitchClassCard, TranspositionCard,
});
