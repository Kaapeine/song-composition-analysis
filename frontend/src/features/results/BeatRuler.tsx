import { useMemo } from 'react'
import { sectionColor, formatTime } from '../../lib/utils'
import type { Section } from '../../types/api'
import { useCrosshair } from '../../context/CrosshairProvider'

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
  const { hoverTime, setHoverTime } = useCrosshair()
  const downbeatsSet = useMemo(() => new Set(downbeats.map(String)), [downbeats])
  const TRACK_GAP = labelWidth > 0 ? 8 : 0
  const trackLeft = labelWidth + TRACK_GAP
  const trackRight = W - rightWidth
  const toX = (t: number) => trackLeft + (t / duration) * (trackRight - trackLeft)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const svgX = ((e.clientX - rect.left) / rect.width) * W
        const t = ((svgX - trackLeft) / (trackRight - trackLeft)) * duration
        setHoverTime(Math.max(0, Math.min(t, duration)))
      }}
      onMouseLeave={() => setHoverTime(null)}
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

      {hoverTime !== null && (() => {
        const cx = toX(hoverTime)
        const label = formatTime(hoverTime)
        const labelW = label.length * 5 + 8
        const labelX = Math.min(cx + 2, trackRight - labelW - 2)
        return (
          <g pointerEvents="none">
            <line x1={cx} y1={0} x2={cx} y2={H}
              stroke="var(--accent)" strokeWidth={0.75} opacity={0.75} />
            <rect x={labelX} y={3} width={labelW} height={11} rx={2}
              fill="var(--paper)" opacity={0.9} />
            <text x={labelX + 3} y={11} fontSize={8}
              fontFamily="var(--font-mono)" fill="var(--accent)">
              {label}
            </text>
          </g>
        )
      })()}

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
