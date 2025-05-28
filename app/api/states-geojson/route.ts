import { NextResponse } from "next/server"
import { getStatesGeoJSON } from "@/lib/census-api"

export async function GET() {
  try {
    // Use Census API instead of Supabase
    const geoJSON = await getStatesGeoJSON()
    
    if (!geoJSON || !geoJSON.features || geoJSON.features.length === 0) {
      return NextResponse.json({ 
        error: 'No states data available',
        details: 'Unable to fetch states data from Census API'
      }, { status: 404 })
    }

    return NextResponse.json(geoJSON)
  } catch (error) {
    console.error('Error in states-geojson route:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
