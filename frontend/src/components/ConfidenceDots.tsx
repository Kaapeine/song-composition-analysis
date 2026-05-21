interface ConfidenceDotsProps {
  value: number
}

export function ConfidenceDots({ value }: ConfidenceDotsProps) {
  const filled = Math.round(value * 5)
  const low = value < 0.6
  const color = low ? 'var(--warn)' : 'var(--accent)'
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: i < filled ? color : 'var(--rule)',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  )
}
