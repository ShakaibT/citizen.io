import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const county = searchParams.get('county')

    if (!state) {
      return NextResponse.json({
        success: false,
        error: 'State parameter is required'
      }, { status: 400 })
    }

    console.log(`🔍 Counties API called with state: ${state}, county: ${county}`)

    if (county) {
      // Get specific county data
      const { data: countyData, error } = await supabase
        .from('counties')
        .select('*')
        .eq('state', state)
        .eq('name', county)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Database error:', error)
        return NextResponse.json({
          success: false,
          error: 'Database error',
          details: error.message
        }, { status: 500 })
      }

      if (!countyData) {
        return NextResponse.json({
          success: false,
          error: `County ${county} not found in ${state}`
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: countyData,
        source: countyData.data_source || 'live_data'
      })
    }

    // Get all counties for the state using direct table query
    console.log(`🔍 Getting all counties for state: ${state}`)
    
    const { data: counties, error: countiesError } = await supabase
      .from('counties')
      .select('*')
      .eq('state', state)
      .order('name')

    if (countiesError) {
      console.error('Database error:', countiesError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: countiesError.message
      }, { status: 500 })
    }

    if (!counties || counties.length === 0) {
      console.log(`⚠️ No counties found for ${state}, trying to fetch from Census API...`)
      
      // Try to fetch from Census API as fallback
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/census/counties?state=${encodeURIComponent(state)}`)
        if (response.ok) {
          const censusData = await response.json()
          if (Array.isArray(censusData) && censusData.length > 0) {
            // Transform Census data to match our expected format
            const transformedCounties = censusData.map((county: any) => ({
              id: county.fips || `${state}-${county.name}`,
              name: county.name,
              state: county.state || state,
              county_fips: county.fips?.slice(-3) || '001',
              population: county.population || 0,
              data_source: 'census_api',
              representatives: []
            }))

            return NextResponse.json({
              success: true,
              data: transformedCounties,
              counties: transformedCounties,
              count: transformedCounties.length,
              source: 'census_api',
              message: `Found ${transformedCounties.length} counties for ${state} from Census API`
            })
          }
        }
      } catch (censusError) {
        console.warn('Failed to fetch from Census API:', censusError)
      }

      return NextResponse.json({
        success: true,
        data: [],
        counties: [],
        count: 0,
        message: `No counties found for ${state}`,
        source: 'none'
      })
    }

    const dataSource = counties[0]?.data_source || 'database'
    console.log(`✅ Found ${counties.length} counties for ${state} (source: ${dataSource})`)

    // Get federal officials for the state to include in county data
    const { data: officials } = await supabase
      .from('officials')
      .select('*')
      .eq('state', state)
      .in('office', ['U.S. Senator', 'U.S. Representative'])

    const federalOfficials = officials || []

    console.log(`📋 Found ${federalOfficials.length} federal officials for ${state}`)

    // Transform counties data to include representatives
    const transformedCounties = counties.map((county: any) => ({
      id: county.id,
      name: county.name,
      state: county.state,
      county_fips: county.county_fips,
      population: county.population,
      data_source: county.data_source,
      representatives: federalOfficials.map((official: any) => ({
        name: official.name,
        office: official.office,
        party: official.party,
        district: official.district
      }))
    }))

    return NextResponse.json({
      success: true,
      data: transformedCounties,
      counties: transformedCounties,
      count: transformedCounties.length,
      source: dataSource,
      message: `Found ${transformedCounties.length} counties for ${state}`
    })

  } catch (error) {
    console.error('Error in counties API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
} 