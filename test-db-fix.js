// Simple test script to verify database functions
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDatabaseFunctions() {
  console.log('🧪 Testing database functions...')
  
  try {
    // Test upsert_county function
    console.log('📍 Testing upsert_county function...')
    const { data: countyData, error: countyError } = await supabase.rpc('upsert_county', {
      p_name: 'Test County',
      p_state: 'Test State',
      p_state_fips: '99',
      p_county_fips: '999',
      p_full_fips: '99999',
      p_population: 100000,
      p_land_area: 500.5,
      p_water_area: 10.2
    })

    if (countyError) {
      console.error('❌ County function error:', countyError)
    } else {
      console.log('✅ County function works! Returned ID:', countyData)
    }

    // Test upsert_official function
    console.log('👤 Testing upsert_official function...')
    const { data: officialData, error: officialError } = await supabase.rpc('upsert_official', {
      p_name: 'Test Official',
      p_office: 'Test Office',
      p_party: 'Test Party',
      p_state: 'Test State',
      p_level: 'federal',
      p_office_type: 'legislative',
      p_bioguide_id: 'T000001',
      p_district: '1',
      p_source: 'test'
    })

    if (officialError) {
      console.error('❌ Official function error:', officialError)
    } else {
      console.log('✅ Official function works! Returned ID:', officialData)
    }

    // Clean up test data
    console.log('🧹 Cleaning up test data...')
    await supabase.from('counties').delete().eq('name', 'Test County')
    await supabase.from('officials').delete().eq('name', 'Test Official')
    
    console.log('✅ Database functions test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDatabaseFunctions() 