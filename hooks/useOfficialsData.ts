import useSWR from 'swr'

// Global cache for officials data to enable instant loading
const officialsCache = new Map<string, OfficialsResponse>()

interface Official {
  id?: string
  name: string
  office: string
  party?: string
  phone?: string
  email?: string
  website?: string
  photo_url?: string
  address?: string
  state: string
  district?: string
  level: 'federal' | 'state' | 'local'
  office_type: 'executive' | 'legislative' | 'judicial'
  term_start?: string
  term_end?: string
  last_updated: string
  source: 'google_civic' | 'ballotpedia' | 'manual'
}

interface OfficialsResponse {
  officials: Official[]
  lastUpdated: string
  source: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  
  // Cache the result for instant future access
  const stateParam = new URL(url, window.location.origin).searchParams.get('state')
  if (stateParam && data) {
    officialsCache.set(stateParam, data)
  }
  
  return data
}

export function useOfficialsData(state: string | null) {
  // Check cache first for instant loading
  const cachedData = state ? officialsCache.get(state) : null
  
  const { data, error, isLoading } = useSWR<OfficialsResponse>(
    state ? `/api/officials?state=${state}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute for faster loading
      refreshInterval: 0, // Disable automatic refresh
      errorRetryCount: 1, // Reduce retry attempts
      errorRetryInterval: 1000, // Faster retry
      fallbackData: cachedData || { officials: [], lastUpdated: '', source: 'none' },
      keepPreviousData: true // Keep previous data while loading new
    }
  )

  return {
    data: data || cachedData || { officials: [], lastUpdated: '', source: 'none' },
    error,
    isLoading: state ? (cachedData ? false : isLoading) : false // If cached, not loading
  }
} 