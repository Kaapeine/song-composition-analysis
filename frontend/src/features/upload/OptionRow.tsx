import { Toggle } from '../../components/Toggle'

interface OptionRowProps {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}

export function OptionRow({ label, description, value, onChange }: OptionRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid var(--rule-soft)',
    }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{description}</div>
      </div>
      <Toggle on={value} onChange={onChange} label={label}/>
    </div>
  )
}
