import React from 'react'

interface ScreenProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export function Screen({ children, style }: ScreenProps) {
  return (
    <div className="screen" style={style}>
      {children}
    </div>
  )
}
