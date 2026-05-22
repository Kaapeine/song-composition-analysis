import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import type { AnalysisResult } from '../../types/api'

interface SubHeaderProps {
  result: AnalysisResult
}

export function SubHeader({ result }: SubHeaderProps) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <button
          onClick={() => navigate('/')}
          className="btn ghost"
          style={{ padding: '4px 8px' }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>← all analyses</span>
        </button>
        <h2 className="d-display" style={{ margin: 0, fontSize: 32, letterSpacing: '-0.02em' }}>
          {result.filename ?? result.job_id}
          <em className="d-display-i" style={{ fontSize: 18, color: 'var(--ink-3)', marginLeft: 10, fontWeight: 400 }}>
            analyzed just now
          </em>
        </h2>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" onClick={copyLink}>
          <Icon.Share size={14}/> {copied ? 'copied!' : 'share link'}
        </Button>
        <Button variant="ghost" disabled title="Export PDF — coming soon" style={{ opacity: 0.4 }}>
          <Icon.PDF size={14}/> export PDF
        </Button>
        <Button variant="ghost" onClick={copyJson}>
          <Icon.Copy size={14}/> copy JSON
        </Button>
      </div>
    </header>
  )
}
