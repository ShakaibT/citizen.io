import useSWR from 'swr'
import { OfficialsRecord } from '@/lib/types/map'

const GOOGLE_CIVIC_API_BASE = 'https://www.googleapis.com/civicinfo/v2'
const OPENSTATES_API_BASE = 'https://v3.openstates.org'
const FIVECALLS_API_BASE = 'https://5calls.org/api'

interface GoogleCivicResponse {
  offices: Array<{
    name: string
    officialIndices: number[]
  }>
  officials: Array<{
    name: string
    party?: string
    phones?: string[]
    urls?: string[]
    emails?: string[]
  }>
}

const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

const processGoogleCivicData = (data: GoogleCivicResponse, divisionId: string): OfficialsRecord => {
  const offices = data.offices?.map(office => ({
    name: office.name,
    officials: office.officialIndices?.map(index => data.officials[index]) || []
  })) || []

  return {
    divisionId,
    offices
  }
}

const getOfficialsFallback = async (divisionId: string): Promise<OfficialsRecord> => {
  // Extract state and county from OCD-ID
  const parts = divisionId.split('/')
  const statePart = parts.find(p => p.startsWith('state:'))
  const countyPart = parts.find(p => p.startsWith('county:'))
  
  if (!statePart) {
    return { divisionId, offices: [] }
  }

  const state = statePart.replace('state:', '')
  
  try {
    // Try OpenStates for state legislators
    const openStatesUrl = `${OPENSTATES_API_BASE}/people?jurisdiction=${state}&per_page=100`
    const openStatesData = await fetcher(openStatesUrl)
    
    // Try 5Calls for federal representatives (simplified)
    const offices = [
      {
        name: 'State Legislature',
        officials: openStatesData.results?.slice(0, 10) || [] // Limit for performance
      }
    ]

    return {
      divisionId,
      offices
    }
  } catch (error) {
    console.warn('Fallback officials API failed:', error)
    return { divisionId, offices: [] }
  }
}

export function useOfficials(divisionId: string | null) {
  const shouldFetch = divisionId !== null
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CIVIC_API_KEY
  
  const { data, error, isLoading } = useSWR(
    shouldFetch && apiKey ? 
      `${GOOGLE_CIVIC_API_BASE}/representatives/${divisionId}?key=${apiKey}` : 
      null,
    async (url: string) => {
      try {
        const data = await fetcher(url)
        return processGoogleCivicData(data, divisionId!)
      } catch (error: any) {
        // If Google Civic API fails (404/410), try fallback
        if (error.message.includes('404') || error.message.includes('410')) {
          console.warn('Google Civic API unavailable, using fallback')
          return await getOfficialsFallback(divisionId!)
        }
        throw error
      }
    },
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      dedupingInterval: 24 * 60 * 60 * 1000, // 24 hours
      onError: (err) => {
        console.warn('Officials API failed:', err)
      }
    }
  )

  return {
    data: data || { divisionId: divisionId || '', offices: [] },
    error,
    isLoading: shouldFetch ? isLoading : false
  }
} 