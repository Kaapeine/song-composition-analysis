import { useQuery } from '@tanstack/react-query'
import { getJob } from '../api/jobs'
import type { JobStatus } from '../types/api'

export function usePollJob(jobId: string | null): {
  job: JobStatus | undefined
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'done' || status === 'failed') return false
      return 2500
    },
  })
  return { job: data, isLoading, error: error as Error | null }
}
