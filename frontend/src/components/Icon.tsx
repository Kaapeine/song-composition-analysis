interface IconProps {
  size?: number
  style?: React.CSSProperties
}

function Logo({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={style}>
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <circle cx="8" cy="15" r="2"/>
      <circle cx="16" cy="15" r="2"/>
      <line x1="10" y1="15" x2="14" y2="15"/>
      <rect x="9" y="8" width="6" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.6"/>
    </svg>
  )
}

function Sun({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={style}>
      <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/>
      <line x1="8" y1="1.5" x2="8" y2="3"/>
      <line x1="8" y1="13" x2="8" y2="14.5"/>
      <line x1="1.5" y1="8" x2="3" y2="8"/>
      <line x1="13" y1="8" x2="14.5" y2="8"/>
      <line x1="3.8" y1="3.8" x2="4.8" y2="4.8"/>
      <line x1="11.2" y1="11.2" x2="12.2" y2="12.2"/>
      <line x1="12.2" y1="3.8" x2="11.2" y2="4.8"/>
      <line x1="4.8" y1="11.2" x2="3.8" y2="12.2"/>
    </svg>
  )
}

function Moon({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={style}>
      <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"/>
    </svg>
  )
}

function Upload({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={style}>
      <path d="M8 11V3M5 6l3-3 3 3"/>
      <path d="M3 13h10"/>
    </svg>
  )
}

function Play({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={style}>
      <path d="M5 3.5l8 4.5-8 4.5V3.5z"/>
    </svg>
  )
}

function Pause({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={style}>
      <rect x="4" y="3" width="3" height="10" rx="1"/>
      <rect x="9" y="3" width="3" height="10" rx="1"/>
    </svg>
  )
}

function SkipBack({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={style}>
      <path d="M11 3.5L3 8l8 4.5V3.5z"/>
      <rect x="3" y="3" width="2" height="10" rx="0.5"/>
    </svg>
  )
}

function SkipFwd({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" style={style}>
      <path d="M5 3.5l8 4.5-8 4.5V3.5z"/>
      <rect x="11" y="3" width="2" height="10" rx="0.5"/>
    </svg>
  )
}

function Copy({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={style}>
      <rect x="5" y="5" width="8" height="8" rx="1.5"/>
      <path d="M3 11V3h8"/>
    </svg>
  )
}

function Share({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={style}>
      <path d="M10 2l4 4-4 4"/>
      <path d="M14 6H6a3 3 0 0 0-3 3v2"/>
    </svg>
  )
}

function X({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={style}>
      <path d="M4 4l8 8M12 4l-8 8"/>
    </svg>
  )
}

function PDF({ size = 16, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={style}>
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2z"/>
      <path d="M9 2v4h4" strokeLinejoin="round"/>
      <line x1="5" y1="9" x2="11" y2="9"/>
      <line x1="5" y1="11.5" x2="9" y2="11.5"/>
    </svg>
  )
}

export const Icon = { Logo, Sun, Moon, Upload, Play, Pause, SkipBack, SkipFwd, Copy, Share, X, PDF }
