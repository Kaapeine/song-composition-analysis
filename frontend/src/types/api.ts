export type TimeSeries = [number, number][]

export interface Section {
  start: number
  end: number
  label: string
}

export interface ChordEntry {
  time: number
  duration: number
  chord: string
}

export interface BeatInfo {
  time: number
  beat_in_measure: number
}

export interface Stem {
  instrument_label?: string
  instrument_confidence?: number
  pitch_range?: { min: string; max: string; median: string }
  download_url?: string
}

export interface Key {
  root: string
  mode_quality: string
  mode_name: string
  mode_confidence: number
  key_confidence: number
}

export interface SectionStat {
  label: string
  instances: number
  avg_loudness_lufs: number
  avg_brightness: number
  avg_tension: number
  avg_density: number
  peak_rms: number
  chord_change_rate: number
}

export interface TranspositionResult {
  vocal_range_original?: { min: string; max: string; span_semitones: number }
  suggestions?: Array<{
    semitones: number
    new_key: string
    vocal_range: { min: string; max: string }
    fits_voice_types: string[]
  }>
}

export interface AnalysisResult {
  job_id: string
  filename?: string
  playback_url: string
  duration_sec: number
  key: Key
  bpm: number
  time_signature: string
  beats: number[]
  downbeats: number[]
  sections: Section[]
  harmonic?: {
    progression_fingerprint: string
    chords: ChordEntry[]
  }
  stems?: Record<string, Stem>
  pitch_class_histogram?: Record<string, number>
  dynamics?: {
    rms: TimeSeries
    loudness_lufs: TimeSeries
    brightness: TimeSeries
    onset_density: TimeSeries
    arrangement_density: TimeSeries
  }
  tension_curve?: TimeSeries
  section_comparison?: SectionStat[]
  transposition?: TranspositionResult
}

export interface JobStatus {
  job_id: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  stage: string | null
  progress: number
  created_at: string
  result: AnalysisResult | null
  error: string | null
}

export interface FileResponse {
  file_id: string
  filename: string
  duration_sec: number
  size_bytes: number
}

export interface AnalyzeOptions {
  detect_mode: boolean
  include_stems: boolean
}
