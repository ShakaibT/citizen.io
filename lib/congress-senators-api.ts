/**
 * Specialized Congress.gov API module for fetching U.S. Senators
 * 
 * The main Congress API endpoint seems to only return House members,
 * so this module tries different approaches to get Senate data.
 */

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY
const CONGRESS_API_BASE = 'https://api.congress.gov/v3'

interface CongressMember {
  bioguideId: string
  name: string
  partyName: string
  state: string
  stateName?: string
  url: string
  currentMember?: boolean
  terms?: {
    item: Array<{
      chamber: string
      startYear: number
      endYear?: number
      district?: string
      stateCode?: string
      stateName?: string
    }>
  }
}

interface Official {
  name: string
  office: string
  party: string
  state: string
  level: 'federal' | 'state' | 'local'
  office_type: 'executive' | 'legislative' | 'judicial'
  bioguide_id?: string
  congress_url?: string
  district?: string
}

/**
 * State abbreviations mapping
 */
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

/**
 * Approach 1: Search through all current senators to find ones from the specified state
 */
async function findCurrentSenatorsByState(stateAbbr: string): Promise<Official[]> {
  if (!CONGRESS_API_KEY) return []
  
  console.log(`🔍 Searching for current senators from ${stateAbbr}...`)
  
  try {
    // Get all current senators
    const response = await fetch(
      `${CONGRESS_API_BASE}/member?currentMember=true&api_key=${CONGRESS_API_KEY}&limit=100`
    )
    
    if (!response.ok) {
      console.log(`⚠️ Failed to fetch current members: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    console.log(`📊 Found ${data.members?.length || 0} current members`)
    
    if (!data.members) return []
    
    // Filter for senators from the specified state
    const senators = data.members.filter((member: CongressMember) => {
      const terms = member.terms?.item || []
      const currentTerm = terms[terms.length - 1]
      
      // Check if this is a current senator from the specified state
      const isSenator = currentTerm?.chamber === 'Senate'
      const isFromState = currentTerm?.stateCode === stateAbbr || member.state === stateAbbr
      
      if (isSenator && isFromState) {
        console.log(`✅ Found senator: ${member.name} from ${currentTerm?.stateCode || member.state}`)
        return true
      }
      
      return false
    })
    
    console.log(`🎯 Found ${senators.length} senators from ${stateAbbr}`)
    
    return senators.map((member: CongressMember) => ({
      name: formatMemberName(member.name),
      office: 'U.S. Senator',
      party: normalizePartyName(member.partyName),
      state: stateAbbr,
      level: 'federal' as const,
      office_type: 'legislative' as const,
      bioguide_id: member.bioguideId,
      congress_url: member.url
    }))
    
  } catch (error) {
    console.log(`❌ Error searching for senators:`, error)
    return []
  }
}

/**
 * Approach 2: Use fallback data for Pennsylvania senators
 */
function getPennsylvaniaSenatorsFromFallback(): Official[] {
  console.log(`📋 Using fallback data for Pennsylvania senators...`)
  
  // Current PA senators as of 2025
  return [
    {
      name: 'Dave McCormick',
      office: 'U.S. Senator',
      party: 'Republican',
      state: 'PA',
      level: 'federal' as const,
      office_type: 'legislative' as const,
      bioguide_id: 'M001243'
    },
    {
      name: 'John Fetterman',
      office: 'U.S. Senator', 
      party: 'Democratic',
      state: 'PA',
      level: 'federal' as const,
      office_type: 'legislative' as const,
      bioguide_id: 'F000482'
    }
  ]
}

/**
 * Main function to fetch senators for a state
 */
export async function fetchSenatorsForState(stateName: string): Promise<Official[]> {
  const stateAbbr = STATE_ABBREVIATIONS[stateName] || stateName
  
  console.log(`🔄 Fetching senators for ${stateName} (${stateAbbr})...`)
  
  // Try to find current senators from the API
  let senators = await findCurrentSenatorsByState(stateAbbr)
  
  if (senators.length > 0) {
    console.log(`✅ Found ${senators.length} senators via API for ${stateName}`)
    return senators
  }
  
  // For Pennsylvania specifically, use fallback data if API fails
  if (stateAbbr === 'PA' || stateName === 'Pennsylvania') {
    console.log(`🎯 Using fallback data for Pennsylvania...`)
    return getPennsylvaniaSenatorsFromFallback()
  }
  
  console.log(`⚠️ No senators found for ${stateName}`)
  return []
}

/**
 * Helper function to format member names from "Last, First" to "First Last"
 */
function formatMemberName(name: string): string {
  if (name.includes(',')) {
    const parts = name.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      return `${parts[1]} ${parts[0]}`
    }
  }
  return name
}

/**
 * Helper function to normalize party names
 */
function normalizePartyName(partyName: string): string {
  if (!partyName) return 'Unknown'
  
  const normalized = partyName.toLowerCase()
  if (normalized.includes('republican')) return 'Republican'
  if (normalized.includes('democratic') || normalized.includes('democrat')) return 'Democratic'
  if (normalized.includes('independent')) return 'Independent'
  
  return partyName
} 