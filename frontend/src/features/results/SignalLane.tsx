import { useMemo } from 'react'
import { sectionColor } from '../../lib/utils'
import type { Section, TimeSeries } from '../../types/api'
import { useCrosshair } from '../../context/CrosshairProvider'

const W = 1000
const LABEL_W = 72
const TRACK_GAP = 8
const RIGHT_W = 36

interface SignalLaneProps {
  label: string;
  color: string;
  series: TimeSeries;
  duration: number;
  yMin: number;
  yMax: number;
  height: number;
  sections: Section[];
  unit?: string;
  stepped?: boolean;
  annotateMax?: boolean;
}

export function SignalLane({
  label,
  color,
  series,
  duration,
  yMin,
  yMax,
  height,
  sections,
  unit = '',
  stepped = false,
  annotateMax = false,
}: SignalLaneProps) {
  const { hoverTime, setHoverTime } = useCrosshair()

  const TRACK_LEFT = LABEL_W + TRACK_GAP
  const TRACK_RIGHT = W - RIGHT_W

  const toX = (t: number) => TRACK_LEFT + (t / duration) * (TRACK_RIGHT - TRACK_LEFT)
  const toY = (v: number) =>
    height -
    ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * height;

  const points = useMemo(() => {
    if (stepped) {
      return series
        .flatMap(([t, v], i) => {
          const x = toX(t);
          const y = toY(v);
          const nextX =
            i < series.length - 1 ? toX(series[i + 1][0]) : W - RIGHT_W;
          return `${x},${y} ${nextX},${y}`;
        })
        .join(' ');
    }
    return series.map(([t, v]) => `${toX(t)},${toY(v)}`).join(' ');
  }, [series, duration, yMin, yMax, stepped]);

  let hoverPoint: { x: number; y: number; val: number } | null = null
  if (hoverTime !== null && series.length > 0) {
    let best = 0
    for (let i = 1; i < series.length; i++) {
      if (Math.abs(series[i][0] - hoverTime) < Math.abs(series[best][0] - hoverTime)) best = i
    }
    hoverPoint = { x: toX(series[best][0]), y: toY(series[best][1]), val: series[best][1] }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      style={{ width: '100%', display: 'block' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const svgX = ((e.clientX - rect.left) / rect.width) * W
        const t = ((svgX - TRACK_LEFT) / (TRACK_RIGHT - TRACK_LEFT)) * duration
        setHoverTime(Math.max(0, Math.min(t, duration)))
      }}
      onMouseLeave={() => setHoverTime(null)}
    >
      {sections.map((s, i) => (
        <rect
          key={i}
          x={toX(s.start)}
          y={0}
          width={toX(s.end) - toX(s.start)}
          height={height}
          fill={sectionColor(s.label)}
          opacity={0.42}
        />
      ))}

      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={LABEL_W + TRACK_GAP}
          y1={f * height}
          x2={W - RIGHT_W}
          y2={f * height}
          stroke="var(--rule)"
          strokeWidth={0.5}
          strokeDasharray="3,4"
        />
      ))}

      {annotateMax &&
        series.length > 0 &&
        (() => {
          const maxVal = Math.max(...series.map(([, v]) => v));
          const my = toY(maxVal);
          const labelText = `${maxVal.toFixed(1)}${unit}`;
          const labelX = W - RIGHT_W - 4;
          return (
            <g pointerEvents="none">
              <line
                x1={LABEL_W + TRACK_GAP}
                y1={my}
                x2={W - RIGHT_W}
                y2={my}
                stroke={color}
                strokeWidth={0.75}
                strokeDasharray="4,3"
                opacity={0.6}
              />
              <text
                x={labelX}
                y={my - 3}
                textAnchor="end"
                fontSize={8}
                fontFamily="var(--font-mono)"
                fill={color}
                opacity={0.8}
              >
                {labelText}
              </text>
            </g>
          );
        })()}

      {series.length > 0 && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}

      {hoverTime !== null && (
        <line
          x1={toX(hoverTime)} y1={0}
          x2={toX(hoverTime)} y2={height}
          stroke="var(--ink-3)" strokeWidth={0.75}
          strokeDasharray="2,3" opacity={0.6}
          pointerEvents="none"
        />
      )}
      {hoverPoint !== null && (
        <g pointerEvents="none">
          <circle cx={hoverPoint.x} cy={hoverPoint.y} r={3}
            fill={color} stroke="var(--paper-2)" strokeWidth={1.5} />
          <text
            x={Math.min(hoverPoint.x + 6, TRACK_RIGHT - 32)}
            y={Math.max(hoverPoint.y - 4, 10)}
            fontSize={8} fontFamily="var(--font-mono)"
            fill={color} opacity={0.9}>
            {hoverPoint.val.toFixed(1)}{unit}
          </text>
        </g>
      )}

      <rect
        x={0}
        y={0}
        width={LABEL_W}
        height={height}
        fill="var(--paper-2)"
        opacity={0.85}
      />
      <circle cx={10} cy={height / 2} r={4} fill={color} opacity={0.8} />
      {(() => {
        const words = label.toUpperCase().split(' ')
        const lineH = 10
        const startY = height / 2 - ((words.length - 1) * lineH) / 2
        return (
          <text fontSize={9} fontFamily="var(--font-mono)" fill={color} letterSpacing="0.07em">
            {words.map((word, i) => (
              <tspan key={i} x={18} y={startY + i * lineH} dominantBaseline="middle">{word}</tspan>
            ))}
          </text>
        )
      })()}

      <text
        x={W - RIGHT_W + 4}
        y={8}
        fontSize={8}
        fontFamily="var(--font-mono)"
        fill="var(--ink-4)"
      >
        {yMax}
        {unit}
      </text>
      <text
        x={W - RIGHT_W + 4}
        y={height - 2}
        fontSize={8}
        fontFamily="var(--font-mono)"
        fill="var(--ink-4)"
      >
        {yMin}
        {unit}
      </text>
    </svg>
  );
}
