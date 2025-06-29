import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database schema and functions...')

    // Test 1: Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['officials', 'counties', 'fallback_officials', 'fallback_counties', 'data_sync_logs'])

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to check tables',
        details: tablesError.message
      }, { status: 500 })
    }

    console.log('✅ Tables found:', tables?.map(t => t.table_name))

    // Test 2: Check if functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .in('routine_name', ['upsert_official', 'upsert_county', 'get_officials_with_fallback', 'get_counties_with_fallback', 'log_sync_operation'])

    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError)
    } else {
      console.log('✅ Functions found:', functions?.map(f => f.routine_name))
    }

    // Test 3: Count records in each table
    const counts: Record<string, number | string> = {}
    
    for (const table of ['officials', 'counties', 'fallback_officials', 'fallback_counties', 'data_sync_logs']) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.error(`❌ Error counting ${table}:`, error)
          counts[table] = `Error: ${error.message}`
        } else {
          counts[table] = count || 0
          console.log(`✅ ${table}: ${count} records`)
        }
      } catch (err) {
        console.error(`❌ Exception counting ${table}:`, err)
        counts[table] = `Exception: ${err}`
      }
    }

    // Test 4: Test get_officials_with_fallback function
    let officialsTest = null
    try {
      const { data: officials, error: officialsError } = await supabase
        .rpc('get_officials_with_fallback', { state_name: 'Pennsylvania' })

      if (officialsError) {
        console.error('❌ Error testing get_officials_with_fallback:', officialsError)
        officialsTest = `Error: ${officialsError.message}`
      } else {
        officialsTest = `Success: ${officials?.length || 0} officials found`
        console.log('✅ get_officials_with_fallback test passed:', officials?.length)
      }
    } catch (err) {
      console.error('❌ Exception testing get_officials_with_fallback:', err)
      officialsTest = `Exception: ${err}`
    }

    // Test 5: Test get_counties_with_fallback function
    let countiesTest = null
    try {
      const { data: counties, error: countiesError } = await supabase
        .rpc('get_counties_with_fallback', { state_name: 'Pennsylvania' })

      if (countiesError) {
        console.error('❌ Error testing get_counties_with_fallback:', countiesError)
        countiesTest = `Error: ${countiesError.message}`
      } else {
        countiesTest = `Success: ${counties?.length || 0} counties found`
        console.log('✅ get_counties_with_fallback test passed:', counties?.length)
      }
    } catch (err) {
      console.error('❌ Exception testing get_counties_with_fallback:', err)
      countiesTest = `Exception: ${err}`
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema test completed',
      results: {
        tables: tables?.map(t => t.table_name) || [],
        functions: functions?.map(f => f.routine_name) || [],
        record_counts: counts,
        function_tests: {
          get_officials_with_fallback: officialsTest,
          get_counties_with_fallback: countiesTest
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in database test:', error)
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: String(error)
    }, { status: 500 })
  }
} 