import { useQuery } from '@tanstack/react-query'
import { getResults } from '../api/results'
import type { AnalysisResult } from '../types/api'

export function useResults(jobId: string): {
  result: AnalysisResult | undefined
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['results', jobId],
    queryFn: () => getResults(jobId),
    staleTime: Infinity,
  })
  return { result: data, isLoading, error: error as Error | null }
}
