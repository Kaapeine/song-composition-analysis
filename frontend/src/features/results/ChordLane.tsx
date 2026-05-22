import { useState } from 'react'
import type { ChordEntry } from '../../types/api'
import { useCrosshair } from '../../context/CrosshairProvider'

const W = 1000
const H = 28
const BOX_Y = 3
const BOX_H = H - 6

const ROOT_HUE: Record<string, number> = {
  'C': 0, 'C#': 30, 'Db': 30, 'D': 60, 'D#': 90, 'Eb': 90,
  'E': 120, 'F': 150, 'F#': 180, 'Gb': 180, 'G': 210,
  'G#': 240, 'Ab': 240, 'A': 270, 'A#': 300, 'Bb': 300, 'B': 330,
}

function chordFill(chord: string): string {
  const root = chord.match(/^([A-G][#b]?)/)?.[1] ?? 'C'
  return `hsl(${ROOT_HUE[root] ?? 0}, 58%, 58%)`
}

function chordStroke(chord: string): string {
  const root = chord.match(/^([A-G][#b]?)/)?.[1] ?? 'C'
  return `hsl(${ROOT_HUE[root] ?? 0}, 58%, 38%)`
}

interface ChordLaneProps {
  chords: ChordEntry[]
  duration: number
  selectedChord: string | null
  onChordSelect: (roman: string | null) => void
  /** Left label column width. Pass 0 to go full-width (no label). Default: 72 */
  labelWidth?: number
  /** Right padding width. Pass 0 to go full-width. Default: 36 */
  rightWidth?: number
}

export function ChordLane({
  chords, duration, selectedChord, onChordSelect,
  labelWidth = 72, rightWidth = 36,
}: ChordLaneProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)
  const { hoverTime, setHoverTime } = useCrosshair()

  const TRACK_GAP = labelWidth > 0 ? 8 : 0
  const trackLeft = labelWidth + TRACK_GAP
  const trackRight = W - rightWidth
  const toX = (t: number) => trackLeft + (t / duration) * (trackRight - trackLeft)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block', overflow: 'visible' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const svgX = ((e.clientX - rect.left) / rect.width) * W
        setHoverX(svgX)
        const t = ((svgX - trackLeft) / (trackRight - trackLeft)) * duration
        setHoverTime(Math.max(0, Math.min(t, duration)))
      }}
      onMouseLeave={() => { setHoverTime(null); setHoverX(null) }}
    >
      {chords.map((c, i) => {
        const x1 = toX(c.start)
        // Cap x2 so the last chord never bleeds past the track right edge
        const x2 = Math.min(toX(c.end), trackRight)
        const cw = Math.max(x2 - x1 - 1, 1)
        const isSelected = selectedChord === c.roman
        const isHovered = hoveredIdx === i
        const fill = isSelected ? 'var(--accent)' : chordFill(c.chord)
        const stroke = isSelected ? 'var(--accent)' : chordStroke(c.chord)
        return (
          <g key={i}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => onChordSelect(isSelected ? null : (c.roman ?? null))}
          >
            <rect x={x1 + 0.5} y={BOX_Y} width={cw} height={BOX_H} rx={2}
              fill={fill}
              fillOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.65}
              stroke={stroke}
              strokeWidth={isSelected ? 1.5 : 0.5}
            />
            {cw > 28 && (
              <text x={(x1 + x2) / 2} y={BOX_Y + BOX_H / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontFamily="var(--font-mono)" fontWeight={600}
                fill="white"
                style={{ pointerEvents: 'none' }}
              >
                {c.roman}
              </text>
            )}
          </g>
        )
      })}

      {hoverTime !== null && (
        <line
          x1={toX(hoverTime)} y1={0}
          x2={toX(hoverTime)} y2={H}
          stroke="var(--ink-2)" strokeWidth={0.75}
          strokeDasharray="2,2" opacity={0.6}
          pointerEvents="none"
        />
      )}

      {/* Hover tooltip — follows cursor, not chord center */}
      {hoveredIdx !== null && hoverX !== null && (() => {
        const c = chords[hoveredIdx]
        const label = c.roman && c.roman !== c.chord ? `${c.chord} · ${c.roman}` : c.chord
        const tw = label.length * 6.5 + 14
        const tx = Math.min(Math.max(hoverX, trackLeft + tw / 2 + 2), trackRight - tw / 2 - 2)
        return (
          <g pointerEvents="none">
            <rect x={tx - tw / 2} y={-17} width={tw} height={15} rx={3}
              fill="var(--ink)" opacity={0.9} />
            <text x={tx} y={-7} textAnchor="middle" dominantBaseline="middle"
              fontSize={10} fontFamily="var(--font-mono)" fill="var(--paper)">
              {label}
            </text>
          </g>
        )
      })()}

      {/* Left label — only shown when labelWidth > 0 */}
      {labelWidth > 0 && (
        <text x={6} y={H / 2} dominantBaseline="middle" fontSize={9}
          fontFamily="var(--font-mono)" fill="var(--ink-3)" letterSpacing="0.08em">
          CHORDS
        </text>
      )}
    </svg>
  )
}
