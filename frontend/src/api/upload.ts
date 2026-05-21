import { apiFetch } from './client'
import type { FileResponse } from '../types/api'

export function uploadFile(file: File): Promise<FileResponse> {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<FileResponse>('/upload', { method: 'POST', body: form })
}
