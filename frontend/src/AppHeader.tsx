import { Link, useLocation } from 'react-router-dom'
import { Toggle } from './components/Toggle'
import { Icon } from './components/Icon'

interface AppHeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function AppHeader({ theme, onToggleTheme }: AppHeaderProps) {
  const loc = useLocation()
  const isResults = loc.pathname.startsWith('/results')

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 28px',
      background: 'color-mix(in oklab, var(--paper) 90%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--rule)',
    }}>
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

      <div style={{
        display: 'flex', gap: 2, padding: 3,
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)', borderRadius: 999,
      }}>
        {([
          { to: '/', label: 'Upload', active: !isResults },
          { to: loc.pathname, label: 'Analysis', active: isResults, disabled: !isResults },
        ] as const).map(({ to, label, active, disabled }) => (
          <Link
            key={label}
            to={disabled ? '#' : to}
            onClick={disabled ? (e) => e.preventDefault() : undefined}
            style={{
              padding: '6px 16px', borderRadius: 999, textDecoration: 'none',
              background: active ? 'var(--paper-3)' : 'transparent',
              color: active ? 'var(--ink)' : disabled ? 'var(--ink-4)' : 'var(--ink-3)',
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
              boxShadow: active ? 'var(--shadow-emboss)' : 'none',
              letterSpacing: '0.04em',
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px', borderRadius: 999,
        background: 'var(--paper-2)', border: '1px solid var(--rule)',
      }}>
        <Icon.Sun size={13} style={{ color: theme === 'light' ? 'var(--accent)' : 'var(--ink-4)' }}/>
        <Toggle on={theme === 'dark'} onChange={() => onToggleTheme()} label="Toggle dark mode"/>
        <Icon.Moon size={13} style={{ color: theme === 'dark' ? 'var(--accent)' : 'var(--ink-4)' }}/>
      </div>
    </header>
  )
}
