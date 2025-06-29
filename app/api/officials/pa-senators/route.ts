import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchSenatorsForState } from '../../../../lib/congress-senators-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching Pennsylvania senators...')
    
    // Fetch senators from Congress API
    const senators = await fetchSenatorsForState('Pennsylvania')
    
    if (senators.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No senators found from Congress API',
        senators: []
      })
    }
    
    console.log(`✅ Found ${senators.length} senators from Congress API`)
    
    // Store senators in database
    const storedSenators = []
    const errors = []
    
    for (const senator of senators) {
      try {
        console.log(`💾 Storing senator: ${senator.name}`)
        
        // Use upsert to insert or update
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
          console.error(`❌ Error storing ${senator.name}:`, error)
          errors.push({ senator: senator.name, error: error.message })
        } else {
          console.log(`✅ Successfully stored ${senator.name}`)
          storedSenators.push({ ...senator, id: data })
        }
      } catch (err) {
        console.error(`❌ Exception storing ${senator.name}:`, err)
        errors.push({ senator: senator.name, error: String(err) })
      }
    }
    
    // Verify by querying the database
    const { data: dbSenators, error: queryError } = await supabase
      .from('officials')
      .select('*')
      .eq('state', 'PA')
      .eq('office', 'U.S. Senator')
      .order('name')
    
    if (queryError) {
      console.error('❌ Error querying stored senators:', queryError)
    } else {
      console.log(`📊 Database now contains ${dbSenators?.length || 0} PA senators`)
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${senators.length} senators`,
      senators: storedSenators,
      errors: errors,
      database_senators: dbSenators || []
    })
    
  } catch (error) {
    console.error('❌ Error in PA senators endpoint:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { force_refresh } = await request.json()
    
    console.log('🔄 POST: Forcing refresh of Pennsylvania senators...')
    
    if (force_refresh) {
      // Delete existing PA senators first
      const { error: deleteError } = await supabase
        .from('officials')
        .delete()
        .eq('state', 'PA')
        .eq('office', 'U.S. Senator')
      
      if (deleteError) {
        console.error('❌ Error deleting existing senators:', deleteError)
      } else {
        console.log('🗑️ Deleted existing PA senators')
      }
    }
    
    // Now fetch and store fresh data
    return GET(request)
    
  } catch (error) {
    console.error('❌ Error in PA senators POST:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
} 