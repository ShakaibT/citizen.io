import { NextResponse } from 'next/server';
import { getAllStates, getAllStatesWithCounties, getStatesGeoJSON } from '@/lib/census-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const includeCounties = searchParams.get('includeCounties') === 'true';
    
    if (format === 'geojson') {
      // Return GeoJSON format for mapping
      const geoData = await getStatesGeoJSON();
      return NextResponse.json(geoData);
    } else {
      // Return simple array format
      const states = includeCounties ? await getAllStatesWithCounties() : await getAllStates();
      return NextResponse.json(states);
    }
  } catch (error) {
    console.error('Error in census states API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch states data' },
      { status: 500 }
    );
  }
} 