import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
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
    
    console.log('🧹 Starting Pennsylvania senators database cleanup...')
    
    // Remove Bob Casey Jr. (no longer a senator as of 2025)
    const { error: caseyError, count: caseyCount } = await supabase
      .from('officials')
      .delete()
      .eq('bioguide_id', 'C001070')
      .eq('name', 'Bob Casey Jr.')
      .eq('state', 'PA')
    
    if (caseyError) {
      console.error('❌ Error removing Bob Casey Jr.:', caseyError)
    } else {
      console.log(`✅ Removed Bob Casey Jr. (${caseyCount} records)`)
    }
    
    // Remove duplicate John Fetterman entry with incorrect bioguide_id
    const { error: fettermanError, count: fettermanCount } = await supabase
      .from('officials')
      .delete()
      .eq('bioguide_id', 'F000479')
      .eq('name', 'John Fetterman')
      .eq('state', 'PA')
    
    if (fettermanError) {
      console.error('❌ Error removing duplicate Fetterman:', fettermanError)
    } else {
      console.log(`✅ Removed duplicate John Fetterman (${fettermanCount} records)`)
    }
    
    // Verify the remaining Pennsylvania senators
    const { data: remainingSenators, error: queryError } = await supabase
      .from('officials')
      .select('name, office, party, bioguide_id, created_at, last_updated')
      .eq('state', 'PA')
      .eq('office', 'U.S. Senator')
      .order('name')
    
    if (queryError) {
      console.error('❌ Error querying remaining senators:', queryError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to query remaining senators',
        details: queryError
      }, { status: 500 })
    }
    
    console.log('✅ Cleanup completed successfully')
    console.log('📊 Remaining Pennsylvania senators:', remainingSenators)
    
    return NextResponse.json({
      success: true,
      message: 'Pennsylvania senators database cleanup completed',
      removed: {
        bobCasey: caseyCount || 0,
        duplicateFetterman: fettermanCount || 0
      },
      remainingSenators: remainingSenators || [],
      errors: [
        ...(caseyError ? [`Bob Casey removal: ${caseyError.message}`] : []),
        ...(fettermanError ? [`Fetterman duplicate removal: ${fettermanError.message}`] : [])
      ]
    })
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Database cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 