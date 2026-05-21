import { useMemo } from 'react'
import { Card } from '../../components/Card'
import { sectionColor, sectionInkColor } from '../../lib/utils'
import type { SectionStat } from '../../types/api'

const COLS: { key: keyof SectionStat; label: string; decimals: number }[] = [
  { key: 'avg_loudness_lufs', label: 'Loudness',  decimals: 1 },
  { key: 'avg_brightness',    label: 'Brightness', decimals: 0 },
  { key: 'avg_tension',       label: 'Tension',    decimals: 2 },
  { key: 'avg_density',       label: 'Density',    decimals: 1 },
]

interface SectionComparisonProps {
  stats: SectionStat[]
}

export function SectionComparison({ stats }: SectionComparisonProps) {
  if (!stats.length) return null

  const colRanges = useMemo(() =>
    COLS.map(c => {
      const vals = stats.map(s => s[c.key] as number)
      return { min: Math.min(...vals), max: Math.max(...vals) }
    })
  , [stats])

  return (
    <Card title="Section Comparison">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)' }}>
              <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Section
              </th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 500, color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                ×
              </th>
              {COLS.map(c => (
                <th key={c.key} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s, si) => (
              <tr key={si} style={{ borderBottom: si < stats.length - 1 ? '1px solid var(--rule-soft)' : 'none' }}>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '2px 10px', borderRadius: 999,
                    background: sectionColor(s.label),
                    color: sectionInkColor(s.label),
                    fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sectionInkColor(s.label), flexShrink: 0 }}/>
                    {s.label}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
                  {s.instances}
                </td>
                {COLS.map((c, ci) => {
                  const val = s[c.key] as number
                  const { min, max } = colRanges[ci]
                  const pct = max > min ? ((val - min) / (max - min)) * 100 : 50
                  return (
                    <td key={c.key} style={{ padding: '10px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)', marginBottom: 3 }}>
                        {val.toFixed(c.decimals)}
                      </div>
                      <div style={{ height: 3, background: 'var(--paper-edge)', borderRadius: 2 }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: 'var(--accent)', borderRadius: 2, opacity: 0.7,
                        }}/>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
