import React from 'react'

const POSITIONS = [-4, -2, 0, 2, 4] as const
const ANGLES_DEG = [-120, -60, 0, 60, 120]

interface KnobProps {
  value: number
  onChange: (v: number) => void
  size?: number
}

export function Knob({ value, onChange, size = 120 }: KnobProps) {
  const idx = POSITIONS.findIndex(p => p === value)
  const angleDeg = ANGLES_DEG[Math.max(0, idx)]
  const angleRad = (angleDeg - 90) * (Math.PI / 180)

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 2
  const innerR = size / 2 - 10
  const indicatorR = innerR - 6
  const dotX = cx + indicatorR * Math.cos(angleRad)
  const dotY = cy + indicatorR * Math.sin(angleRad)

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    const clickDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    const normalized = ((clickDeg % 360) + 360) % 360
    const adjusted = normalized > 180 ? normalized - 360 : normalized
    let bestIdx = 0
    let bestDist = Infinity
    ANGLES_DEG.forEach((a, i) => {
      const dist = Math.abs(a - adjusted)
      if (dist < bestDist) { bestDist = dist; bestIdx = i }
    })
    onChange(POSITIONS[bestIdx])
  }

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ cursor: 'pointer', userSelect: 'none', display: 'block' }}
      onClick={handleClick}
    >
      <circle cx={cx} cy={cy} r={outerR}
        fill="var(--paper-2)" stroke="var(--rule)" strokeWidth={1}
        style={{ filter: 'drop-shadow(0 3px 6px #00000033)' }}
      />
      <circle cx={cx} cy={cy} r={innerR}
        fill="var(--paper-3)" stroke="var(--rule-soft)" strokeWidth={0.5}
      />
      {ANGLES_DEG.map((a, i) => {
        const r = (a - 90) * (Math.PI / 180)
        const sx = cx + outerR * Math.cos(r)
        const sy = cy + outerR * Math.sin(r)
        const ex = cx + (outerR - 6) * Math.cos(r)
        const ey = cy + (outerR - 6) * Math.sin(r)
        return (
          <line key={i} x1={sx} y1={sy} x2={ex} y2={ey}
            stroke={POSITIONS[i] === value ? 'var(--accent)' : 'var(--rule)'}
            strokeWidth={POSITIONS[i] === value ? 1.5 : 0.75}
            strokeLinecap="round"
          />
        )
      })}
      <line x1={cx} y1={cy} x2={dotX} y2={dotY}
        stroke="var(--accent)" strokeWidth={2} strokeLinecap="round"
      />
      <circle cx={dotX} cy={dotY} r={3.5} fill="var(--accent)"/>
      <circle cx={cx} cy={cy} r={4}
        fill="var(--paper-edge)" stroke="var(--rule)" strokeWidth={0.5}
      />
    </svg>
  )
}
