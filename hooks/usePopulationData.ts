import useSWR from 'swr'
import { get, set } from 'idb-keyval'
import { useMemo } from 'react'

interface PopulationRecord {
  name: string
  abbreviation: string
  fips: string
  population: number
}

interface CountyPopulationRecord {
  name: string
  state: string
  fips: string
  population: number
}

const CENSUS_API_BASE = 'https://api.census.gov/data/2023/acs/acs1'
const SQUARE_METERS_TO_SQUARE_MILES = 0.000000386102
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 1 week

// Complete fallback data for all 50 states with accurate 2023 Census estimates
const fallbackStateData: PopulationRecord[] = [
  { name: 'Alabama', fips: '01', population: 5108468, abbreviation: 'AL' },
  { name: 'Alaska', fips: '02', population: 733583, abbreviation: 'AK' },
  { name: 'Arizona', fips: '04', population: 7431344, abbreviation: 'AZ' },
  { name: 'Arkansas', fips: '05', population: 3067732, abbreviation: 'AR' },
  { name: 'California', fips: '06', population: 38965193, abbreviation: 'CA' },
  { name: 'Colorado', fips: '08', population: 5877610, abbreviation: 'CO' },
  { name: 'Connecticut', fips: '09', population: 3617176, abbreviation: 'CT' },
  { name: 'Delaware', fips: '10', population: 1031890, abbreviation: 'DE' },
  { name: 'Florida', fips: '12', population: 23244842, abbreviation: 'FL' },
  { name: 'Georgia', fips: '13', population: 11029227, abbreviation: 'GA' },
  { name: 'Hawaii', fips: '15', population: 1435138, abbreviation: 'HI' },
  { name: 'Idaho', fips: '16', population: 1964726, abbreviation: 'ID' },
  { name: 'Illinois', fips: '17', population: 12549689, abbreviation: 'IL' },
  { name: 'Indiana', fips: '18', population: 6862199, abbreviation: 'IN' },
  { name: 'Iowa', fips: '19', population: 3207004, abbreviation: 'IA' },
  { name: 'Kansas', fips: '20', population: 2940865, abbreviation: 'KS' },
  { name: 'Kentucky', fips: '21', population: 4526154, abbreviation: 'KY' },
  { name: 'Louisiana', fips: '22', population: 4573749, abbreviation: 'LA' },
  { name: 'Maine', fips: '23', population: 1402957, abbreviation: 'ME' },
  { name: 'Maryland', fips: '24', population: 6164660, abbreviation: 'MD' },
  { name: 'Massachusetts', fips: '25', population: 7001399, abbreviation: 'MA' },
  { name: 'Michigan', fips: '26', population: 10037261, abbreviation: 'MI' },
  { name: 'Minnesota', fips: '27', population: 5742363, abbreviation: 'MN' },
  { name: 'Mississippi', fips: '28', population: 2940057, abbreviation: 'MS' },
  { name: 'Missouri', fips: '29', population: 6196010, abbreviation: 'MO' },
  { name: 'Montana', fips: '30', population: 1122069, abbreviation: 'MT' },
  { name: 'Nebraska', fips: '31', population: 1978379, abbreviation: 'NE' },
  { name: 'Nevada', fips: '32', population: 3194176, abbreviation: 'NV' },
  { name: 'New Hampshire', fips: '33', population: 1402054, abbreviation: 'NH' },
  { name: 'New Jersey', fips: '34', population: 9500851, abbreviation: 'NJ' },
  { name: 'New Mexico', fips: '35', population: 2114371, abbreviation: 'NM' },
  { name: 'New York', fips: '36', population: 19571216, abbreviation: 'NY' },
  { name: 'North Carolina', fips: '37', population: 10835491, abbreviation: 'NC' },
  { name: 'North Dakota', fips: '38', population: 783926, abbreviation: 'ND' },
  { name: 'Ohio', fips: '39', population: 11785935, abbreviation: 'OH' },
  { name: 'Oklahoma', fips: '40', population: 4053824, abbreviation: 'OK' },
  { name: 'Oregon', fips: '41', population: 4233358, abbreviation: 'OR' },
  { name: 'Pennsylvania', fips: '42', population: 12961683, abbreviation: 'PA' },
  { name: 'Rhode Island', fips: '44', population: 1095962, abbreviation: 'RI' },
  { name: 'South Carolina', fips: '45', population: 5373555, abbreviation: 'SC' },
  { name: 'South Dakota', fips: '46', population: 919318, abbreviation: 'SD' },
  { name: 'Tennessee', fips: '47', population: 7126489, abbreviation: 'TN' },
  { name: 'Texas', fips: '48', population: 30976754, abbreviation: 'TX' },
  { name: 'Utah', fips: '49', population: 3417734, abbreviation: 'UT' },
  { name: 'Vermont', fips: '50', population: 647464, abbreviation: 'VT' },
  { name: 'Virginia', fips: '51', population: 8715698, abbreviation: 'VA' },
  { name: 'Washington', fips: '53', population: 7812880, abbreviation: 'WA' },
  { name: 'West Virginia', fips: '54', population: 1770071, abbreviation: 'WV' },
  { name: 'Wisconsin', fips: '55', population: 5910955, abbreviation: 'WI' },
  { name: 'Wyoming', fips: '56', population: 584057, abbreviation: 'WY' }
]

