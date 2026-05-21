import { useState, useMemo } from 'react'
import { Card } from '../../components/Card'
import type { PitchClassHistogram } from '../../types/api'

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const CX = 95
const CY = 95
const MIN_R = 24
const MAX_R = 72

interface PitchClassCardProps {
  histogram: PitchClassHistogram
  tonic: string
}

export function PitchClassCard({ histogram, tonic }: PitchClassCardProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const values = histogram.values ?? {}
  const avoidSet = new Set(histogram.avoid_notes ?? [])
  const maxVal = Math.max(...PITCH_CLASSES.map(pc => values[pc] ?? 0), 0.0001)

  const slices = useMemo(() => PITCH_CLASSES.map((pc, i) => {
    const startAngle = (i / 12) * Math.PI * 2 - Math.PI / 2
    const endAngle = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2
    const val = values[pc] ?? 0
    const outerR = MIN_R + (val / maxVal) * (MAX_R - MIN_R)

    const cos0 = Math.cos(startAngle), sin0 = Math.sin(startAngle)
    const cos1 = Math.cos(endAngle),   sin1 = Math.sin(endAngle)

    const path = [
      `M ${CX + MIN_R * cos0} ${CY + MIN_R * sin0}`,
      `L ${CX + outerR * cos0} ${CY + outerR * sin0}`,
      `A ${outerR} ${outerR} 0 0 1 ${CX + outerR * cos1} ${CY + outerR * sin1}`,
      `L ${CX + MIN_R * cos1} ${CY + MIN_R * sin1}`,
      `A ${MIN_R} ${MIN_R} 0 0 0 ${CX + MIN_R * cos0} ${CY + MIN_R * sin0}`,
      'Z',
    ].join(' ')

    const midAngle = (startAngle + endAngle) / 2
    const LABEL_R = MAX_R + 14
    const lx = CX + LABEL_R * Math.cos(midAngle)
    const ly = CY + LABEL_R * Math.sin(midAngle)

    return { pc, path, lx, ly, val }
  }), [values, maxVal])

  const top4 = [...PITCH_CLASSES]
    .sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))
    .slice(0, 4)

  return (
    <Card title="Pitch Classes">
      <div style={{ padding: '16px 20px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Radial wheel */}
        <div style={{ flexShrink: 0 }}>
          <svg viewBox="0 0 190 190" width={190} height={190}>
            {slices.map(({ pc, path, lx, ly }) => {
              const isTonic = pc === tonic
              const isAvoid = avoidSet.has(pc)
              const fill = isTonic
                ? 'var(--accent)'
                : isAvoid
                ? 'color-mix(in oklab, var(--ink) 35%, var(--paper-2))'
                : 'var(--ink-3)'
              return (
                <g key={pc}
                  onMouseEnter={() => setHovered(pc)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <path d={path} fill={fill}
                    opacity={hovered === pc ? 1 : isTonic ? 0.85 : 0.55}
                    stroke="var(--paper)" strokeWidth={1.5}
                    style={{ transition: 'opacity 100ms' }}
                  />
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                    fontSize={8.5} fontFamily="var(--font-mono)"
                    fill={isTonic ? 'var(--accent)' : 'var(--ink-3)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {pc}
                  </text>
                </g>
              )
            })}
            {/* Centre tooltip */}
            {hovered && (
              <>
                <text x={CX} y={CY - 7} textAnchor="middle" fontSize={14}
                  fontFamily="var(--font-display)" fontWeight={500} fill="var(--ink)"
                >
                  {hovered}
                </text>
                <text x={CX} y={CY + 9} textAnchor="middle" fontSize={9}
                  fontFamily="var(--font-mono)" fill="var(--ink-3)"
                >
                  {Math.round((values[hovered] ?? 0) * 100)}%
                  {avoidSet.has(hovered) ? ' · avoid' : ''}
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Top-4 horizontal bars */}
        <div style={{ flex: 1, paddingTop: 12 }}>
          <div className="d-eyebrow" style={{ marginBottom: 12 }}>Top degrees</div>
          {top4.map(pc => {
            const val = values[pc] ?? 0
            const pct = val / maxVal
            const isTonic = pc === tonic
            const isAvoid = avoidSet.has(pc)
            return (
              <div key={pc} style={{ marginBottom: 10 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginBottom: 4,
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                }}>
                  <span style={{ color: isTonic ? 'var(--accent)' : 'var(--ink-2)', fontWeight: isTonic ? 500 : 400 }}>
                    {pc}{isTonic ? ' ①' : ''}{isAvoid ? ' ✕' : ''}
                  </span>
                  <span style={{ color: 'var(--ink-4)' }}>{Math.round(val * 100)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--paper-edge)', borderRadius: 3 }}>
                  <div style={{
                    height: '100%', width: `${pct * 100}%`, borderRadius: 3,
                    background: isTonic ? 'var(--accent)' : 'var(--ink-3)',
                    transition: 'width 300ms ease',
                  }}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
