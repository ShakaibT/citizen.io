import useSWR from 'swr'
import { get, set } from 'idb-keyval'

interface Official {
  name: string
  party?: string
  phones?: string[]
  urls?: string[]
  emails?: string[]
  office: string
}

interface OfficialsData {
  ocdId: string
  officials: Official[]
}

const GOOGLE_CIVIC_API_BASE = 'https://www.googleapis.com/civicinfo/v2'
const OPENSTATES_API_BASE = 'https://v3.openstates.org'
const FIVECALLS_API_BASE = 'https://5calls.org/api'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

const getCachedData = async (cacheKey: string): Promise<{ data: OfficialsData, timestamp: number } | null> => {
  try {
    const result = await get(cacheKey)
    return result || null
  } catch (error) {
    console.warn('Officials cache read error:', error)
    return null
  }
}

const setCachedData = async (cacheKey: string, data: OfficialsData): Promise<void> => {
  try {
    await set(cacheKey, { data, timestamp: Date.now() })
  } catch (error) {
    console.warn('Officials cache write error:', error)
  }
}

const processGoogleCivicData = (data: any, ocdId: string): OfficialsData => {
  const officials: Official[] = []
  
  if (data.offices && data.officials) {
    data.offices.forEach((office: any) => {
      if (office.officialIndices) {
        office.officialIndices.forEach((index: number) => {
          const official = data.officials[index]
          if (official) {
            officials.push({
              name: official.name,
              party: official.party,
              phones: official.phones,
              urls: official.urls,
              emails: official.emails,
              office: office.name
            })
          }
        })
      }
    })
  }
  
  return { ocdId, officials }
}

const getOfficialsFallback = async (ocdId: string): Promise<OfficialsData> => {
  const officials: Official[] = []
  
  // Extract state from OCD-ID
  const parts = ocdId.split('/')
  const statePart = parts.find(p => p.startsWith('state:'))
  
  if (statePart) {
    const state = statePart.replace('state:', '')
    
    try {
      // Try OpenStates for state legislators
      const openStatesUrl = `${OPENSTATES_API_BASE}/people?jurisdiction=${state}&per_page=50`
      const openStatesData = await fetcher(openStatesUrl)
      
      if (openStatesData.results) {
        openStatesData.results.slice(0, 10).forEach((person: any) => {
          officials.push({
            name: person.name,
            party: person.party?.[0]?.name,
            office: `${person.current_role?.title || 'State Legislator'} - ${person.current_role?.district || 'Unknown District'}`,
            urls: person.links?.map((link: any) => link.url) || []
          })
        })
      }
    } catch (error) {
      console.warn('OpenStates API failed:', error)
    }
    
    try {
      // Try 5Calls for federal representatives (simplified)
      // Note: 5Calls API structure may vary, this is a basic implementation
      const fiveCallsUrl = `${FIVECALLS_API_BASE}/reps-by-state/${state}`
      const fiveCallsData = await fetcher(fiveCallsUrl)
      
      if (fiveCallsData && Array.isArray(fiveCallsData)) {
        fiveCallsData.slice(0, 5).forEach((rep: any) => {
          officials.push({
            name: rep.name,
            party: rep.party,
            office: rep.office || 'Federal Representative',
            phones: rep.phone ? [rep.phone] : undefined
          })
        })
      }
    } catch (error) {
      console.warn('5Calls API failed:', error)
    }
  }
  
  return { ocdId, officials }
}

export function useOfficialsData(ocdId: string | null) {
  const shouldFetch = ocdId !== null
  const cacheKey = `officials-${ocdId}`
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY
  
  const { data, error, isLoading } = useSWR(
    shouldFetch ? cacheKey : null,
    async () => {
      if (!ocdId) return { ocdId: '', officials: [] }
      
      // Check cache first
      const cached = await getCachedData(cacheKey)
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.data
      }

      let result: OfficialsData

      // Try Google Civic API first
      if (apiKey) {
        try {
          const googleUrl = `${GOOGLE_CIVIC_API_BASE}/representatives/${ocdId}?key=${apiKey}`
          const googleData = await fetcher(googleUrl)
          result = processGoogleCivicData(googleData, ocdId)
        } catch (error: any) {
          console.warn('Google Civic API failed:', error)
          
          // If Google API fails with 404/410, try fallback
          if (error.message.includes('404') || error.message.includes('410')) {
            result = await getOfficialsFallback(ocdId)
          } else {
            throw error
          }
        }
      } else {
        // No API key, use fallback immediately
        result = await getOfficialsFallback(ocdId)
      }
      
      // Cache the result
      await setCachedData(cacheKey, result)
      
      return result
    },
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      dedupingInterval: CACHE_DURATION,
      fallbackData: { ocdId: ocdId || '', officials: [] },
      onError: (err) => {
        console.warn('Officials data hook error:', err)
      }
    }
  )

  return {
    data: data || { ocdId: ocdId || '', officials: [] },
    error,
    isLoading: shouldFetch ? isLoading : false
  }
} 