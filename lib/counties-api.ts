// Counties Data API
// Fetches county population data from Census API
// Links counties with their federal representatives
// Stores in Supabase for fast access

import { createClient } from '@supabase/supabase-js'
import { CensusCounty, getCountiesByState, getStateByIdentifier } from './census-api'
import { getPrimaryDistrictForCounty } from './county-district-mapping'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Initialize Supabase client with service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// State name to abbreviation mapping
const STATE_ABBREVIATIONS: { [key: string]: string } = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
}

export interface CountyData {
  id?: string
  name: string
  state: string
  stateFips: string
  countyFips: string
  fullFips: string
  population?: number
  landArea?: number
  density?: number
  medianIncome?: number
  countySeat?: string
  representatives?: RepresentativeInfo[]
}

export interface RepresentativeInfo {
  name: string
  office: string
  party?: string
  district?: string
  bioguideId?: string
}

/**
 * Get state abbreviation from state name
 */
function getStateAbbreviation(stateName: string): string {
  return STATE_ABBREVIATIONS[stateName] || stateName
}

/**
 * Store county data in Supabase
 */
export async function storeCounty(county: CensusCounty): Promise<void> {
  try {
    console.log('🔄 Storing county:', county.name)
    
    // Extract state and county FIPS from the full FIPS code
    const stateFips = county.fips.slice(0, 2)
    const countyFips = county.fips.slice(2)
    
    // Ensure all required fields are present
    const countyData = {
      name: county.name,
      state: county.state,
      state_fips: stateFips,
      county_fips: countyFips,
      full_fips: county.fips,
      population: county.population || null,
      land_area: null, // Not available in CensusCounty
      water_area: null // Not available in CensusCounty
    }

    // Use the upsert function instead of direct insert
    const { data, error } = await supabase.rpc('upsert_county', {
      p_name: countyData.name,
      p_state: countyData.state,
      p_state_fips: countyData.state_fips,
      p_county_fips: countyData.county_fips,
      p_full_fips: countyData.full_fips,
      p_population: countyData.population,
      p_land_area: countyData.land_area,
      p_water_area: countyData.water_area
    })

    if (error) {
      console.error('❌ Error in storeCounty:', error)
      throw error
    }

    console.log('✅ Successfully stored county:', county.name)
  } catch (error) {
    console.error('❌ Failed to store county:', county.name, error)
    throw error
  }
}

/**
 * Fetch and store county data for a state
 */
export async function fetchAndStoreCountyData(stateName: string): Promise<void> {
  try {
    console.log(`🔄 Fetching county data for ${stateName}...`)
    
    // Get state info
    const state = await getStateByIdentifier(stateName)
    if (!state) {
      throw new Error(`State not found: ${stateName}`)
    }

    // Fetch counties from Census API
    const counties = await getCountiesByState(state.fips)
    console.log(`📊 Found ${counties.length} counties for ${stateName}`)

    let successCount = 0
    let errorCount = 0

    // Store each county
    for (const county of counties) {
      try {
        await storeCounty(county)
        successCount++
      } catch (error) {
        console.error(`❌ Failed to store county ${county.name}:`, error)
        errorCount++
      }
    }

    console.log(`✅ Successfully stored ${successCount} counties for ${stateName}`)
    if (errorCount > 0) {
      console.warn(`⚠️ Failed to store ${errorCount} counties for ${stateName}`)
    }

  } catch (error) {
    console.error(`❌ Error fetching county data for ${stateName}:`, error)
    throw error
  }
}

/**
 * Get federal representatives for a specific county
 */
export async function getFederalRepresentativesForCounty(countyName: string, stateName: string): Promise<RepresentativeInfo[]> {
  try {
    const stateAbbr = getStateAbbreviation(stateName)
    
    // Get the congressional district for this county
    const district = getPrimaryDistrictForCounty(countyName, stateName)
    
    // Get state-level officials (Governor, Senators)
    const { data: stateOfficials, error: stateError } = await supabase
      .from('officials')
      .select('*')
      .or(`state.ilike.${stateName},state.ilike.${stateAbbr},state.ilike.${stateName.toUpperCase()},state.ilike.${stateAbbr.toUpperCase()}`)
      .eq('level', 'federal')
      .in('office_type', ['executive'])
      .order('office', { ascending: true })

    if (stateError) {
      console.error(`❌ Error fetching state officials for ${stateName}:`, stateError)
    }

    // Get senators
    const { data: senators, error: senateError } = await supabase
      .from('officials')
      .select('*')
      .or(`state.ilike.${stateName},state.ilike.${stateAbbr},state.ilike.${stateName.toUpperCase()},state.ilike.${stateAbbr.toUpperCase()}`)
      .eq('level', 'federal')
      .ilike('office', '%senator%')
      .order('name', { ascending: true })

    if (senateError) {
      console.error(`❌ Error fetching senators for ${stateName}:`, senateError)
    }

    // Get the specific House representative for this district
    let houseRep = null
    if (district) {
      const { data: representative, error: repError } = await supabase
        .from('officials')
        .select('*')
        .or(`state.ilike.${stateName},state.ilike.${stateAbbr},state.ilike.${stateName.toUpperCase()},state.ilike.${stateAbbr.toUpperCase()}`)
        .eq('level', 'federal')
        .eq('district', district)
        .ilike('office', '%representative%')
        .single()

      if (repError) {
        console.log(`⚠️ No representative found for district ${district} in ${stateName}`)
      } else {
        houseRep = representative
      }
    }

    // Combine all representatives
    const allReps = [
      ...(stateOfficials || []),
      ...(senators || []),
      ...(houseRep ? [houseRep] : [])
    ]

    console.log(`📋 Found ${allReps.length} federal officials for ${countyName}, ${stateName} (District ${district || 'unknown'})`)

    return allReps.map(official => ({
      name: official.name,
      office: official.office,
      party: official.party,
      district: official.district,
      bioguideId: official.bioguide_id
    }))

  } catch (error) {
    console.error(`❌ Error getting federal representatives for ${countyName}, ${stateName}:`, error)
    return []
  }
}

