import { NextResponse } from "next/server"
import { getAllStates } from "@/lib/census-api"

// Simple in-memory cache
let cachedResponse: { 
  data: any; 
  timestamp: number; 
} | null = null

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes for live data

// Fallback static GeoJSON data for US states with updated 2023 population data
const FALLBACK_STATES_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "California", fips: "06", population: 38965193 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-124.409591, 32.534156],
          [-124.409591, 42.009518],
          [-114.131211, 42.009518],
          [-114.131211, 32.534156],
          [-124.409591, 32.534156]
        ]]
      }
    },
    {
      type: "Feature", 
      properties: { name: "Texas", fips: "48", population: 30976754 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-106.645646, 25.837377],
          [-106.645646, 36.500704],
          [-93.508292, 36.500704],
          [-93.508292, 25.837377],
          [-106.645646, 25.837377]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Florida", fips: "12", population: 23244842 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-87.634896, 24.523096],
          [-87.634896, 31.000888],
          [-80.031362, 31.000888],
          [-80.031362, 24.523096],
          [-87.634896, 24.523096]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "New York", fips: "36", population: 19571216 },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-79.762152, 40.496103],
          [-79.762152, 45.015865],
          [-71.856214, 45.015865],
          [-71.856214, 40.496103],
          [-79.762152, 40.496103]
        ]]
      }
    }
  ]
}

export async function GET(request: Request) {
  try {
    // Force refresh of cache for live data
    cachedResponse = null
    
    // Get live Census population data
    const statesData = await getAllStates()
    const statePopMap = new Map(statesData.map(s => [s.name, s]))

    // Try to fetch from external source
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
      
      const response = await fetch(
        'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const geoJSON = await response.json()
        
        if (geoJSON && geoJSON.features && Array.isArray(geoJSON.features) && geoJSON.features.length > 0) {
          console.log('Successfully fetched external GeoJSON data')
          
          // Filter out territories if needed and enhance with live Census data
          const filteredFeatures = geoJSON.features
            .filter((feature: any) => {
              const name = feature.properties?.NAME || feature.properties?.name
              // Include all US states, DC, and territories for accurate population count
              return true // Don't filter out any territories
            })
            .map((feature: any) => {
              const stateName = feature.properties?.NAME || feature.properties?.name || 'Unknown'
              const stateData = statePopMap.get(stateName)
              
              // Calculate population density (rough estimate based on bounding box)
              let density = 0
              if (stateData?.population && feature.geometry) {
                const bounds = getBoundingBox(feature.geometry)
                const area = (bounds.maxLat - bounds.minLat) * (bounds.maxLng - bounds.minLng)
                density = Math.round(stateData.population / (area * 69 * 69)) // Convert to people per sq mile (rough)
              }
              
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  name: stateName,
                  fips: stateData?.fips || feature.properties?.FIPS || feature.properties?.fips || '',
                  population: stateData?.population || 0,
                  density: density,
                  abbreviation: stateData?.abbreviation || ''
                }
              }
            })

          const optimizedGeoJSON = {
            type: 'FeatureCollection',
            features: filteredFeatures
          }
          
          // Cache the response
          const now = Date.now()
          cachedResponse = {
            data: optimizedGeoJSON,
            timestamp: now
          }
          
          return NextResponse.json(optimizedGeoJSON, {
            headers: {
              'Cache-Control': 'public, max-age=1800',
              'Content-Type': 'application/json',
              'X-Cache': 'MISS'
            }
          })
        }
      }
      
      throw new Error('Invalid response from external source')
    } catch (fetchError) {
      console.warn('External source failed, using fallback data with live Census data:', fetchError)
      
      // Enhance fallback data with live Census data
      const enhancedFallback = {
        ...FALLBACK_STATES_GEOJSON,
        features: FALLBACK_STATES_GEOJSON.features.map(feature => {
          const stateData = statePopMap.get(feature.properties.name)
          return {
            ...feature,
            properties: {
              ...feature.properties,
              population: stateData?.population || feature.properties.population,
              fips: stateData?.fips || feature.properties.fips,
              abbreviation: stateData?.abbreviation || ''
            }
          }
        })
      }
      
      // Cache the response
      const now = Date.now()
      cachedResponse = {
        data: enhancedFallback,
        timestamp: now
      }
      
      return NextResponse.json(enhancedFallback, {
        headers: {
          'Cache-Control': 'public, max-age=300', // Shorter cache for fallback
          'Content-Type': 'application/json',
          'X-Cache': 'FALLBACK'
        }
      })
    }
  } catch (error) {
    console.error('Error in states-geojson route:', error)
    
    // Return cached data if available
    if (cachedResponse) {
      return NextResponse.json(cachedResponse.data, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json',
          'X-Cache': 'STALE-ERROR'
        }
      })
    }
    
    // Last resort: return fallback data
    return NextResponse.json(FALLBACK_STATES_GEOJSON, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    })
  }
}

// Helper function to calculate bounding box
function getBoundingBox(geometry: any): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  
  function processCoordinates(coords: any[]) {
    if (typeof coords[0] === 'number') {
      // This is a coordinate pair [lng, lat]
      const [lng, lat] = coords
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    } else {
      // This is an array of coordinates
      coords.forEach(processCoordinates)
    }
  }
  
  if (geometry.coordinates) {
    processCoordinates(geometry.coordinates)
  }
  
  return { minLat, maxLat, minLng, maxLng }
}
