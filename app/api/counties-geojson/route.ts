import { NextResponse } from "next/server"
import { getCountiesGeoJSON, getStateByIdentifier } from "@/lib/census-api"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stateParam = searchParams.get('state')

    if (!stateParam) {
      return NextResponse.json({ 
        error: 'Missing state parameter',
        details: 'Please provide a state parameter in the URL'
      }, { status: 400 })
    }

    // Get state info to convert name/abbreviation to FIPS code
    const state = await getStateByIdentifier(stateParam)
    if (!state) {
      return NextResponse.json({ 
        error: 'State not found',
        details: `No state found with identifier: ${stateParam}`
      }, { status: 404 })
    }

    // Get counties GeoJSON data from Census API
    const geoJSON = await getCountiesGeoJSON(state.fips)

    if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
      return NextResponse.json({ 
        error: 'No counties found',
        details: `No counties found for state: ${stateParam}`
      }, { status: 404 })
    }

    return NextResponse.json(geoJSON)
  } catch (error) {
    console.error('Error in counties-geojson route:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
