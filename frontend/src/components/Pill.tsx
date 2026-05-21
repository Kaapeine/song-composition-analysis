import React from 'react'

interface PillProps {
  accent?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}

export function Pill({ accent, children, style }: PillProps) {
  return (
    <span className={`pill${accent ? ' accent' : ''}`} style={style}>
      {children}
    </span>
  )
}
