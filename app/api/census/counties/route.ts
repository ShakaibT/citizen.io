import { NextResponse } from 'next/server';
import { getCountiesByState, getCountiesGeoJSON, getStateByIdentifier } from '@/lib/census-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateParam = searchParams.get('state');
    const format = searchParams.get('format');
    
    if (!stateParam) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      );
    }
    
    // Get state info to convert name/abbreviation to FIPS code
    const state = await getStateByIdentifier(stateParam);
    if (!state) {
      return NextResponse.json(
        { error: 'State not found' },
        { status: 404 }
      );
    }
    
    if (format === 'geojson') {
      // Return GeoJSON format for mapping
      const geoData = await getCountiesGeoJSON(state.fips);
      return NextResponse.json(geoData);
    } else {
      // Return simple array format
      const counties = await getCountiesByState(state.fips);
      return NextResponse.json(counties);
    }
  } catch (error) {
    console.error('Error in census counties API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counties data' },
      { status: 500 }
    );
  }
} 