import { useMemo, useRef, useState } from 'react'
import { downsampleRms, formatTime, sectionColor } from '../../lib/utils'
import type { ChordEntry, Section, TimeSeries } from '../../types/api'

const W = 1000
const H = 210
const WAVEFORM_H = 170
const BEAT_Y_START = 170
const CHORD_Y_START = 190
const PEAK_HALF = 60

interface WaveformProps {
  duration: number
  rms: TimeSeries
  beats: number[]
  downbeats: number[]
  sections: Section[]
  chords: ChordEntry[]
  selectedChord: string | null
  onChordSelect: (chord: string | null) => void
  currentTime: number
  onSeek: (t: number) => void
}

export function Waveform({
  duration, rms, beats, downbeats, sections, chords,
  selectedChord, onChordSelect, currentTime, onSeek,
}: WaveformProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const peaks = useMemo(() => downsampleRms(rms, W), [rms])
  const maxPeak = useMemo(() => Math.max(...peaks, 0.0001), [peaks])
  const downbeatsSet = useMemo(() => new Set(downbeats.map(String)), [downbeats])

  const toX = (t: number) => (t / duration) * W
  const toTime = (x: number) => (x / W) * duration
  const midY = WAVEFORM_H / 2

  const getSvgX = (e: React.MouseEvent<SVGSVGElement>): number => {
    const rect = svgRef.current!.getBoundingClientRect()
    return ((e.clientX - rect.left) / rect.width) * W
  }

  const playheadX = toX(currentTime)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: H, display: 'block', cursor: 'crosshair' }}
      onClick={(e) => onSeek(toTime(getSvgX(e)))}
      onMouseMove={(e) => setHoverX(getSvgX(e))}
      onMouseLeave={() => setHoverX(null)}
    >
      {/* Background */}
      <rect x={0} y={0} width={W} height={WAVEFORM_H} fill="var(--paper-3)" opacity={0.5} />

      {/* Section bands */}
      {sections.map((s, i) => (
        <rect key={i}
          x={toX(s.start)} y={0}
          width={toX(s.end) - toX(s.start)} height={WAVEFORM_H}
          fill={sectionColor(s.label)} opacity={0.35}
        />
      ))}

      {/* Mirrored waveform peaks */}
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
            stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="6,4"
          />
          <text x={W / 2} y={midY - 10} textAnchor="middle"
            fontSize={11} fontFamily="var(--font-mono)" fill="var(--ink-4)"
          >
            waveform pending
          </text>
        </>
      )}

      {/* Beat ticks */}
      {beats.map((t, i) => {
        const x = toX(t)
        const isDown = downbeatsSet.has(String(t))
        return (
          <line key={i}
            x1={x} y1={BEAT_Y_START + (isDown ? 0 : 8)}
            x2={x} y2={CHORD_Y_START}
            stroke={isDown ? 'var(--ink-2)' : 'var(--ink-4)'}
            strokeWidth={isDown ? 1.5 : 0.75}
          />
        )
      })}

      {/* Chord ribbon */}
      {chords.map((c, i) => {
        const x1 = toX(c.start)
        const x2 = toX(c.end)
        const isSelected = selectedChord === c.chord
        return (
          <g key={i}
            style={{ cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onChordSelect(isSelected ? null : c.chord) }}
          >
            <rect
              x={x1} y={CHORD_Y_START}
              width={x2 - x1 - 0.5} height={H - CHORD_Y_START}
              fill={isSelected ? 'var(--accent-soft)' : 'var(--paper-2)'}
              stroke={isSelected ? 'var(--accent)' : 'var(--rule)'}
              strokeWidth={isSelected ? 1 : 0.5}
            />
            {x2 - x1 > 18 && (
              <text
                x={(x1 + x2) / 2} y={H - 4}
                textAnchor="middle" fontSize={8}
                fontFamily="var(--font-mono)"
                fill={isSelected ? 'var(--accent-ink)' : 'var(--ink-3)'}
                style={{ pointerEvents: 'none' }}
              >
                {c.chord}
              </text>
            )}
          </g>
        )
      })}

      {/* Hover time tooltip */}
      {hoverX !== null && (
        <>
          <line x1={hoverX} y1={0} x2={hoverX} y2={WAVEFORM_H}
            stroke="var(--ink-3)" strokeWidth={0.75} strokeDasharray="3,3"
            pointerEvents="none"
          />
          <rect x={hoverX + 4} y={4} width={46} height={14} rx={3}
            fill="var(--paper)" stroke="var(--rule)" strokeWidth={0.5}
            pointerEvents="none"
          />
          <text x={hoverX + 8} y={14} fontSize={8.5} fontFamily="var(--font-mono)"
            fill="var(--ink-2)" pointerEvents="none"
          >
            {formatTime(toTime(hoverX))}
          </text>
        </>
      )}

      {/* Playhead */}
      <line x1={playheadX} y1={0} x2={playheadX} y2={H}
        stroke="var(--accent)" strokeWidth={1.5} pointerEvents="none"
      />
      <circle cx={playheadX} cy={4} r={4}
        fill="var(--accent)" pointerEvents="none"
      />
    </svg>
  )
}
