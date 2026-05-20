// hi-fi/app.jsx — App shell + theme switch + tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "copper",
  "density": "comfortable",
  "view": "main"
}/*EDITMODE-END*/;

// Accent palettes
const ACCENTS = {
  copper:  { light: { a: '#a8541f', a2: '#b96a37', soft: '#f1cba8', ink: '#6a3210' },
             dark:  { a: '#d97e44', a2: '#e9925a', soft: '#6a3a1c', ink: '#f1cba8' } },
  petrol:  { light: { a: '#1f5563', a2: '#2c6c7d', soft: '#bedce4', ink: '#0d3038' },
             dark:  { a: '#6cb6c7', a2: '#84c6d6', soft: '#1a4452', ink: '#bbe1ea' } },
  ochre:   { light: { a: '#9a7a14', a2: '#b08e1f', soft: '#ecdfaa', ink: '#5c4708' },
             dark:  { a: '#d4af3a', a2: '#e1bf52', soft: '#665016', ink: '#f0dca0' } },
  plum:    { light: { a: '#7a3e6a', a2: '#92517f', soft: '#e0c3d3', ink: '#4a2240' },
             dark:  { a: '#c986b6', a2: '#d59cc4', soft: '#582846', ink: '#eec8df' } },
};

const applyTheme = (theme, accent) => {
  document.documentElement.setAttribute('data-theme', theme);
  const a = ACCENTS[accent] || ACCENTS.copper;
  const v = a[theme] || a.light;
  document.documentElement.style.setProperty('--accent', v.a);
  document.documentElement.style.setProperty('--accent-2', v.a2);
  document.documentElement.style.setProperty('--accent-soft', v.soft);
  document.documentElement.style.setProperty('--accent-ink', v.ink);
};
const applyDensity = (density) => {
  document.documentElement.classList.toggle('dense', density === 'compact');
};

// ─── Header ────────────────────────────────────────────────────────────────
const AppHeader = ({ theme, onToggleTheme, view, onSetView }) => (
  <header style={{
    position: 'sticky', top: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 28px',
    background: 'color-mix(in oklab, var(--paper) 90%, transparent)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--rule)',
  }}>
    {/* logo + wordmark */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: 'linear-gradient(180deg, var(--paper-3), var(--paper-2))',
        border: '1px solid var(--rule)',
        boxShadow: 'var(--shadow-emboss)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <Icon.Logo size={22}/>
      </div>
      <div>
        <div className="d-display" style={{ fontSize: 22, lineHeight: 1, letterSpacing: '-0.005em' }}>
          Cassette<em className="d-display-i" style={{ color: 'var(--accent)' }}>·</em>Reader
        </div>
        <div className="d-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          music composition analyzer
        </div>
      </div>
    </div>

    {/* center: tiny segmented view switcher (POC) */}
    <div style={{
      display: 'flex', gap: 2, padding: 3,
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)', borderRadius: 999,
    }}>
      {[
        ['upload', 'Upload'],
        ['main',   'Analysis'],
      ].map(([k, label]) => (
        <button key={k} onClick={() => onSetView(k)}
          style={{
            appearance: 'none', cursor: 'pointer',
            padding: '6px 16px', borderRadius: 999,
            border: 'none',
            background: view === k ? 'var(--paper-3)' : 'transparent',
            color: view === k ? 'var(--ink)' : 'var(--ink-3)',
            fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
            boxShadow: view === k ? 'var(--shadow-emboss)' : 'none',
            letterSpacing: '0.04em',
          }}>
          {label}
        </button>
      ))}
    </div>

    {/* right: theme switch + account placeholder */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* theme hardware switch */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', borderRadius: 999,
        background: 'var(--paper-2)', border: '1px solid var(--rule)',
      }}>
        <Icon.Sun size={13} color={theme === 'light' ? 'var(--accent)' : 'var(--ink-4)'}/>
        <Toggle on={theme === 'dark'} onChange={onToggleTheme} label="theme"/>
        <Icon.Moon size={13} color={theme === 'dark' ? 'var(--accent)' : 'var(--ink-4)'}/>
      </div>
      {/* account placeholder slot — for future auth/billing */}
      <button style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'var(--paper-3)', border: '1px dashed var(--rule)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-3)', fontFamily: 'var(--font-ui)', fontSize: 12,
      }} title="sign in (coming later)">
        ?
      </button>
    </div>
  </header>
);

// Custom accent picker — swatches that preserve named accent value
const AccentPicker = ({ accent, theme, onChange }) => {
  const keys = ['copper', 'petrol', 'ochre', 'plum'];
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>accent</span></div>
      <div style={{ display: 'flex', gap: 8 }}>
        {keys.map(k => {
          const v = ACCENTS[k][theme] || ACCENTS[k].light;
          const on = accent === k;
          return (
            <button key={k} type="button" onClick={() => onChange(k)}
              title={k}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(180deg, ${v.a2}, ${v.a})`,
                border: on ? '2px solid #fff' : '2px solid transparent',
                outline: on ? `2px solid ${v.a}` : 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 0 #ffffff40 inset, 0 -1px 0 #00000020 inset, 0 2px 4px #00000030',
              }}/>
          );
        })}
      </div>
    </div>
  );
};

// ─── App ───────────────────────────────────────────────────────────────────
const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const view = t.view || 'main';

  React.useEffect(() => { applyTheme(t.theme, t.accent); }, [t.theme, t.accent]);
  React.useEffect(() => { applyDensity(t.density); }, [t.density]);

  // simple URL-less view routing through tweaks ("view" knob persists)
  const setView = (v) => setTweak({ view: v });

  return (
    <div>
      <AppHeader
        theme={t.theme}
        onToggleTheme={(on) => setTweak({ theme: on ? 'dark' : 'light' })}
        view={view} onSetView={setView}/>

      {view === 'upload'
        ? <UploadScreen onAnalyze={() => setView('main')}/>
        : <MainScreen onBack={() => setView('upload')}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio label="mode" value={t.theme}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            onChange={(v) => setTweak({ theme: v })}/>
          <AccentPicker accent={t.accent} theme={t.theme}
            onChange={(v) => setTweak({ accent: v })}/>
        </TweakSection>

        <TweakSection label="Density">
          <TweakRadio label="layout" value={t.density}
            options={[
              { value: 'comfortable', label: 'Comfy' },
              { value: 'compact', label: 'Compact' },
            ]}
            onChange={(v) => setTweak({ density: v })}/>
        </TweakSection>

        <TweakSection label="Screen">
          <TweakRadio label="view" value={view}
            options={[
              { value: 'upload', label: 'Upload' },
              { value: 'main', label: 'Analysis' },
            ]}
            onChange={setView}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
