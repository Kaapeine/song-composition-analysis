// hi-fi/upload.jsx — Upload screen

const UploadScreen = ({ onAnalyze }) => {
  const [file, setFile] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);
  const [detectMode, setDetectMode] = React.useState(true);
  const [includeStems, setIncludeStems] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const inputRef = React.useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile({ name: f.name, size: f.size });
  };

  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto',
      padding: '32px 28px 80px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Heading */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="d-eyebrow" style={{ marginBottom: 8 }}>step 1 of 2 — upload</div>
          <h1 className="d-display" style={{ fontSize: 64, margin: 0, lineHeight: 1.0, letterSpacing: '-0.02em' }}>
            Drop a track,
            <br/>
            <em className="d-display-i" style={{ color: 'var(--accent)' }}>read its score.</em>
          </h1>
          <p className="d-italic-explain" style={{ marginTop: 14, maxWidth: 560, fontSize: 18 }}>
            We listen end-to-end and give you back the key, mode, BPM, chord progression, sections,
            tension curve, and a clean transposition map — usually in under two minutes.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Pill>POC build · local backend</Pill>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Dropzone (left) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card padded={false}>
            <div
              onClick={() => !file && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                position: 'relative',
                margin: 14,
                padding: '54px 32px',
                borderRadius: 8,
                border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--rule)'}`,
                background: dragging
                  ? 'color-mix(in oklab, var(--accent) 8%, var(--paper-3))'
                  : 'var(--paper-3)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                textAlign: 'center',
                cursor: file ? 'default' : 'pointer',
                transition: 'background 120ms ease, border-color 120ms ease',
              }}
            >
              <input ref={inputRef} type="file" accept=".mp3,.wav,.flac,.aiff,audio/*" style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && setFile({ name: e.target.files[0].name, size: e.target.files[0].size })}/>
              {!file ? (
                <>
                  <UploadIcon/>
                  <div className="d-display" style={{ fontSize: 44, lineHeight: 1, color: 'var(--ink)' }}>
                    Drop audio here
                  </div>
                  <div className="d-italic-explain" style={{ fontSize: 16 }}>
                    …or <span className="linkish">browse files</span>
                  </div>
                  <div className="d-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 8 }}>
                    MP3 · WAV · FLAC · AIFF  /  10s – 10min  /  ≤ 100MB
                  </div>
                </>
              ) : (
                <FilePreview file={file} onClear={() => setFile(null)}/>
              )}
            </div>
          </Card>

          {/* Options */}
          <Card title="Analysis options">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <OptionRow
                on={detectMode} onChange={setDetectMode}
                label="Detect mode / scale"
                sub="Ionian, dorian, phrygian, lydian, mixolydian, aeolian, locrian — full church-mode fingerprint."
                free
              />
              <hr className="hr-soft"/>
              <OptionRow
                on={includeStems} onChange={setIncludeStems}
                label="Separate &amp; download stems"
                sub="Vocals / drums / bass / other — adds ~30s and uses more memory."
                meta="+ 0.4 credits"
              />
            </div>
          </Card>
        </div>

        {/* Right column: what you'll get + recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="What you'll get">
            <ul style={{
              margin: 0, padding: 0, listStyle: 'none',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px',
              fontSize: 13.5, color: 'var(--ink-2)',
            }}>
              {[
                ['Key', 'A minor (aeolian)'],
                ['BPM', '120 · 4/4'],
                ['Sections', 'verse · chorus · bridge'],
                ['Chord roadmap', 'roman numerals'],
                ['Tension curve', 'moment-to-moment'],
                ['LUFS / brightness', 'time series'],
                ['Pitch wheel', 'tonic-relative'],
                ['Vocal range', '+ transposition map'],
              ].map(([k, v]) => (
                <li key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span className="d-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k}</span>
                  <span className="d-italic-explain" style={{ fontSize: 14, color: 'var(--ink)' }}>{v}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Recent uploads"
            right={<span className="d-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{RECENT.length} jobs</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {RECENT.map((r, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  alignItems: 'center', gap: 12,
                  padding: '10px 2px',
                  borderBottom: i < RECENT.length - 1 ? '1px dashed var(--rule-soft)' : 'none',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span className="d-mono" style={{
                      fontSize: 12.5, color: 'var(--ink)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{r.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {r.key} · {r.bpm} BPM · {r.dur}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.when}</span>
                  <Button ghost style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => onAnalyze && onAnalyze()}>open →</Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Progress reveal (only shown while analyzing) */}
      {analyzing && <ProgressPanel onDone={onAnalyze}/>}

      {/* Action bar */}
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div className="d-italic-explain" style={{ fontSize: 14 }}>
          Your file stays on the server only while we analyze it.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button ghost onClick={() => setFile(null)}>cancel</Button>
          <Button primary
            onClick={() => { setAnalyzing(true); setTimeout(() => onAnalyze && onAnalyze(), 2400); }}>
            <Icon.Upload size={14}/> analyze →
          </Button>
        </div>
      </footer>
    </div>
  );
};

