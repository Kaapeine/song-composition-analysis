import { useMemo, useRef, useState } from 'react'
import { downsampleRms, formatTime, sectionColor, sectionInkColor } from '../../lib/utils'
import type { Section, TimeSeries } from '../../types/api'

const W = 1000
const SECTION_H = 22
const WAVEFORM_H = 150
const H = SECTION_H + WAVEFORM_H   // 172
const PEAK_HALF = 54

interface WaveformProps {
  duration: number
  rms: TimeSeries
  sections: Section[]
  currentTime: number
  onSeek: (t: number) => void
}

export function Waveform({
  duration, rms, sections, currentTime, onSeek,
}: WaveformProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const peaks = useMemo(() => downsampleRms(rms, W), [rms])
  const maxPeak = useMemo(() => Math.max(...peaks, 0.0001), [peaks])

  const toX = (t: number) => (t / duration) * W
  const toTime = (x: number) => (x / W) * duration
  const midY = SECTION_H + WAVEFORM_H / 2

  const getSvgX = (e: React.MouseEvent<SVGSVGElement>): number => {
    const rect = svgRef.current!.getBoundingClientRect()
    return ((e.clientX - rect.left) / rect.width) * W
  }

  const playheadX = toX(currentTime)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
      onClick={(e) => onSeek(toTime(getSvgX(e)))}
      onMouseMove={(e) => setHoverX(getSvgX(e))}
      onMouseLeave={() => setHoverX(null)}
    >
      {/* Waveform background */}
      <rect x={0} y={SECTION_H} width={W} height={WAVEFORM_H} fill="var(--paper-3)" opacity={0.5} />

      {/* Section bands: solid label strip at top + faint tint over waveform */}
      {sections.map((s, i) => {
        const x1 = toX(s.start)
        const x2 = toX(s.end)
        const sw = x2 - x1
        return (
          <g key={i}>
            {/* Faint tint over waveform area */}
            <rect x={x1} y={SECTION_H} width={sw} height={WAVEFORM_H}
              fill={sectionColor(s.label)} opacity={0.28} />
            {/* Solid label band */}
            <rect x={x1} y={0} width={sw} height={SECTION_H}
              fill={sectionColor(s.label)} />
            {/* Divider line */}
            <line x1={x1} y1={0} x2={x1} y2={SECTION_H + WAVEFORM_H}
              stroke="var(--rule)" strokeWidth={0.75} />
            {/* Section label */}
            {sw > 36 && (
              <text x={x1 + 7} y={SECTION_H - 6}
                fontFamily="var(--font-ui)" fontSize={10} fontWeight={600}
                letterSpacing="0.1em"
                fill={sectionInkColor(s.label)}
                style={{ pointerEvents: 'none' }}
              >
                {s.label.toUpperCase()}
              </text>
            )}
          </g>
        )
      })}

      {/* Waveform peaks */}
      {peaks.length > 0 ? peaks.map((p, i) => {
        const barH = (p / maxPeak) * PEAK_HALF
        const barW = W / peaks.length
        return (
          <rect key={i}
            x={i * barW} y={midY - barH}
            width={Math.max(barW - 0.5, 0.5)} height={barH * 2}
            fill="var(--ink-3)" opacity={0.55}
          />
        )
      }) : (
        <>
          <line x1={0} y1={midY} x2={W} y2={midY}
            stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="6,4" />
          <text x={W / 2} y={midY - 10} textAnchor="middle"
            fontSize={11} fontFamily="var(--font-mono)" fill="var(--ink-4)">
            waveform pending
          </text>
        </>
      )}

      {/* Hover crosshair */}
      {hoverX !== null && (
        <>
          <line x1={hoverX} y1={SECTION_H} x2={hoverX} y2={SECTION_H + WAVEFORM_H}
            stroke="var(--ink-3)" strokeWidth={0.75} strokeDasharray="3,3"
            pointerEvents="none" />
          <rect x={hoverX + 4} y={SECTION_H + 4} width={46} height={14} rx={3}
            fill="var(--paper)" stroke="var(--rule)" strokeWidth={0.5}
            pointerEvents="none" />
          <text x={hoverX + 8} y={SECTION_H + 14} fontSize={8.5} fontFamily="var(--font-mono)"
            fill="var(--ink-2)" pointerEvents="none">
            {formatTime(toTime(hoverX))}
          </text>
        </>
      )}

      {/* Playhead */}
      <line x1={playheadX} y1={0} x2={playheadX} y2={H}
        stroke="var(--accent)" strokeWidth={1.5} pointerEvents="none" />
      <polygon
        points={`${playheadX - 5},0 ${playheadX + 5},0 ${playheadX},6`}
        fill="var(--accent)" pointerEvents="none" />
    </svg>
  )
}
