import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Authentication key for the sync endpoint
const SYNC_AUTH_KEY = process.env.DAILY_SYNC_AUTH_KEY || 'your-secure-sync-key'

interface SyncResult {
  state: string
  officials: {
    processed: number
    updated: number
    failed: number
    source: string
  }
  counties: {
    processed: number
    updated: number
    failed: number
    source: string
  }
  errors: string[]
}

interface DailySyncReport {
  syncDate: string
  totalStates: number
  successfulStates: number
  failedStates: number
  totalOfficials: number
  totalCounties: number
  apiCalls: number
  apiErrors: number
  executionTimeSeconds: number
  stateResults: SyncResult[]
  summary: {
    officialsSources: Record<string, number>
    countiesSources: Record<string, number>
    topErrors: string[]
  }
}

// List of all 50 US states
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]

// State abbreviation mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN',
  'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
}

async function fetchOfficialsFromCongress(state: string): Promise<any[]> {
  try {
    const congressApiKey = process.env.CONGRESS_API_KEY
    if (!congressApiKey) {
      throw new Error('Congress API key not configured')
    }

    const response = await fetch(
      `https://api.congress.gov/v3/member?currentMember=true&limit=250&api_key=${congressApiKey}`,
      { headers: { 'Accept': 'application/json' } }
    )

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status}`)
    }

    const data = await response.json()
    const stateMembers = data.members?.filter((member: any) => 
      member.state === state || member.state === STATE_ABBREVIATIONS[state]
    ) || []

    return stateMembers.map((member: any) => ({
      name: member.name,
      office: member.terms?.item?.[0]?.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
      party: member.partyName,
      state: state,
      state_abbreviation: STATE_ABBREVIATIONS[state],
      bioguide_id: member.bioguideId,
      district: member.district,
      congress_url: member.url,
      data_source: 'congress_api',
      last_updated: new Date().toISOString()
    }))
  } catch (error) {
    console.error(`Error fetching officials for ${state}:`, error)
    return []
  }
}

async function fetchCountiesFromCensus(state: string): Promise<any[]> {
  try {
    const stateCode = STATE_ABBREVIATIONS[state]
    const response = await fetch(
      `https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E&for=county:*&in=state:${getStateFips(stateCode)}&key=${process.env.CENSUS_API_KEY || ''}`
    )

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid Census API response')
    }

    return data.slice(1).map((row: any) => ({
      name: row[0].replace(` County, ${state}`, ''),
      state: state,
      state_abbreviation: stateCode,
      county_fips: row[3],
      state_fips: row[2],
      full_fips: `${row[2]}${row[3]}`,
      population: parseInt(row[1]) || 0,
      data_source: 'census_api',
      last_updated: new Date().toISOString()
    }))
  } catch (error) {
    console.error(`Error fetching counties for ${state}:`, error)
    return []
  }
}

function getStateFips(stateAbbr: string): string {
  const fipsMap: Record<string, string> = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
    'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
    'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
    'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
    'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
    'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
  }
  return fipsMap[stateAbbr] || '00'
}

async function syncStateData(state: string): Promise<SyncResult> {
  const result: SyncResult = {
    state,
    officials: { processed: 0, updated: 0, failed: 0, source: 'none' },
    counties: { processed: 0, updated: 0, failed: 0, source: 'none' },
    errors: []
  }

  try {
    // Sync Officials
    const officials = await fetchOfficialsFromCongress(state)
    result.officials.processed = officials.length
    result.officials.source = officials.length > 0 ? 'congress_api' : 'fallback'

    if (officials.length > 0) {
      for (const official of officials) {
        try {
          const { error } = await supabase
            .from('officials')
            .upsert(official, { 
              onConflict: 'name,state,office',
              ignoreDuplicates: false 
            })

          if (error) {
            result.officials.failed++
            result.errors.push(`Official ${official.name}: ${error.message}`)
          } else {
            result.officials.updated++
          }
        } catch (err) {
          result.officials.failed++
          result.errors.push(`Official ${official.name}: ${err}`)
        }
      }

      // Update fallback data with successful API data
      for (const official of officials) {
        await supabase
          .from('fallback_officials')
          .upsert({
            ...official,
            priority: official.office === 'Governor' ? 10 : 9,
            last_verified: new Date().toISOString()
          }, { onConflict: 'name,state,office' })
      }
    }

    // Sync Counties
    const counties = await fetchCountiesFromCensus(state)
    result.counties.processed = counties.length
    result.counties.source = counties.length > 0 ? 'census_api' : 'fallback'

    if (counties.length > 0) {
      for (const county of counties) {
        try {
          const { error } = await supabase
            .from('counties')
            .upsert(county, { 
              onConflict: 'name,state',
              ignoreDuplicates: false 
            })

          if (error) {
            result.counties.failed++
            result.errors.push(`County ${county.name}: ${error.message}`)
          } else {
            result.counties.updated++
          }
        } catch (err) {
          result.counties.failed++
          result.errors.push(`County ${county.name}: ${err}`)
        }
      }

      // Update fallback data with successful API data
      for (const county of counties) {
        await supabase
          .from('fallback_counties')
          .upsert({
            ...county,
            last_verified: new Date().toISOString()
          }, { onConflict: 'name,state' })
      }
    }

  } catch (error) {
    result.errors.push(`State sync error: ${error}`)
  }

  return result
}

async function logSyncOperation(
  syncType: string,
  state: string | null,
  status: string,
  recordsProcessed: number = 0,
  recordsUpdated: number = 0,
  recordsFailed: number = 0,
  apiCalls: number = 0,
  apiErrors: number = 0,
  errorDetails: any = null,
  executionTime: number = 0,
  dataSource: string = 'mixed'
) {
  await supabase.rpc('log_sync_operation', {
    p_sync_type: syncType,
    p_state: state,
    p_status: status,
    p_records_processed: recordsProcessed,
    p_records_updated: recordsUpdated,
    p_records_failed: recordsFailed,
    p_api_calls: apiCalls,
    p_api_errors: apiErrors,
    p_error_details: errorDetails,
    p_execution_time: executionTime,
    p_data_source: dataSource
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Authenticate the request
    const authHeader = request.headers.get('authorization')
    const providedKey = authHeader?.replace('Bearer ', '')
    
    if (providedKey !== SYNC_AUTH_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting daily data sync...')

    const report: DailySyncReport = {
      syncDate: new Date().toISOString().split('T')[0],
      totalStates: US_STATES.length,
      successfulStates: 0,
      failedStates: 0,
      totalOfficials: 0,
      totalCounties: 0,
      apiCalls: 0,
      apiErrors: 0,
      executionTimeSeconds: 0,
      stateResults: [],
      summary: {
        officialsSources: {},
        countiesSources: {},
        topErrors: []
      }
    }

    // Process each state
    for (const state of US_STATES) {
      console.log(`📊 Syncing data for ${state}...`)
      
      const stateResult = await syncStateData(state)
      report.stateResults.push(stateResult)

      // Update counters
      report.totalOfficials += stateResult.officials.updated
      report.totalCounties += stateResult.counties.updated
      report.apiCalls += 2 // One call each for officials and counties
      report.apiErrors += stateResult.errors.length

      // Track data sources
      report.summary.officialsSources[stateResult.officials.source] = 
        (report.summary.officialsSources[stateResult.officials.source] || 0) + 1
      report.summary.countiesSources[stateResult.counties.source] = 
        (report.summary.countiesSources[stateResult.counties.source] || 0) + 1

      if (stateResult.errors.length === 0) {
        report.successfulStates++
      } else {
        report.failedStates++
        report.summary.topErrors.push(...stateResult.errors.slice(0, 3))
      }

      // Log individual state sync
      await logSyncOperation(
        'state_sync',
        state,
        stateResult.errors.length === 0 ? 'success' : 'partial',
        stateResult.officials.processed + stateResult.counties.processed,
        stateResult.officials.updated + stateResult.counties.updated,
        stateResult.officials.failed + stateResult.counties.failed,
        2,
        stateResult.errors.length,
        stateResult.errors.length > 0 ? { errors: stateResult.errors } : null,
        0,
        'mixed'
      )

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const executionTime = Math.round((Date.now() - startTime) / 1000)
    report.executionTimeSeconds = executionTime

    // Log overall sync operation
    await logSyncOperation(
      'daily_full_sync',
      null,
      report.failedStates === 0 ? 'success' : 'partial',
      report.totalOfficials + report.totalCounties,
      report.totalOfficials + report.totalCounties,
      report.apiErrors,
      report.apiCalls,
      report.apiErrors,
      report.summary.topErrors.length > 0 ? { topErrors: report.summary.topErrors.slice(0, 10) } : null,
      executionTime,
      'mixed'
    )

    console.log('✅ Daily sync completed:', {
      states: `${report.successfulStates}/${report.totalStates}`,
      officials: report.totalOfficials,
      counties: report.totalCounties,
      time: `${executionTime}s`
    })

    return NextResponse.json({
      success: true,
      message: 'Daily sync completed',
      report
    })

  } catch (error) {
    const executionTime = Math.round((Date.now() - startTime) / 1000)
    
    await logSyncOperation(
      'daily_full_sync',
      null,
      'failed',
      0,
      0,
      1,
      0,
      1,
      { error: String(error) },
      executionTime,
      'none'
    )

    console.error('❌ Daily sync failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Daily sync failed',
      details: String(error)
    }, { status: 500 })
  }
} 