/**
 * Get federal representatives for a state (all representatives)
 */
export async function getFederalRepresentatives(stateName: string): Promise<RepresentativeInfo[]> {
  try {
    const stateAbbr = getStateAbbreviation(stateName)
    
    // Use case-insensitive matching for state names
    const { data: officials, error } = await supabase
      .from('officials')
      .select('*')
      .or(`state.ilike.${stateName},state.ilike.${stateAbbr},state.ilike.${stateName.toUpperCase()},state.ilike.${stateAbbr.toUpperCase()}`)
      .eq('level', 'federal')
      .order('office_type', { ascending: true }) // Executive first, then legislative
      .order('office', { ascending: true })

    if (error) {
      console.error(`❌ Error fetching officials for ${stateName}:`, error)
      throw new Error(`Error fetching officials: ${error.message}`)
    }

    console.log(`📋 Found ${officials?.length || 0} federal officials for ${stateName}`)

    return officials?.map(official => ({
      name: official.name,
      office: official.office,
      party: official.party,
      district: official.district,
      bioguideId: official.bioguide_id
    })) || []

  } catch (error) {
    console.error(`❌ Error getting federal representatives for ${stateName}:`, error)
    return []
  }
}

/**
 * Get county data with representatives
 */
export async function getCountyWithRepresentatives(countyName: string, stateName: string): Promise<CountyData | null> {
  try {
    console.log(`🔍 Getting county data for ${countyName}, ${stateName}`)

    // Get county from database
    const { data: county, error } = await supabase
      .from('counties')
      .select('*')
      .eq('name', countyName)
      .eq('state', stateName)
      .single()

    if (error || !county) {
      console.log(`❌ County not found: ${countyName}, ${stateName}`)
      return null
    }

    // Get federal representatives for this specific county
    const representatives = await getFederalRepresentativesForCounty(countyName, stateName)

    return {
      id: county.id,
      name: county.name,
      state: county.state,
      stateFips: county.state_fips,
      countyFips: county.county_fips,
      fullFips: county.full_fips,
      population: county.population,
      landArea: county.land_area,
      density: county.density,
      medianIncome: county.median_income,
      countySeat: county.county_seat,
      representatives: representatives
    }

  } catch (error) {
    console.error(`❌ Error getting county data for ${countyName}, ${stateName}:`, error)
    return null
  }
}

/**
 * Get all counties for a state with their representatives
 */
export async function getCountiesForState(stateName: string): Promise<CountyData[]> {
  try {
    console.log(`🔍 Getting all counties for state: ${stateName}`)

    // Get counties from database
    const { data: counties, error } = await supabase
      .from('counties')
      .select('*')
      .eq('state', stateName)
      .order('name')

    if (error) {
      throw new Error(`Error fetching counties: ${error.message}`)
    }

    if (!counties || counties.length === 0) {
      console.log(`⚠️ No counties found in database for ${stateName}, fetching from API...`)
      
      try {
        await fetchAndStoreCountyData(stateName)
        
        // Try again after storing
        const { data: retryCounties, error: retryError } = await supabase
          .from('counties')
          .select('*')
          .eq('state', stateName)
          .order('name')

        if (retryError) {
          throw new Error(`Error fetching counties after storing: ${retryError.message}`)
        }

        return retryCounties?.map(county => ({
          id: county.id,
          name: county.name,
          state: county.state,
          stateFips: county.state_fips,
          countyFips: county.county_fips,
          fullFips: county.full_fips,
          population: county.population,
          landArea: county.land_area,
          density: county.density,
          medianIncome: county.median_income,
          countySeat: county.county_seat,
          representatives: []
        })) || []
      } catch (fetchError) {
        console.error(`❌ Error fetching and storing county data:`, fetchError)
        throw fetchError
      }
    }

    // Get federal representatives for each county individually
    const countiesWithReps = await Promise.all(
      counties.map(async (county: any) => {
        const representatives = await getFederalRepresentativesForCounty(county.name, stateName)
        
        return {
          id: county.id,
          name: county.name,
          state: county.state,
          stateFips: county.state_fips,
          countyFips: county.county_fips,
          fullFips: county.full_fips,
          population: county.population,
          landArea: county.land_area,
          density: county.density,
          medianIncome: county.median_income,
          countySeat: county.county_seat,
          representatives: representatives
        }
      })
    )

    return countiesWithReps

  } catch (error) {
    console.error(`❌ Error getting counties for ${stateName}:`, error)
    throw error
  }
}

/**
 * Initialize county data for a state
 */
export async function initializeCountyData(stateName: string): Promise<void> {
  try {
    console.log(`🔄 Initializing county data for ${stateName}...`)
    
    // Fetch and store county data
    await fetchAndStoreCountyData(stateName)
    
    console.log(`✅ ${stateName} county data initialization completed`)
    
  } catch (error) {
    console.error(`❌ Error initializing county data for ${stateName}:`, error)
    throw error
  }
}