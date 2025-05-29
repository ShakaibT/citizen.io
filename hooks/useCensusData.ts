import useSWR from 'swr'
import { PopulationRecord, CountyPopulationRecord } from '@/lib/types/map'

const CENSUS_API_BASE = 'https://api.census.gov/data/2023/acs/acs1'
const SQUARE_METERS_TO_SQUARE_MILES = 0.000000386102

// Census API returns array of arrays, first row is headers
type CensusResponse = string[][]

// Fallback data for when Census API is unavailable
const fallbackStateData: PopulationRecord[] = [
  { state: 'California', stateFips: '06', population: 39538223, landArea: 403466000000, density: 253.9, name: 'California' },
  { state: 'Texas', stateFips: '48', population: 29145505, landArea: 676587000000, density: 111.6, name: 'Texas' },
  { state: 'Florida', stateFips: '12', population: 21538187, landArea: 138887000000, density: 401.4, name: 'Florida' },
  { state: 'New York', stateFips: '36', population: 20201249, landArea: 122057000000, density: 428.7, name: 'New York' },
  { state: 'Pennsylvania', stateFips: '42', population: 13002700, landArea: 115883000000, density: 290.8, name: 'Pennsylvania' },
  // Add more states as needed...
]

const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

const processStateData = (data: CensusResponse): PopulationRecord[] => {
  if (!data || data.length < 2) return fallbackStateData
  
  const headers = data[0]
  const populationIndex = headers.indexOf('B01003_001E')
  const nameIndex = headers.indexOf('NAME')
  const landAreaIndex = headers.indexOf('AREALAND')
  const stateIndex = headers.indexOf('state')
  
  return data.slice(1).map(row => {
    const population = parseInt(row[populationIndex]) || 0
    const landArea = parseInt(row[landAreaIndex]) || 1
    const landAreaSqMiles = landArea * SQUARE_METERS_TO_SQUARE_MILES
    const density = landAreaSqMiles > 0 ? population / landAreaSqMiles : 0
    
    return {
      state: row[nameIndex],
      stateFips: row[stateIndex],
      population,
      landArea,
      density: Math.round(density * 10) / 10,
      name: row[nameIndex]
    }
  })
}

const processCountyData = (data: CensusResponse, stateFips: string): CountyPopulationRecord[] => {
  if (!data || data.length < 2) return []
  
  const headers = data[0]
  const populationIndex = headers.indexOf('B01003_001E')
  const nameIndex = headers.indexOf('NAME')
  const landAreaIndex = headers.indexOf('AREALAND')
  const countyIndex = headers.indexOf('county')
  const stateIndexInData = headers.indexOf('state')
  
  return data.slice(1).map(row => {
    const population = parseInt(row[populationIndex]) || 0
    const landArea = parseInt(row[landAreaIndex]) || 1
    const landAreaSqMiles = landArea * SQUARE_METERS_TO_SQUARE_MILES
    const density = landAreaSqMiles > 0 ? population / landAreaSqMiles : 0
    
    return {
      county: row[countyIndex],
      countyFips: row[countyIndex],
      state: stateFips,
      stateFips: row[stateIndexInData],
      population,
      landArea,
      density: Math.round(density * 10) / 10,
      name: row[nameIndex],
    }
  })
}

export function useStatePopulationData() {
  const { data, error, isLoading } = useSWR(
    `${CENSUS_API_BASE}?get=B01003_001E,NAME,AREALAND&for=state:*`,
    fetcher,
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      dedupingInterval: 7 * 24 * 60 * 60 * 1000, // 1 week
      fallbackData: fallbackStateData,
      onError: (err) => {
        console.warn('Census API failed, using fallback data:', err)
      }
    }
  )

  const processedData = data ? processStateData(data) : fallbackStateData

  return {
    data: processedData,
    error,
    isLoading
  }
}

export function useCountyPopulationData(stateFips: string | null) {
  const shouldFetch = stateFips !== null
  
  const { data, error, isLoading } = useSWR(
    shouldFetch ? `${CENSUS_API_BASE}?get=B01003_001E,NAME,AREALAND&for=county:*&in=state:${stateFips}` : null,
    fetcher,
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      dedupingInterval: 7 * 24 * 60 * 60 * 1000, // 1 week
      onError: (err) => {
        console.warn('County Census API failed:', err)
      }
    }
  )

  const processedData = data && stateFips ? processCountyData(data, stateFips) : []

  return {
    data: processedData,
    error,
    isLoading: shouldFetch ? isLoading : false
  }
} 