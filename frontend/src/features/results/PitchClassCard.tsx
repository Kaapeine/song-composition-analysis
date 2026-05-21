import { useState, useMemo } from 'react'
import { Card } from '../../components/Card'
import type { PitchClassHistogram } from '../../types/api'

// Design degree order; backend emits '1 (root)' for root — normalise on load
const DEGREES = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']

const INTERVAL_NAMES: Record<string, string> = {
  '1': 'root', 'b2': 'minor 2nd', '2': 'major 2nd', 'b3': 'minor 3rd',
  '3': 'major 3rd', '4': 'perfect 4th', 'b5': 'tritone', '5': 'perfect 5th',
  'b6': 'minor 6th', '6': 'major 6th', 'b7': 'minor 7th', '7': 'major 7th',
}

const SIZE = 220
const CX = SIZE / 2
const CY = SIZE / 2
const INNER = SIZE * 0.20
const OUTER = SIZE * 0.42
const LABEL_R = SIZE * 0.475
const ARC = 360 / 12

function polar(r: number, deg: number): [number, number] {
  const a = (deg - 90) * Math.PI / 180
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]
}

function arcPath(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = polar(r1, a1)
  const [x2, y2] = polar(r1, a2)
  const [x3, y3] = polar(r2, a2)
  const [x4, y4] = polar(r2, a1)
  const large = (a2 - a1) > 180 ? 1 : 0
  return `M${x1},${y1} A${r1},${r1} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 ${large} 0 ${x4},${y4} Z`
}

interface PitchClassCardProps {
  histogram: PitchClassHistogram
  tonic: string
}

export function PitchClassCard({ histogram, tonic }: PitchClassCardProps) {
  const [hover, setHover] = useState<string | null>(null)

  // Normalise backend key '1 (root)' → '1' so it matches design degree keys
  const values = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(histogram.values ?? {})) {
      out[k === '1 (root)' ? '1' : k] = v
    }
    return out
  }, [histogram.values])

  const avoidSet = useMemo(() => {
    const raw = histogram.avoid_notes ?? []
    return new Set(raw.map(n => n === '1 (root)' ? '1' : n))
  }, [histogram.avoid_notes])

  const maxVal = Math.max(...DEGREES.map(d => values[d] ?? 0), 0.0001)
  const avoidCount = avoidSet.size

  return (
    <Card
      title="Pitch class"
      meta={<em className="d-italic-explain">— tonic-relative</em>}
    >
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {avoidCount > 0 && (
          <p className="d-italic-explain" style={{ margin: 0, fontSize: 13, textAlign: 'center', color: 'var(--ink-3)' }}>
            {[...avoidSet].join(', ')} barely appear —{' '}
            treat {avoidCount > 1 ? 'them' : 'it'} as <span style={{ color: 'var(--warn)' }}>avoid note{avoidCount > 1 ? 's' : ''}</span> when soloing.
          </p>
        )}

        {/* Radial wheel */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={SIZE} height={SIZE}>
            {/* Concentric guide circles */}
            {[0.25, 0.5, 0.75, 1].map((f, i) => (
              <circle key={i} cx={CX} cy={CY} r={INNER + (OUTER - INNER) * f}
                fill="none" stroke="var(--ink)" opacity="0.06" strokeWidth="0.8"/>
            ))}
            {/* Inner cream disk */}
            <circle cx={CX} cy={CY} r={INNER - 6}
              fill="var(--paper-3)" stroke="var(--rule)" strokeWidth="0.8"/>

            {/* Radial bars */}
            {DEGREES.map((d, i) => {
              const v = values[d] ?? 0
              const a1 = i * ARC + 2
              const a2 = (i + 1) * ARC - 2
              const r2 = INNER + (OUTER - INNER) * v
              const isAvoid = avoidSet.has(d)
              const isTonic = d === '1'
              const isHover = hover === d
              const fill = isTonic
                ? 'var(--accent)'
                : isAvoid
                ? 'color-mix(in oklab, var(--ink) 25%, var(--paper-edge))'
                : 'color-mix(in oklab, var(--accent) 55%, var(--paper-3))'
              return (
                <g key={d}
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d={arcPath(INNER, r2, a1, a2)}
                    fill={fill}
                    opacity={isHover ? 1 : 0.92}
                    stroke={isHover ? 'var(--ink)' : 'none'}
                    strokeWidth="1"
                  />
                </g>
              )
            })}

            {/* Degree labels outside arcs */}
            {DEGREES.map((d, i) => {
              const a = i * ARC + ARC / 2
              const [lx, ly] = polar(LABEL_R, a)
              const isAvoid = avoidSet.has(d)
              const isTonic = d === '1'
              return (
                <text key={d} x={lx} y={ly + 4} textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize="11"
                  fontWeight={isTonic ? 700 : 500}
                  fill={isAvoid ? 'var(--ink-4)' : 'var(--ink)'}
                  style={{ textDecoration: isAvoid ? 'line-through' : 'none', pointerEvents: 'none' }}
                >
                  {d}
                </text>
              )
            })}

            {/* Centre: italic "tonic" + note name */}
            <text x={CX} y={CY - 2} textAnchor="middle"
              fontFamily="var(--font-display)" fontSize="14" fontStyle="italic"
              fill="var(--ink-3)"
            >
              tonic
            </text>
            <text x={CX} y={CY + 16} textAnchor="middle"
              fontFamily="var(--font-display)" fontSize="22" fill="var(--accent)"
            >
              {tonic}
            </text>
          </svg>

          {/* Hover tooltip below wheel */}
          {hover && (
            <div style={{
              position: 'absolute', left: '50%', bottom: -34, transform: 'translateX(-50%)',
              background: 'var(--paper-3)', border: '1px solid var(--rule)', borderRadius: 4,
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)',
              whiteSpace: 'nowrap', boxShadow: '0 4px 10px -4px #00000030',
              zIndex: 10,
            }}>
              <strong>{hover}</strong>
              <span style={{ color: 'var(--ink-3)' }}>
                {' '}· {INTERVAL_NAMES[hover]} · {Math.round((values[hover] ?? 0) * 100)}%
              </span>
              {avoidSet.has(hover) && <span style={{ color: 'var(--warn)' }}> · avoid</span>}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
