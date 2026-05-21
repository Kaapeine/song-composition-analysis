import { useState } from 'react'
import { Card } from '../../components/Card'
import { Knob } from '../../components/Knob'
import { Screen } from '../../components/Screen'
import { Pill } from '../../components/Pill'
import { noteToMidi } from '../../lib/utils'
import type { TranspositionResult } from '../../types/api'

const MIDI_MIN = 36
const MIDI_MAX = 84

function PianoRangeBar({ min, max }: { min: string; max: string }) {
  const minM = noteToMidi(min)
  const maxM = noteToMidi(max)
  const leftPct = ((minM - MIDI_MIN) / (MIDI_MAX - MIDI_MIN)) * 100
  const widthPct = ((maxM - minM) / (MIDI_MAX - MIDI_MIN)) * 100
  return (
    <div style={{ flex: 1, height: 8, background: 'var(--paper-edge)', borderRadius: 4, position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, height: '100%',
        left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%`,
        background: 'linear-gradient(90deg, var(--accent-2), var(--accent))',
        borderRadius: 4,
      }}/>
    </div>
  )
}

interface TranspositionCardProps {
  transposition: TranspositionResult
}

export function TranspositionCard({ transposition }: TranspositionCardProps) {
  const [selected, setSelected] = useState(0)

  const { suggestions, vocal_range_original: orig } = transposition
  if (!suggestions?.length) return null

  const current = suggestions.find(s => s.semitones === selected) ?? suggestions[0]

  return (
    <Card
      title="Transposition"
      meta={orig ? `original: ${orig.min}–${orig.max} (${orig.span_semitones} semi)` : undefined}
    >
      <div style={{ padding: '16px 20px', display: 'flex', gap: 28, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Knob value={selected} onChange={setSelected} size={120}/>
          <Screen style={{ fontSize: 12, padding: '4px 12px', letterSpacing: '0.05em' }}>
            {selected >= 0 ? `+${selected}` : selected} semi · {current?.new_key ?? '?'}
          </Screen>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {suggestions.map(s => {
            const isSelected = s.semitones === selected
            return (
              <div key={s.semitones}
                onClick={() => setSelected(s.semitones)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 60px 1fr minmax(60px, 140px)',
                  alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 6, marginBottom: 4,
                  background: isSelected ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              >
                <span className="d-mono" style={{ fontSize: 12, color: isSelected ? 'var(--accent-ink)' : 'var(--ink-3)' }}>
                  {s.semitones >= 0 ? `+${s.semitones}` : s.semitones}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                  {s.new_key}
                </span>
                <PianoRangeBar min={s.vocal_range.min} max={s.vocal_range.max}/>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end', overflow: 'hidden' }}>
                  {s.fits_voice_types.map(vt => (
                    <Pill key={vt} style={{ fontSize: 10 }}>{vt}</Pill>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
