import { useMemo } from 'react'
import { sectionColor } from '../../lib/utils'
import type { Section } from '../../types/api'

const W = 1000
const H = 28

interface BeatRulerProps {
  beats: number[]
  downbeats: number[]
  duration: number
  sections: Section[]
  /** Left label column width. Pass 0 for full-width (no label). Default: 72 */
  labelWidth?: number
  /** Right padding width. Pass 0 for full-width. Default: 36 */
  rightWidth?: number
}

export function BeatRuler({
  beats, downbeats, duration, sections,
  labelWidth = 72, rightWidth = 36,
}: BeatRulerProps) {
  const downbeatsSet = useMemo(() => new Set(downbeats.map(String)), [downbeats])
  const trackLeft = labelWidth
  const trackRight = W - rightWidth
  const toX = (t: number) => trackLeft + (t / duration) * (trackRight - trackLeft)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block' }}
    >
      {sections.map((s, i) => (
        <rect key={i} x={toX(s.start)} y={0}
          width={Math.min(toX(s.end), trackRight) - toX(s.start)} height={H}
          fill={sectionColor(s.label)} opacity={0.15}
        />
      ))}

      {beats.filter(t => t <= duration).map((t, i) => {
        const x = toX(t)
        const isDown = downbeatsSet.has(String(t))
        return (
          <line key={i} x1={x} y1={isDown ? 2 : H / 2} x2={x} y2={H - 2}
            stroke={isDown ? 'var(--ink-2)' : 'var(--ink-4)'}
            strokeWidth={isDown ? 1.5 : 0.75}
          />
        )
      })}

      {labelWidth > 0 && (
        <text x={6} y={H / 2} dominantBaseline="middle" fontSize={9}
          fontFamily="var(--font-mono)" fill="var(--ink-3)" letterSpacing="0.08em"
        >
          BEATS
        </text>
      )}
    </svg>
  )
}
