import { useParams } from 'react-router-dom'
import { useResults } from '../../hooks/useResults'
import { HeroSummary } from './HeroSummary'
import { SubHeader } from './SubHeader'

export function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { result, isLoading, error } = useResults(jobId!)

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
      {/* WaveformCard added in Task 14 */}
      {/* SignalsCard added in Task 15 */}
      {/* PitchClassCard + InstrumentsCard added in Tasks 16–17 */}
    </main>
  )
}
