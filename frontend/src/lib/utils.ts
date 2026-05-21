import type { Section, TimeSeries } from '../types/api'

export function formatTime(secs: number): string {
  const s = Math.floor(secs)
  const m = Math.floor(s / 60)
  const remaining = s % 60
  return `${m}:${remaining.toString().padStart(2, '0')}`
}

// Max-pool downsampling: reduces a time series to targetBars points.
// Uses max (not average) so audio peaks aren't smoothed away.
export function downsampleRms(series: TimeSeries, targetBars: number): number[] {
  if (series.length <= targetBars) return series.map(([, v]) => v)
  const step = series.length / targetBars
  const result: number[] = []
  for (let i = 0; i < targetBars; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    const chunk = series.slice(start, end).map(([, v]) => v)
    result.push(Math.max(...chunk))
  }
  return result
}

// Maps allin1 HARMONIX_LABELS → theme.css color tokens.
// start/end are allin1's opening/closing boundary markers → intro/outro colors.
// break and solo map to inst (all instrumental).
const SECTION_BG: Record<string, string> = {
  start:  'var(--section-intro)',
  intro:  'var(--section-intro)',
  verse:  'var(--section-verse)',
  chorus: 'var(--section-chorus)',
  break:  'var(--section-bridge)',
  bridge: 'var(--section-bridge)',
  inst:   'var(--section-inst)',
  solo:   'var(--section-inst)',
  outro:  'var(--section-outro)',
  end:    'var(--section-outro)',
}

const SECTION_INK: Record<string, string> = {
  start:  'var(--section-intro-i)',
  intro:  'var(--section-intro-i)',
  verse:  'var(--section-verse-i)',
  chorus: 'var(--section-chorus-i)',
  break:  'var(--section-bridge-i)',
  bridge: 'var(--section-bridge-i)',
  inst:   'var(--section-inst-i)',
  solo:   'var(--section-inst-i)',
  outro:  'var(--section-outro-i)',
  end:    'var(--section-outro-i)',
}

export function sectionColor(label: string): string {
  return SECTION_BG[label] ?? 'var(--section-inst)'
}

export function sectionInkColor(label: string): string {
  return SECTION_INK[label] ?? 'var(--section-inst-i)'
}

export function activeSection(sections: Section[], currentTime: number): Section | null {
  return sections.find(s => currentTime >= s.start && currentTime < s.end) ?? null
}

const _PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Converts note name (e.g. "C4", "A#3") to MIDI number. Used by TranspositionCard.
export function noteToMidi(note: string): number {
  const m = note.match(/^([A-G]#?)(\d)$/)
  if (!m) return 60
  const idx = _PITCH_CLASSES.indexOf(m[1])
  if (idx === -1) return 60
  return idx + (parseInt(m[2]) + 1) * 12
}