const UploadIcon = () => (
  <div style={{
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(180deg, var(--paper-2), var(--paper-3))',
    border: '1px solid var(--rule)',
    boxShadow: '0 1px 0 #ffffff60 inset, 0 -1px 0 #00000010 inset, 0 6px 16px -8px #00000033',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--accent)',
  }}>
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 18V5m0 0l-6 6m6-6l6 6"/>
      <path d="M5 20h14"/>
    </svg>
  </div>
);

const FilePreview = ({ file, onClear }) => {
  const mb = (file.size / (1024 * 1024)).toFixed(1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 4px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 8,
        background: 'var(--paper-2)', border: '1px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Note size={22} color="var(--accent)"/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span className="d-display" style={{ fontSize: 22, color: 'var(--ink)' }}>{file.name}</span>
        <span className="d-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{mb} MB · ready</span>
      </div>
      <Button ghost style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); onClear(); }}>remove</Button>
    </div>
  );
};

const OptionRow = ({ on, onChange, label, sub, meta, free }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'flex-start' }}>
    <div style={{ paddingTop: 2 }}>
      <Toggle on={on} onChange={onChange}/>
    </div>
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }} dangerouslySetInnerHTML={{ __html: label }}/>
        {free && <Pill style={{ fontSize: 10 }}>free</Pill>}
      </div>
      <div className="d-italic-explain" style={{ fontSize: 13.5, marginTop: 2 }}>{sub}</div>
    </div>
    {meta && <span className="d-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{meta}</span>}
  </div>
);

// ─── Progress panel (the long-running job UI) ──────────────────────────────
const STAGES = [
  ['Preprocess',  0,  'converting to wav · validating'],
  ['Structure',   10, 'finding beats, downbeats, sections'],
  ['Key',         70, 'fingerprinting tonic + mode'],
  ['Chords',      74, 'roman numerals + tension'],
  ['Pitch range', 78, 'per-stem high & low'],
  ['Instruments', 83, 'labelling each stem'],
  ['Dynamics',    87, 'LUFS / brightness / density'],
  ['Tension',     91, 'computing the curve'],
  ['Aggregating', 94, 'section comparison'],
  ['Done',        100, 'rendering results'],
];

const ProgressPanel = ({ onDone }) => {
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    const targets = [12, 35, 60, 68, 72, 78, 86, 92, 96, 100];
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(targets.length - 1, i + 1);
      setPct(targets[i]);
      if (targets[i] >= 100) clearInterval(id);
    }, 240);
    return () => clearInterval(id);
  }, []);
  const currentStage = STAGES.reduce((acc, s) => pct >= s[1] ? s : acc, STAGES[0]);

  return (
    <Card title="Analyzing…"
      italicTitle={`— ${currentStage[2]}`}
      right={<Screen style={{ fontSize: 13 }}>{pct}% · {currentStage[0].toUpperCase()}</Screen>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Tape-deck progress bar */}
        <div style={{
          position: 'relative', height: 28, borderRadius: 6,
          background: 'linear-gradient(180deg, #1a140e, #2b231b)',
          boxShadow: 'inset 0 2px 6px #00000088, inset 0 -1px 0 #ffffff10, 0 0 0 1px var(--paper-edge)',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, width: `${pct}%`,
            background: `repeating-linear-gradient(115deg,
              color-mix(in oklab, var(--accent) 100%, transparent) 0 10px,
              color-mix(in oklab, var(--accent) 75%, #000) 10px 18px)`,
            borderRight: '1px solid #00000060',
            transition: 'width 240ms ease',
          }}/>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: '#fff7ec',
            textShadow: '0 1px 0 #00000080',
            letterSpacing: '0.1em',
          }}>
            {currentStage[0].toUpperCase()}  ·  {pct}%
          </div>
        </div>

        {/* Stage tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {STAGES.map((s, i) => {
            const reached = pct >= s[1];
            const done = i < STAGES.length - 1 ? pct >= STAGES[i + 1][1] : pct >= 100;
            return (
              <div key={i} style={{
                border: '1px solid var(--rule)',
                background: done ? 'color-mix(in oklab, var(--section-inst) 70%, var(--paper-3))'
                          : reached ? 'color-mix(in oklab, var(--accent-soft) 60%, var(--paper-3))'
                                    : 'var(--paper-3)',
                color: done ? 'var(--section-inst-i)' : reached ? 'var(--accent-ink)' : 'var(--ink-3)',
                borderRadius: 4, padding: '6px 7px',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.04em' }}>{s[0]}</span>
                <span className="d-mono" style={{ fontSize: 9.5, opacity: 0.7 }}>
                  {done ? '✓' : reached ? '…' : ''}{!done && ` ${s[1]}%`}
                </span>
              </div>
            );
          })}
        </div>

        <p className="d-italic-explain" style={{ margin: 0, fontSize: 13.5 }}>
          The biggest jump is structure → key (10% → 70%). That's the heavy listen — about 60 to 90 seconds for a typical 3-minute song.
        </p>
      </div>
    </Card>
  );
};

window.UploadScreen = UploadScreen;
