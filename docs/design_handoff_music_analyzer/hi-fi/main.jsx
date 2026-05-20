// hi-fi/main.jsx — Main analysis screen (Design F refined)

// ─── Transport (tape-deck style) ───────────────────────────────────────────
const Transport = ({ playing, onTogglePlay, t, dur, onPrev, onNext }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '10px 12px',
    background: 'linear-gradient(180deg, var(--paper-3), color-mix(in oklab, var(--paper-3) 90%, var(--paper-edge)))',
    borderRadius: 10,
    border: '1px solid var(--rule)',
    boxShadow: 'var(--shadow-emboss)',
  }}>
    <button className="btn icon-only" onClick={onPrev} title="prev section">
      <Icon.Prev size={14}/>
    </button>
    <button
      onClick={onTogglePlay}
      style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, var(--accent-2), var(--accent) 70%)',
        border: '1px solid color-mix(in oklab, var(--accent) 70%, black 30%)',
        boxShadow: '0 1px 0 #ffffff50 inset, 0 -2px 4px #00000028 inset, 0 4px 10px -2px color-mix(in oklab, var(--accent) 60%, transparent)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff7ec',
      }}
      title={playing ? 'pause' : 'play'}>
      {playing ? <Icon.Pause size={18}/> : <Icon.Play size={18}/>}
    </button>
    <button className="btn icon-only" onClick={onNext} title="next section">
      <Icon.Next size={14}/>
    </button>
    <div style={{ width: 1, height: 28, background: 'var(--rule)' }}/>
    <Screen style={{ minWidth: 120, fontSize: 12, textAlign: 'center' }}>
      {fmtTime(t)}  /  {fmtTime(dur)}
    </Screen>
    <div style={{ flex: 1 }}/>
    <span className="d-italic-explain" style={{ fontSize: 13 }}>
      drag the playhead, or click any section to jump
    </span>
  </div>
);

// ─── Section ribbon (jump targets) ─────────────────────────────────────────
const SectionRibbon = ({ onJump, current }) => (
  <div style={{
    display: 'flex', gap: 4, padding: 6,
    background: 'var(--paper-2)',
    border: '1px solid var(--rule)', borderRadius: 8,
    overflowX: 'auto',
  }}>
    {ANALYSIS.sections.map((s, i) => {
      const len = s.end - s.start;
      const active = current === i;
      return (
        <button key={i} onClick={() => onJump && onJump(s.start)}
          style={{
            flex: `${Math.max(0.4, len / ANALYSIS.duration * 6)} 1 0`,
            background: active
              ? sectionVar(s.label, 'fill')
              : 'color-mix(in oklab, var(--paper-3) 80%, transparent)',
            color: active ? sectionVar(s.label, 'ink') : 'var(--ink-2)',
            border: `1px solid ${active ? sectionVar(s.label, 'ink') : 'var(--rule)'}`,
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
            minWidth: 70,
            transition: 'background 120ms ease',
          }}>
          <span style={{
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{s.label}</span>
          <span className="d-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
            {fmtTime(s.start)} – {fmtTime(s.end)}
          </span>
        </button>
      );
    })}
  </div>
);

// ─── Annotation strip ──────────────────────────────────────────────────────
const Annotation = ({ section, body, by }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12,
    padding: '10px 14px',
    background: 'color-mix(in oklab, var(--accent) 6%, var(--paper-3))',
    border: '1px solid color-mix(in oklab, var(--accent) 25%, var(--rule))',
    borderRadius: 8,
    alignItems: 'center',
  }}>
    <SectionChip label={section}/>
    <span className="d-italic-explain" style={{ fontSize: 14, color: 'var(--ink-2)' }}>"{body}"</span>
    <span className="d-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{by}</span>
  </div>
);

