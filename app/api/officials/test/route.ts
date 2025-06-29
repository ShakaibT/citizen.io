import { NextResponse } from 'next/server'
import { fetchFederalOfficialsFromCongress } from '@/lib/officials-api'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const state = url.searchParams.get('state') || 'Colorado'
    
    const congressApiKey = process.env.CONGRESS_API_KEY
    
    if (!congressApiKey) {
      return NextResponse.json({
        error: 'Congress API key not configured',
        key_exists: false,
        instructions: 'Please add CONGRESS_API_KEY to your .env.local file. Get a free key at: https://api.congress.gov/sign-up/'
      })
    }
    
    console.log(`🔄 Testing Congress API for state: ${state}`)
    
    try {
      // Test the Congress API
      const officials = await fetchFederalOfficialsFromCongress(state)
      
      return NextResponse.json({
        state_tested: state,
        key_configured: true,
        key_length: congressApiKey.length,
        success: true,
        officials_count: officials.length,
        officials: officials.map(o => ({
          name: o.name,
          office: o.office,
          party: o.party,
          level: o.level
        })),
        source: 'congress_api'
      })
      
    } catch (error) {
      return NextResponse.json({
        state_tested: state,
        key_configured: true,
        key_length: congressApiKey.length,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        officials_count: 0
      })
    }
    
  } catch (error) {
    console.error('Error testing Congress API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test Congress API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 