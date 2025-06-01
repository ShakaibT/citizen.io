import useSWR from 'swr'

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

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useOfficialsData(state: string | null) {
  const { data, error, isLoading } = useSWR<OfficialsResponse>(
    state ? `/api/officials?state=${state}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
      fallbackData: { officials: [], lastUpdated: '', source: 'none' }
    }
  )

  return {
    data: data || { officials: [], lastUpdated: '', source: 'none' },
    error,
    isLoading: state ? isLoading : false
  }
} 