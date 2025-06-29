import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchSenatorsForState } from '../../../../lib/congress-senators-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// List of all 50 states
const ALL_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
  'Wisconsin', 'Wyoming'
]

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.log('❌ Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  console.log('🕐 Starting daily officials update...')
  
  const results = {
    total_states: ALL_STATES.length,
    successful_states: 0,
    failed_states: 0,
    total_senators_updated: 0,
    errors: [] as any[]
  }
  
  // Process each state
  for (const stateName of ALL_STATES) {
    try {
      console.log(`🔄 Processing ${stateName}...`)
      
      // Fetch senators for this state
      const senators = await fetchSenatorsForState(stateName)
      
      if (senators.length === 0) {
        console.log(`⚠️ No senators found for ${stateName}`)
        continue
      }
      
      // Store each senator
      let stateSuccessCount = 0
      for (const senator of senators) {
        try {
          const { data, error } = await supabase.rpc('upsert_official', {
            p_name: senator.name,
            p_office: senator.office,
            p_party: senator.party,
            p_state: senator.state,
            p_level: senator.level,
            p_office_type: senator.office_type,
            p_bioguide_id: senator.bioguide_id,
            p_congress_url: senator.congress_url,
            p_source: 'congress_api'
          })
          
          if (error) {
            console.error(`❌ Error storing ${senator.name} (${stateName}):`, error)
            results.errors.push({
              state: stateName,
              senator: senator.name,
              error: error.message
            })
          } else {
            stateSuccessCount++
            console.log(`✅ Stored ${senator.name} (${stateName})`)
          }
        } catch (err) {
          console.error(`❌ Exception storing ${senator.name} (${stateName}):`, err)
          results.errors.push({
            state: stateName,
            senator: senator.name,
            error: String(err)
          })
        }
      }
      
      if (stateSuccessCount > 0) {
        results.successful_states++
        results.total_senators_updated += stateSuccessCount
        console.log(`✅ ${stateName}: ${stateSuccessCount} senators updated`)
      } else {
        results.failed_states++
        console.log(`❌ ${stateName}: Failed to update any senators`)
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${stateName}:`, error)
      results.failed_states++
      results.errors.push({
        state: stateName,
        error: String(error)
      })
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Log final results
  console.log('📊 Daily update completed:')
  console.log(`   ✅ Successful states: ${results.successful_states}`)
  console.log(`   ❌ Failed states: ${results.failed_states}`)
  console.log(`   👥 Total senators updated: ${results.total_senators_updated}`)
  console.log(`   🚨 Total errors: ${results.errors.length}`)
  
  // Update the last_run timestamp
  try {
    await supabase
      .from('system_status')
      .upsert({
        key: 'last_officials_update',
        value: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('❌ Error updating system status:', error)
  }
  
  return NextResponse.json({
    success: true,
    message: 'Daily officials update completed',
    results
  })
}

// Allow manual triggering via POST
export async function POST(request: NextRequest) {
  console.log('🔄 Manual trigger of daily officials update')
  return GET(request)
} 