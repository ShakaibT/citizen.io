import { NextResponse } from 'next/server'
import { initializeOfficialsTable } from '@/lib/officials-api'

export async function GET(request: Request) {
  try {
    console.log('🔄 Initializing officials table...')
    
    await initializeOfficialsTable()
    
    console.log('✅ Officials table initialization completed')
    
    return NextResponse.json({
      success: true,
      message: 'Officials table initialized successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error initializing officials table:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize officials table',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
} 