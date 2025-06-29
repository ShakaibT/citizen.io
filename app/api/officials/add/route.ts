import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Initialize Supabase client with service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface OfficialInput {
  name: string
  office: string
  party?: string
  phone?: string
  email?: string
  website?: string
  photo_url?: string
  address?: string
  state: string
  district?: string
  level: 'federal' | 'state' | 'local'
  office_type: 'executive' | 'legislative' | 'judicial'
  term_start?: string
  term_end?: string
}

export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { officials, state } = body

    if (!officials || !Array.isArray(officials) || !state) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { officials: Official[], state: string }' },
        { status: 400 }
      )
    }

    // Validate officials data
    const validatedOfficials = officials.map((official: OfficialInput) => ({
      ...official,
      state: state.toUpperCase(),
      last_updated: new Date().toISOString(),
      source: 'manual'
    }))

    // First, delete existing officials for this state
    const { error: deleteError } = await supabase
      .from('officials')
      .delete()
      .eq('state', state.toUpperCase())

    if (deleteError) {
      console.error('Error deleting existing officials:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete existing officials', details: deleteError.message },
        { status: 500 }
      )
    }

    // Then insert new officials
    const { data, error: insertError } = await supabase
      .from('officials')
      .insert(validatedOfficials)
      .select()

    if (insertError) {
      console.error('Error inserting officials:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert officials', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully added ${validatedOfficials.length} officials for ${state}`)

    return NextResponse.json({
      success: true,
      message: `Successfully added ${validatedOfficials.length} officials for ${state}`,
      officials: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in officials add endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to add officials',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to show usage instructions
export async function GET(request: Request) {
  return NextResponse.json({
    message: 'Officials Add Endpoint',
    note: 'Google Civic Representatives API was shut down in April 2025',
    usage: {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_CRON_SECRET_OR_SERVICE_ROLE_KEY',
        'Content-Type': 'application/json'
      },
      body: {
        state: 'Pennsylvania',
        officials: [
          {
            name: 'Josh Shapiro',
            office: 'Governor',
            party: 'Democratic',
            state: 'PA',
            level: 'state',
            office_type: 'executive',
            email: 'governor@pa.gov',
            website: 'https://www.governor.pa.gov'
          }
        ]
      }
    },
    alternatives: [
      'BallotReady API: https://ballotready.org',
      'Ballotpedia API: https://ballotpedia.org', 
      'Cicero API: https://cicerodata.com'
    ]
  })
} 