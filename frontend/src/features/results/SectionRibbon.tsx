import { activeSection, sectionColor, sectionInkColor } from '../../lib/utils'
import type { Section } from '../../types/api'

interface SectionRibbonProps {
  sections: Section[]
  duration: number
  currentTime: number
  onSeek: (t: number) => void
}

export function SectionRibbon({ sections, duration, currentTime, onSeek }: SectionRibbonProps) {
  const active = activeSection(sections, currentTime)

  return (
    <div style={{ display: 'flex', height: 32, overflow: 'hidden' }}>
      {sections.map((s, i) => {
        const isActive = active === s
        const width = ((s.end - s.start) / duration) * 100
        return (
          <button
            key={i}
            onClick={() => onSeek(s.start)}
            title={`${s.label} (${s.start.toFixed(1)}s)`}
            style={{
              flex: `0 0 ${width}%`,
              border: 'none', borderRight: '1px solid color-mix(in oklab, var(--paper) 30%, transparent)',
              background: isActive
                ? sectionColor(s.label)
                : `color-mix(in oklab, ${sectionColor(s.label)} 60%, var(--paper-2))`,
              color: isActive ? sectionInkColor(s.label) : 'var(--ink-3)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              paddingInline: 6,
              transition: 'background 120ms',
            }}
          >
            {width > 4 ? s.label : ''}
          </button>
        )
      })}
    </div>
  )
}
