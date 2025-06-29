import { NextResponse } from 'next/server'
import { getOfficialsByState } from '@/lib/officials-api'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const state = url.searchParams.get('state') || 'Colorado'
    
    console.log(`🔄 Testing officials API for state: ${state}`)
    
    try {
      // Test the officials API
      const officials = await getOfficialsByState(state)
      
      return NextResponse.json({
        state_tested: state,
        success: true,
        officials_count: officials.officials.length,
        officials: officials.officials.slice(0, 5).map(o => ({
          name: o.name,
          office: o.office,
          party: o.party,
          level: o.level
        })),
        source: 'officials_api'
      })
      
    } catch (error) {
      return NextResponse.json({
        state_tested: state,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        officials_count: 0
      })
    }
    
  } catch (error) {
    console.error('Error testing officials API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test officials API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 