const fetcher = (url: string) => fetch(url).then(res => res.json())

const processData = (data: string[][], type: 'state' | 'county'): PopulationRecord[] => {
  if (!data || data.length < 2) return type === 'state' ? fallbackStateData : []
  
  const headers = data[0]
  const populationIndex = headers.indexOf('B01003_001E')
  const nameIndex = headers.indexOf('NAME')
  const landAreaIndex = headers.indexOf('AREALAND')
  const fipsIndex = headers.indexOf(type)
  
  return data.slice(1).map(row => {
    const population = parseInt(row[populationIndex]) || 0
    const landArea = parseInt(row[landAreaIndex]) || 1
    const landAreaSqMiles = landArea * SQUARE_METERS_TO_SQUARE_MILES
    const density = landAreaSqMiles > 0 ? population / landAreaSqMiles : 0
    
    return {
      name: row[nameIndex],
      fips: row[fipsIndex],
      population,
      landArea,
      density: Math.round(density * 10) / 10,
      abbreviation: row[nameIndex].split(', ')[1]
    }
  })
}

const getCachedData = async (cacheKey: string): Promise<{ data: PopulationRecord[], timestamp: number } | null> => {
  try {
    const result = await get(cacheKey)
    return result || null
  } catch (error) {
    console.warn('Cache read error:', error)
    return null
  }
}

const setCachedData = async (cacheKey: string, data: PopulationRecord[]): Promise<void> => {
  try {
    await set(cacheKey, { data, timestamp: Date.now() })
  } catch (error) {
    console.warn('Cache write error:', error)
  }
}

export function usePopulationData() {
  const { data: stateData, error: stateError, isLoading: stateLoading } = useSWR<PopulationRecord[]>(
    '/api/census/states',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // 10 seconds - force refresh for updated data
    }
  )

  // Calculate total US population from state data (including territories)
  const totalPopulation = useMemo(() => {
    if (!stateData || !Array.isArray(stateData)) return 0
    
    return stateData.reduce((total, state) => {
      // Include all states and territories for accurate total US population
      return total + (state.population || 0)
    }, 0)
  }, [stateData])

  // Transform state data to match the expected format - handle undefined data
  const statePopData = useMemo(() => {
    if (!stateData || !Array.isArray(stateData)) return []
    
    return stateData.map(state => ({
      name: state.name,
      fips: state.fips,
      population: state.population || 0,
      landArea: 0, // We'll calculate this if needed
      density: 0   // We'll calculate this if needed
    }))
  }, [stateData])

  return {
    statePopData,
    countyPopData: [], // Empty array since counties require a specific state
    totalPopulation,
    isLoading: stateLoading,
    error: stateError
  }
}

// Separate hook for county data that requires a state parameter
export function useCountyPopulationData(stateName?: string) {
  const { data: countyData, error: countyError, isLoading: countyLoading } = useSWR<CountyPopulationRecord[]>(
    stateName ? `/api/census/counties?state=${encodeURIComponent(stateName)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
    }
  )

  // Transform county data to match the expected format - handle undefined data
  const countyPopData = Array.isArray(countyData) ? countyData.map(county => ({
    name: county.name,
    state: county.state,
    fips: county.fips,
    population: county.population,
    landArea: 0, // We'll calculate this if needed
    density: 0   // We'll calculate this if needed
  })) : []

  return {
    countyPopData,
    isLoading: countyLoading,
    error: countyError
  }
} 