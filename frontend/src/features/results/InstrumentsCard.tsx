import { Card } from '../../components/Card'
import { ConfidenceDots } from '../../components/ConfidenceDots'
import type { Stem } from '../../types/api'

const STEM_ICONS: Record<string, string> = {
  vocals: '🎤',
  drums:  '🥁',
  bass:   '🎸',
  other:  '🎹',
}

interface InstrumentsCardProps {
  stems: Record<string, Stem>
}

export function InstrumentsCard({ stems }: InstrumentsCardProps) {
  const entries = Object.entries(stems)
  if (entries.length === 0) return null

  return (
    <Card title="Instruments">
      <div>
        {entries.map(([stemName, stem], i) => {
          const lowConf = (stem.instrument_confidence ?? 1) < 0.6
          return (
            <div key={stemName} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i < entries.length - 1 ? '1px solid var(--rule-soft)' : 'none',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>
                {STEM_ICONS[stemName] ?? '🎵'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
                  {stem.instrument_label ?? stemName}
                </div>
                {lowConf && stem.instrument_alternative && (
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                    or {stem.instrument_alternative}
                    {stem.instrument_alternative_confidence !== undefined && (
                      <span style={{ marginLeft: 4, color: 'var(--ink-4)' }}>
                        ({Math.round(stem.instrument_alternative_confidence * 100)}%)
                      </span>
                    )}
                  </div>
                )}
                {stem.pitch_range && (
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {stem.pitch_range.min} – {stem.pitch_range.max}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {Math.round((stem.instrument_confidence ?? 0) * 100)}%
                </span>
                <ConfidenceDots value={stem.instrument_confidence ?? 0}/>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
