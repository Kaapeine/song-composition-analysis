interface ToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  label?: string
}

export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`tg${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
      type="button"
    />
  )
}
