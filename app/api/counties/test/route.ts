import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase not configured',
        message: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔍 Testing counties table schema...')
    
    // Test if counties table exists and check its structure
    const { data: counties, error: countiesError } = await supabase
      .from('counties')
      .select('*')
      .limit(1)
    
    console.log('Counties table test result:', { counties: counties?.length, countiesError })
    
    // Try to get basic columns first
    const { data: basicColumns, error: basicError } = await supabase
      .from('counties')
      .select('id, name')
      .limit(1)
    
    console.log('Basic columns test:', { basicColumns, basicError })
    
    // Try different column combinations to see what exists
    const columnTests = [
      'id, name, state',
      'id, name, state_name', 
      'id, name, state_abbr',
      'id, name, fips',
      'id, name, population'
    ]
    
    const columnResults: any = {}
    
    for (const columns of columnTests) {
      const { data, error } = await supabase
        .from('counties')
        .select(columns)
        .limit(1)
      
      columnResults[columns] = error ? `Error: ${error.message}` : 'OK'
    }
    
    // Test if officials table exists and has data for Pennsylvania
    const { data: paOfficials, error: paOfficialsError } = await supabase
      .from('officials')
      .select('*')
      .ilike('state', 'Pennsylvania')
      .limit(5)
    
    console.log('PA Officials (case insensitive) test result:', { officials: paOfficials?.length, paOfficialsError })
    
    // Test all officials
    const { data: allOfficials, error: allOfficialsError } = await supabase
      .from('officials')
      .select('name, state, office, party')
      .limit(10)
    
    console.log('All Officials table test result:', { officials: allOfficials?.length, allOfficialsError })
    
    // Test if county_representatives table exists
    const { data: countyReps, error: countyRepsError } = await supabase
      .from('county_representatives')
      .select('*')
      .limit(1)
    
    console.log('County representatives table test result:', { countyReps: countyReps?.length, countyRepsError })
    
    return NextResponse.json({
      success: true,
      tables: {
        counties: countiesError ? `Error: ${countiesError.message}` : `OK (${counties?.length || 0} records)`,
        basicColumns: basicError ? `Error: ${basicError.message}` : `OK - basic columns accessible`,
        paOfficials: paOfficialsError ? `Error: ${paOfficialsError.message}` : `OK (${paOfficials?.length || 0} records)`,
        allOfficials: allOfficialsError ? `Error: ${allOfficialsError.message}` : `OK (${allOfficials?.length || 0} records)`,
        county_representatives: countyRepsError ? `Error: ${countyRepsError.message}` : `OK (${countyReps?.length || 0} records)`
      },
      columnTests: columnResults,
      sampleCounty: basicColumns?.[0] || null,
      samplePAOfficials: paOfficials?.map(o => ({ name: o.name, office: o.office, party: o.party })) || [],
      sampleAllOfficials: allOfficials || []
    })
  } catch (error) {
    console.error('Error in counties test:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 