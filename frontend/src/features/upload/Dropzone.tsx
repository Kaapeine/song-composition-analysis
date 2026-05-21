import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { Pill } from '../../components/Pill'

const ACCEPTED_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aiff', 'audio/x-aiff'])
const ACCEPTED_EXTS = new Set(['.mp3', '.wav', '.flac', '.aiff', '.aif'])

function isAudio(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_EXTS.has(ext)
}

interface DropzoneProps {
  file: File | null
  onFile: (f: File) => void
  onClear: () => void
  error: string | null
}

export function Dropzone({ file, onFile, onClear, error }: DropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && isAudio(dropped)) onFile(dropped)
  }

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (picked) onFile(picked)
    e.target.value = ''
  }

  const borderColor = dragging ? 'var(--accent)' : error ? 'var(--warn)' : 'var(--rule)'
  const bgColor = dragging
    ? 'color-mix(in oklab, var(--accent) 6%, var(--paper-2))'
    : 'var(--paper-2)'

  return (
    <div>
      {error && (
        <Pill style={{ marginBottom: 10, color: 'var(--warn)', borderColor: 'color-mix(in oklab, var(--warn) 40%, transparent)' }}>
          {error}
        </Pill>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 12,
          background: bgColor,
          padding: '32px 24px',
          textAlign: 'center',
          cursor: file ? 'default' : 'pointer',
          transition: 'border-color 120ms, background 120ms',
          minHeight: 140,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {file ? (
          <>
            <div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
              {file.name}
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </div>
            <button
              className="btn ghost"
              onClick={(e) => { e.stopPropagation(); onClear() }}
              style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}
            >
              <Icon.X size={13}/> remove
            </button>
          </>
        ) : (
          <>
            <Icon.Upload size={28} style={{ color: 'var(--ink-3)', opacity: 0.6 }}/>
            <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>
              Drop an audio file here, or{' '}
              <span style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationColor: 'color-mix(in oklab, var(--accent) 40%, transparent)' }}>
                browse
              </span>
            </div>
            <div className="d-eyebrow" style={{ marginTop: 4 }}>MP3 · WAV · FLAC · AIFF · max 100 MB</div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.flac,.aiff,.aif,audio/*"
        style={{ display: 'none' }}
        onChange={handlePick}
      />
    </div>
  )
}