// ─── Main screen ───────────────────────────────────────────────────────────
const MainScreen = ({ onBack }) => {
  const [playing, setPlaying] = React.useState(false);
  const [playT, setPlayT] = React.useState(70); // mid-chorus moment for the demo
  const [selectedChord, setSelectedChord] = React.useState(null);
  const dur = ANALYSIS.duration;

  // tick simulated playback
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPlayT(t => Math.min(dur, t + 0.25));
    }, 250);
    return () => clearInterval(id);
  }, [playing]);

  // find current section
  const currentSectionIdx = ANALYSIS.sections.findIndex(s => playT >= s.start && playT < s.end);

  const jumpTo = (t) => setPlayT(t);
  const onSeek = (frac) => setPlayT(frac * dur);
  const next = () => {
    const idx = currentSectionIdx;
    if (idx >= 0 && idx < ANALYSIS.sections.length - 1) setPlayT(ANALYSIS.sections[idx + 1].start);
  };
  const prev = () => {
    const idx = currentSectionIdx;
    if (idx > 0) setPlayT(ANALYSIS.sections[idx - 1].start);
    else setPlayT(0);
  };

  return (
    <CrosshairProvider playT={playT}>
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: '24px 28px 80px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Sub-header: file + actions */}
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <button onClick={onBack} className="btn ghost" style={{ padding: '4px 8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>← all analyses</span>
            </button>
            <h2 className="d-display" style={{ margin: 0, fontSize: 32, letterSpacing: '-0.02em' }}>
              {ANALYSIS.filename}
              <em className="d-display-i" style={{ fontSize: 18, color: 'var(--ink-3)', marginLeft: 10, fontWeight: 400 }}>
                analyzed just now
              </em>
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button ghost><Icon.Share size={14}/> share link</Button>
            <Button ghost><Icon.PDF size={14}/> export PDF</Button>
            <Button ghost><Icon.Copy size={14}/> copy JSON</Button>
          </div>
        </header>

        {/* HERO SUMMARY */}
        <HeroSummary/>

        {/* WAVEFORM with transport + section ribbon */}
        <Card title="Waveform"
          italicTitle="— click anywhere to seek"
          right={<Pill>section ribbon → jump</Pill>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionRibbon onJump={jumpTo} current={currentSectionIdx}/>
            <Waveform
              height={210}
              showBeats showDownbeats showChords showSections
              onSeek={onSeek}
              selectedChord={selectedChord}
              onChordClick={(roman) => setSelectedChord(c => c === roman ? null : roman)}
            />
            <div style={{ marginTop: 20 }}>
              <Transport
                playing={playing} onTogglePlay={() => setPlaying(p => !p)}
                t={playT} dur={dur}
                onPrev={prev} onNext={next}/>
            </div>
            <Annotation section="chorus" by="— you, 2 min ago"
              body="this chorus might be a touch loud — check the LUFS"/>
          </div>
        </Card>

        {/* SYNCED SIGNAL LANES */}
        <Card title="Signals"
          italicTitle="— hover any lane, crosshair locks across all"
          right={<Pill>4 curves · 100 ms grid</Pill>}>
          <div style={{ background: 'var(--paper-2)', borderRadius: 8, border: '1px solid var(--rule-soft)', overflow: 'hidden' }}>
            <ChordLaneTimeline
              height={38}
              selectedChord={selectedChord}
              onChordClick={(r) => setSelectedChord(c => c === r ? null : r)}/>
            <SignalLane
              label="tension" unit=""
              series={ANALYSIS.tension} range={[0, 1]}
              color="var(--accent)"
              height={84}
              ticks={[0.25, 0.5, 0.75]}
              callouts={[{ t: 144, label: 'peak — bridge climbs' }]}
            />
            <SignalLane
              label="loudness" unit=" LUFS"
              series={ANALYSIS.lufs} range={[-30, -8]}
              color="var(--section-verse-i)"
              height={84}
              ticks={[-26, -20, -14, -8]}
              callouts={[{ t: 60, label: '−13 dB chorus' }]}
            />
            <SignalLane
              label="brightness" unit=" Hz"
              series={ANALYSIS.brightness} range={[1000, 3500]}
              color="var(--section-bridge-i)"
              height={84}
              ticks={[1500, 2000, 2500, 3000]}
              callouts={[{ t: 120, label: '2.9 k centroid' }]}
            />
            <SignalLane
              label="density" unit=" stems"
              series={ANALYSIS.density} range={[0, 4]}
              color="var(--section-inst-i)"
              height={84}
              step ticks={[1, 2, 3, 4]}
              callouts={[{ t: 110, label: 'all 4 in' }]}
            />
            <BeatRulerLane last height={28}/>
          </div>
        </Card>

        {/* DETAIL ROW: pitch class, instruments, sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: 20 }}>
          <PitchClassCard/>
          <InstrumentsCard/>
          <SectionComparison/>
        </div>

        {/* TRANSPOSITION */}
        <TranspositionCard/>

        {/* FOOTER NOTE */}
        <footer style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 4px',
          fontSize: 12, color: 'var(--ink-3)',
        }}>
          <span className="d-italic-explain" style={{ fontSize: 13 }}>
            All analysis local — your audio never left the box.
          </span>
          <span className="d-mono" style={{ fontSize: 11 }}>
            job · 7c9e6679-7425-40de-944b-e07fc1f90ae7 · v0.4-poc
          </span>
        </footer>
      </div>
    </CrosshairProvider>
  );
};

window.MainScreen = MainScreen;
