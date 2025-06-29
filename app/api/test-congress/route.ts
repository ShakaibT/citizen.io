import { NextRequest, NextResponse } from 'next/server'

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY
const CONGRESS_API_BASE = 'https://api.congress.gov/v3'

export async function GET(request: NextRequest) {
  if (!CONGRESS_API_KEY) {
    return NextResponse.json({ error: 'Congress API key not configured' }, { status: 500 })
  }

  console.log('🔍 Testing Congress API for PA senators...')

  // Test the known PA senator bioguide IDs
  const paSenatorIds = [
    'M001243', // Dave McCormick
    'F000482'  // John Fetterman
  ]

  const results = []

  for (const bioguideId of paSenatorIds) {
    try {
      console.log(`🔄 Testing bioguide ID: ${bioguideId}`)
      
      const response = await fetch(
        `${CONGRESS_API_BASE}/member/${bioguideId}?api_key=${CONGRESS_API_KEY}`
      )
      
      console.log(`📊 Response status for ${bioguideId}: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`📋 Raw data for ${bioguideId}:`, JSON.stringify(data, null, 2))
        
        results.push({
          bioguideId,
          status: response.status,
          data: data
        })
      } else {
        const errorText = await response.text()
        console.log(`❌ Error for ${bioguideId}: ${response.status} - ${errorText}`)
        
        results.push({
          bioguideId,
          status: response.status,
          error: errorText
        })
      }
    } catch (error) {
      console.log(`❌ Exception for ${bioguideId}:`, error)
      results.push({
        bioguideId,
        error: String(error)
      })
    }
  }

  // Also test the general member endpoint
  try {
    console.log('🔄 Testing general member endpoint...')
    const response = await fetch(
      `${CONGRESS_API_BASE}/member?state=PA&api_key=${CONGRESS_API_KEY}&limit=10`
    )
    
    if (response.ok) {
      const data = await response.json()
      console.log('📋 General member endpoint data:', JSON.stringify(data, null, 2))
      
      results.push({
        endpoint: 'general_member',
        status: response.status,
        data: data
      })
    } else {
      const errorText = await response.text()
      console.log(`❌ General member endpoint error: ${response.status} - ${errorText}`)
      
      results.push({
        endpoint: 'general_member',
        status: response.status,
        error: errorText
      })
    }
  } catch (error) {
    console.log('❌ General member endpoint exception:', error)
    results.push({
      endpoint: 'general_member',
      error: String(error)
    })
  }

  return NextResponse.json({
    message: 'Congress API test completed',
    results
  })
} 