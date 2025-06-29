import { NextResponse } from 'next/server'
import { initializeCountyData } from '@/lib/counties-api'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')

    if (!state) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Initializing county data for ${state}...`)
    
    await initializeCountyData(state)
    
    return NextResponse.json({
      success: true,
      message: `Successfully initialized county data for ${state}`
    })

  } catch (error) {
    console.error('❌ Error in county initialization API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize county data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { state } = await request.json()

    if (!state) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 POST: Initializing county data for ${state}...`)
    
    await initializeCountyData(state)
    
    return NextResponse.json({
      success: true,
      message: `Successfully initialized county data for ${state}`
    })

  } catch (error) {
    console.error('❌ Error in county initialization POST API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize county data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 