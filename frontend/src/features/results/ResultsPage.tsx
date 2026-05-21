import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useResults } from '../../hooks/useResults'
import { HeroSummary } from './HeroSummary'
import { SubHeader } from './SubHeader'
import { WaveformCard } from './WaveformCard'
import { SignalsCard } from './SignalsCard'
import { PitchClassCard } from './PitchClassCard'

export function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { result, isLoading, error } = useResults(jobId!)
  const [selectedChord, setSelectedChord] = useState<string | null>(null)

  if (isLoading) {
    return (
      <main style={{ maxWidth: 1080, margin: '48px auto', padding: '0 28px' }}>
        <div style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Loading results…
        </div>
      </main>
    )
  }

  if (error || !result) {
    return (
      <main style={{ maxWidth: 1080, margin: '48px auto', padding: '0 28px' }}>
        <div style={{
          background: 'color-mix(in oklab, var(--warn) 8%, var(--paper-2))',
          border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
          borderRadius: 8, padding: '16px 20px',
        }}>
          <div className="d-eyebrow" style={{ color: 'var(--warn)', marginBottom: 6 }}>Failed to load results</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>
            {error?.message ?? 'Results not found.'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 1080, margin: '40px auto', padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SubHeader result={result} />
      <HeroSummary result={result} />
      <WaveformCard
        result={result}
        selectedChord={selectedChord}
        onChordSelect={setSelectedChord}
      />
      <SignalsCard result={result} selectedChord={selectedChord} onChordSelect={setSelectedChord} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <PitchClassCard histogram={result.pitch_class_histogram} tonic={result.key.root} />
        {/* InstrumentsCard added in Task 17 */}
      </div>
      {/* SectionComparison + TranspositionCard added in Task 17 */}
    </main>
  )
}
