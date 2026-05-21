import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import type { AnalysisResult } from '../../types/api'

interface SubHeaderProps {
  result: AnalysisResult
}

export function SubHeader({ result }: SubHeaderProps) {
  const { jobId } = useParams<{ jobId: string }>()
  const [copied, setCopied] = useState(false)

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Analysis</span>
        <span style={{ color: 'var(--rule)' }}>/</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)',
          maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {result.filename ?? jobId}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button variant="ghost" onClick={copyJson} title="Copy full result JSON">
          <Icon.Copy size={14}/> JSON
        </Button>
        <Button variant="ghost" onClick={copyLink} title="Copy share link">
          <Icon.Share size={14}/> {copied ? 'Copied!' : 'Share'}
        </Button>
        <Button variant="ghost" disabled title="Export PDF — coming soon" style={{ opacity: 0.4 }}>
          PDF
        </Button>
      </div>
    </div>
  )
}
