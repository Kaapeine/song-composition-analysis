import React from 'react'

interface CardProps {
  title?: string
  meta?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}

export function Card({ title, meta, children, style }: CardProps) {
  return (
    <div className="paper-card" style={style}>
      {title && (
        <div className="card-head">
          <div className="title">{title}</div>
          {meta && <div className="meta">{meta}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
