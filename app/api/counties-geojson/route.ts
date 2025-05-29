import { NextResponse } from "next/server"

// Simple cache for counties data
const responseCache = new Map<string, { 
  data: any; 
  timestamp: number; 
}>()

const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
const MAX_CACHE_SIZE = 100

// State name to FIPS code mapping
const STATE_FIPS_MAP: { [key: string]: string } = {
  'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05', 'California': '06',
  'Colorado': '08', 'Connecticut': '09', 'Delaware': '10', 'Florida': '12', 'Georgia': '13',
  'Hawaii': '15', 'Idaho': '16', 'Illinois': '17', 'Indiana': '18', 'Iowa': '19',
  'Kansas': '20', 'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
  'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28', 'Missouri': '29',
  'Montana': '30', 'Nebraska': '31', 'Nevada': '32', 'New Hampshire': '33', 'New Jersey': '34',
  'New Mexico': '35', 'New York': '36', 'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39',
  'Oklahoma': '40', 'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
  'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49', 'Vermont': '50',
  'Virginia': '51', 'Washington': '53', 'West Virginia': '54', 'Wisconsin': '55', 'Wyoming': '56'
}

// Fallback static counties data for major states
const FALLBACK_COUNTIES_DATA: { [key: string]: any } = {
  '48': { // Texas
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Harris', fips: '48201', population: 4731145 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-95.8, 29.5], [-95.8, 30.1], [-95.0, 30.1], [-95.0, 29.5], [-95.8, 29.5]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Dallas', fips: '48113', population: 2613539 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-97.0, 32.5], [-97.0, 33.1], [-96.4, 33.1], [-96.4, 32.5], [-97.0, 32.5]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Tarrant', fips: '48439', population: 2110640 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-97.5, 32.6], [-97.5, 33.0], [-97.0, 33.0], [-97.0, 32.6], [-97.5, 32.6]
          ]]
        }
      }
    ]
  },
  '06': { // California
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Los Angeles', fips: '06037', population: 10014009 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-118.9, 33.7], [-118.9, 34.8], [-117.6, 34.8], [-117.6, 33.7], [-118.9, 33.7]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'San Diego', fips: '06073', population: 3298634 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-117.6, 32.5], [-117.6, 33.5], [-116.1, 33.5], [-116.1, 32.5], [-117.6, 32.5]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Orange', fips: '06059', population: 3186989 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-118.1, 33.4], [-118.1, 33.9], [-117.4, 33.9], [-117.4, 33.4], [-118.1, 33.4]
          ]]
        }
      }
    ]
  },
  '12': { // Florida
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Miami-Dade', fips: '12086', population: 2716940 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-80.9, 25.1], [-80.9, 25.9], [-80.1, 25.9], [-80.1, 25.1], [-80.9, 25.1]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Broward', fips: '12011', population: 1944375 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-80.4, 25.9], [-80.4, 26.4], [-80.0, 26.4], [-80.0, 25.9], [-80.4, 25.9]
          ]]
        }
      }
    ]
  }
}

// Optimized cache cleanup
const cleanupCache = () => {
  if (responseCache.size > MAX_CACHE_SIZE) {
    const now = Date.now()
    const entries = Array.from(responseCache.entries())
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    // Remove oldest 30% of entries
    const toRemove = Math.floor(entries.length * 0.3)
    for (let i = 0; i < toRemove; i++) {
      responseCache.delete(entries[i][0])
    }
    
    console.log(`Cache cleanup: removed ${toRemove} entries, ${responseCache.size} remaining`)
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const { searchParams } = url
    const stateParam = searchParams.get('state')

    if (!stateParam) {
      return NextResponse.json({ 
        error: 'Missing state parameter',
        details: 'Please provide a state parameter in the URL'
      }, { status: 400 })
    }

    // Convert state name to FIPS code if necessary
    let stateFips = stateParam
    if (isNaN(Number(stateParam))) {
      // It's a state name, convert to FIPS
      stateFips = STATE_FIPS_MAP[stateParam]
      if (!stateFips) {
        return NextResponse.json({ 
          error: 'Invalid state parameter',
          details: `State "${stateParam}" not found. Please provide a valid state name or FIPS code.`
        }, { status: 400 })
      }
    } else {
      // Ensure FIPS code is zero-padded
      stateFips = stateParam.padStart(2, '0')
    }

    // Create cache key
    const cacheKey = `counties-${stateFips}`
    
    // Check cache
    const cached = responseCache.get(cacheKey)
    const now = Date.now()
    const isExpired = cached && (now - cached.timestamp) > CACHE_DURATION
    
    // Return cached data if still valid
    if (cached && !isExpired) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      })
    }

    // Try to fetch fresh data
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
      
      const response = await fetch(
        `https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json`,
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const allCountiesGeoJSON = await response.json()
        
        // Filter counties for the specific state
        const stateCounties = allCountiesGeoJSON.features.filter((feature: any) => {
          const countyFips = feature.properties.FIPS || feature.id;
          return countyFips && countyFips.startsWith(stateFips);
        }).map((feature: any) => {
          const countyFips = feature.properties.FIPS || feature.id;
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              name: feature.properties.NAME || 'Unknown County',
              population: 0,
              fips: countyFips
            }
          };
        });

        const geoJSON = {
          type: 'FeatureCollection',
          features: stateCounties
        };

        if (geoJSON.features.length > 0) {
          // Cache the response
          responseCache.set(cacheKey, {
            data: geoJSON,
            timestamp: now
          })

          // Cleanup cache periodically
          cleanupCache()

          console.log(`Successfully fetched ${geoJSON.features.length} counties for state FIPS ${stateFips}`)

          return NextResponse.json(geoJSON, {
            headers: {
              'Cache-Control': 'public, max-age=3600',
              'Content-Type': 'application/json',
              'X-Cache': 'MISS'
            }
          })
        }
      }
      
      throw new Error('Failed to fetch or no counties found')
    } catch (fetchError) {
      console.warn(`External source failed for state ${stateFips}, using fallback:`, fetchError)
      
      // Use fallback data
      const fallbackData = FALLBACK_COUNTIES_DATA[stateFips] || {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Main County', fips: `${stateFips}001`, population: 100000 },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-100, 40], [-100, 41], [-99, 41], [-99, 40], [-100, 40]
              ]]
            }
          }
        ]
      }
      
      // Cache the fallback response
      responseCache.set(cacheKey, {
        data: fallbackData,
        timestamp: now
      })

      console.log(`Using fallback data for state FIPS ${stateFips}`)
      
      return NextResponse.json(fallbackData, {
        headers: {
          'Cache-Control': 'public, max-age=300', // Shorter cache for fallback
          'Content-Type': 'application/json',
          'X-Cache': 'FALLBACK'
        }
      })
    }
  } catch (error) {
    console.error('Error in counties-geojson route:', error)
    
    // Try to return stale data if available
    const url = new URL(request.url)
    const stateParam = url.searchParams.get('state')
    if (stateParam) {
      let stateFips = stateParam
      if (isNaN(Number(stateParam))) {
        stateFips = STATE_FIPS_MAP[stateParam] || stateParam
      } else {
        stateFips = stateParam.padStart(2, '0')
      }
      
      const cacheKey = `counties-${stateFips}`
      const cached = responseCache.get(cacheKey)
      
      if (cached) {
        return NextResponse.json(cached.data, {
          headers: {
            'Cache-Control': 'public, max-age=300',
            'Content-Type': 'application/json',
            'X-Cache': 'STALE-ERROR'
          }
        })
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
  }
}
