import { NextResponse } from 'next/server'
import { getOfficialsByState } from '@/lib/officials-api'

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

    const result = await getOfficialsByState(state)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in officials API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch officials data' },
      { status: 500 }
    )
  }
} 