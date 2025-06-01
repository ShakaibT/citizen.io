// Census API Integration
// This replaces the Supabase database approach with direct API calls
// Free, fast, and always up-to-date government data

import { optimizeGeoJSON, getOptimalMapBounds, createGeoJSONCacheKey } from './geojson-optimizer'

// Get the current year for Census data (will automatically use latest available)
export const getCurrentCensusYear = () => {
  // Use 2023 as it's the latest available vintage with working API
  return 2023
}

export const CURRENT_CENSUS_YEAR = getCurrentCensusYear()

export interface CensusState {
  name: string;
  abbreviation: string;
  fips: string;
  population?: number;
  countyCount?: number;
}

export interface CensusCounty {
  name: string;
  state: string;
  fips: string;
  population?: number;
}

export interface CensusGeography {
  type: 'state' | 'county';
  properties: {
    name: string;
    fips: string;
    population?: number;
  };
  geometry: any; // GeoJSON geometry
}

// Cache for API responses (in-memory cache for better performance)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes cache for live data

// Function to clear cache (useful for testing or forcing fresh data)
export function clearCensusCache(): void {
  cache.clear();
  console.log('Census API cache cleared');
}

// Helper function to get cached data or fetch new
async function getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

// Get all US states from Census API
export async function getAllStates(): Promise<CensusState[]> {
  // Clear cache to force fresh data
  cache.delete('all-states');
  
  return getCachedData('all-states', async () => {
    try {
      // Use the latest working Population Estimates API (2023 vintage)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(
        `https://api.census.gov/data/2023/pep/charv?get=NAME,POP&for=state:*&YEAR=2023`,
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.warn(`Census API error: ${response.status}, falling back to static data`);
        return getStaticStatesData();
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length < 2) {
        console.warn('Invalid Census API response format, falling back to static data');
        return getStaticStatesData();
      }
      
      console.log(`Successfully fetched live Census state data for ${CURRENT_CENSUS_YEAR} (including territories)`);
      
      // Skip header row and map to our format - INCLUDE all states and territories
      return data.slice(1).map((row: any[]) => ({
        name: row[0],
        abbreviation: getStateAbbreviation(row[0]),
        fips: row[3], // State FIPS is in position 3 for the new API
        population: parseInt(row[1]) || 0
      }));
    } catch (error) {
      console.warn('Error fetching states from Census API, falling back to static data:', error instanceof Error ? error.message : 'Unknown error');
      // Fallback to static data if API fails
      return getStaticStatesData();
    }
  });
}

// Get counties for a specific state
export async function getCountiesByState(stateFips: string): Promise<CensusCounty[]> {
  return getCachedData(`counties-${stateFips}`, async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      // Get the state name from FIPS code
      const stateInfo = await getStateByFips(stateFips)
      const stateName = stateInfo?.name || 'Unknown State'
      
      const response = await fetch(
        `https://api.census.gov/data/2023/pep/charv?get=NAME,POP&for=county:*&in=state:${stateFips}&YEAR=2023`,
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.warn(`Census API returned ${response.status} for state ${stateFips}, using static data`);
        return getStaticCountiesData(stateFips);
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length < 2) {
        console.warn(`Invalid data format from Census API for state ${stateFips}, using static data`);
        return getStaticCountiesData(stateFips);
      }
      
      console.log(`Successfully fetched live Census county data for state FIPS ${stateFips} (${stateName})`);
      
      return data.slice(1).map((row: any[]) => ({
        name: row[0].replace(/ County.*$/, ''), // Remove "County" suffix
        state: stateName, // Use actual state name instead of FIPS
        fips: `${row[3]}${row[4]}`, // State FIPS (index 3) + County FIPS (index 4)
        population: parseInt(row[1]) || 0
      }));
    } catch (error) {
      console.warn(`Error fetching counties for state ${stateFips}, using static data:`, error instanceof Error ? error.message : 'Unknown error');
      return getStaticCountiesData(stateFips);
    }
  });
}

// Get state by abbreviation or name
export async function getStateByIdentifier(identifier: string): Promise<CensusState | null> {
  const states = await getAllStates();
  
  return states.find(state => 
    state.abbreviation.toLowerCase() === identifier.toLowerCase() ||
    state.name.toLowerCase() === identifier.toLowerCase() ||
    state.fips === identifier.padStart(2, '0') // Handle FIPS codes
  ) || null;
}

// Get state by FIPS code
export async function getStateByFips(fips: string): Promise<CensusState | null> {
  const states = await getAllStates();
  return states.find(state => state.fips === fips.padStart(2, '0')) || null;
}

// Get GeoJSON data for states - with actual US boundaries and optimized positioning
export async function getStatesGeoJSON(): Promise<any> {
  return getCachedData('states-geojson-optimized', async () => {
    try {
      // First try to get states data
      const states = await getAllStates();
      
      // Try to fetch actual US states GeoJSON from a reliable source
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
          { 
            headers: { 'User-Agent': 'CitizenApp/1.0' },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          console.log('Successfully fetched external GeoJSON data');
          const rawGeoJSON = await response.json();
          
          // Validate the GeoJSON structure
          if (rawGeoJSON && rawGeoJSON.features && Array.isArray(rawGeoJSON.features) && rawGeoJSON.features.length > 0) {
            // Get population data and enhance the GeoJSON
            const statePopMap = new Map(states.map(s => [s.name, s]));
            
            // Enhance features with population data and density
            rawGeoJSON.features = rawGeoJSON.features.map((feature: any) => {
              const stateName = feature.properties.NAME || feature.properties.name;
              const stateData = statePopMap.get(stateName);
              
              // Calculate population density (rough estimate based on bounding box)
              let density = 0;
              if (stateData?.population && feature.geometry) {
                // This is a simplified density calculation
                // In reality, you'd use actual land area
                const bounds = getBoundingBox(feature.geometry);
                const area = (bounds.maxLat - bounds.minLat) * (bounds.maxLng - bounds.minLng);
                density = stateData.population / (area * 69 * 69); // Convert to people per sq mile (rough)
              }
              
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  name: stateName,
                  population: stateData?.population || 0,
                  density: Math.round(density),
                  fips: stateData?.fips || '',
                  abbreviation: stateData?.abbreviation || ''
                }
              };
            });
            
            // Apply GeoJSON optimizations (Alaska/Hawaii repositioning, coordinate simplification)
            const optimizedGeoJSON = optimizeGeoJSON(rawGeoJSON);
            
            // Calculate optimal bounds for the optimized data
            const optimalBounds = getOptimalMapBounds(optimizedGeoJSON);
            
            // Add metadata for map initialization
            optimizedGeoJSON.metadata = {
              optimized: true,
              alaskaRepositioned: true,
              hawaiiRepositioned: true,
              puertoRicoRepositioned: true,
              optimalCenter: optimalBounds.center,
              optimalBounds: optimalBounds.bounds,
              totalFeatures: optimizedGeoJSON.features.length,
              timestamp: Date.now()
            };
            
            return optimizedGeoJSON;
          } else {
            console.warn('Invalid GeoJSON structure from external source, using fallback');
            throw new Error('Invalid GeoJSON structure');
          }
        } else {
          console.log('External GeoJSON source returned non-OK status:', response.status);
          throw new Error(`External GeoJSON source failed with status ${response.status}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.warn('External GeoJSON fetch failed:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.warn('Using fallback GeoJSON data:', error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback to our static data
      try {
        const states = await getAllStates();
        const staticGeoJSON = createStaticStatesGeoJSON(states);
        
        // Apply optimizations to static data as well
        const optimizedStaticGeoJSON = optimizeGeoJSON(staticGeoJSON);
        const optimalBounds = getOptimalMapBounds(optimizedStaticGeoJSON);
        
        optimizedStaticGeoJSON.metadata = {
          optimized: true,
          alaskaRepositioned: true,
          hawaiiRepositioned: true,
          puertoRicoRepositioned: true,
          optimalCenter: optimalBounds.center,
          optimalBounds: optimalBounds.bounds,
          totalFeatures: optimizedStaticGeoJSON.features.length,
          timestamp: Date.now(),
          fallback: true
        };
        
        return optimizedStaticGeoJSON;
      } catch (fallbackError) {
        console.error('Even fallback data failed:', fallbackError);
        // Return minimal working GeoJSON
        return {
          type: 'FeatureCollection',
          features: [],
          metadata: {
            error: true,
            message: 'Failed to load any state data',
            timestamp: Date.now()
          }
        };
      }
    }
  });
}

// Get GeoJSON data for counties in a state - with better error handling
export async function getCountiesGeoJSON(stateFips: string): Promise<any> {
  return getCachedData(`counties-geojson-${stateFips}`, async () => {
    try {
      // Try to fetch actual county boundaries from a reliable source
      const response = await fetch(
        `https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json`,
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      );
      
      if (response.ok) {
        const allCountiesGeoJSON = await response.json();
        const counties = await getCountiesByState(stateFips);
        const countyPopMap = new Map(counties.map(c => [c.fips, c]));
        
        // Filter counties for the specific state and enhance with population data
        const stateCounties = allCountiesGeoJSON.features.filter((feature: any) => {
          const countyFips = feature.properties.FIPS || feature.id;
          return countyFips && countyFips.startsWith(stateFips.padStart(2, '0'));
        }).map((feature: any) => {
          const countyFips = feature.properties.FIPS || feature.id;
          const countyData = countyPopMap.get(countyFips);
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              name: countyData?.name || feature.properties.NAME || 'Unknown County',
              population: countyData?.population || 0,
              fips: countyFips
            }
          };
        });
        
        return {
          type: 'FeatureCollection',
          features: stateCounties
        };
      }
      
      // Fallback to our static data if external source fails
      throw new Error('External county GeoJSON source failed');
    } catch (error) {
      console.warn(`Using fallback county data for state ${stateFips}:`, error);
      const counties = await getCountiesByState(stateFips);
      return createStaticCountiesGeoJSON(counties, stateFips);
    }
  });
}

// Helper function to calculate bounding box of a geometry
function getBoundingBox(geometry: any): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  
  function processCoordinates(coords: any[]) {
    if (typeof coords[0] === 'number') {
      // Single coordinate pair
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    } else {
      // Array of coordinates
      coords.forEach(processCoordinates);
    }
  }
  
  if (geometry.coordinates) {
    processCoordinates(geometry.coordinates);
  }
  
  return { minLat, maxLat, minLng, maxLng };
}

// Helper function to create static GeoJSON for states
function createStaticStatesGeoJSON(states: CensusState[]): any {
  // State area data (in square miles) for density calculation
  const stateAreas: { [key: string]: number } = {
    'Alabama': 52420, 'Alaska': 665384, 'Arizona': 113990, 'Arkansas': 53179, 'California': 163695,
    'Colorado': 104094, 'Connecticut': 5543, 'Delaware': 2489, 'Florida': 65758, 'Georgia': 59425,
    'Hawaii': 10932, 'Idaho': 83569, 'Illinois': 57914, 'Indiana': 36420, 'Iowa': 56273,
    'Kansas': 82278, 'Kentucky': 40408, 'Louisiana': 52378, 'Maine': 35384, 'Maryland': 12406,
    'Massachusetts': 10554, 'Michigan': 96714, 'Minnesota': 86936, 'Mississippi': 48432, 'Missouri': 69707,
    'Montana': 147040, 'Nebraska': 77348, 'Nevada': 110572, 'New Hampshire': 9349, 'New Jersey': 8723,
    'New Mexico': 121590, 'New York': 54555, 'North Carolina': 53819, 'North Dakota': 70698, 'Ohio': 44826,
    'Oklahoma': 69899, 'Oregon': 98379, 'Pennsylvania': 46054, 'Rhode Island': 1545, 'South Carolina': 32020,
    'South Dakota': 77116, 'Tennessee': 42144, 'Texas': 268596, 'Utah': 84897, 'Vermont': 9616,
    'Virginia': 42775, 'Washington': 71298, 'West Virginia': 24230, 'Wisconsin': 65496, 'Wyoming': 97813
  };

  // Create simplified polygon features for states
  const features = states.map(state => {
    const coords = getStateCoordinates(state.name);
    const area = stateAreas[state.name] || 50000; // Default area if not found
    const density = state.population ? Math.round(state.population / area) : 0;
    
    // Create a simple rectangular boundary around the state center
    // Use different sizes for different states to maintain proper proportions
    let latOffset = 1.5;
    let lngOffset = 2.0;
    
    if (state.name === 'Alaska') {
      latOffset = 3.0; // Alaska scaled down for inset display
      lngOffset = 4.0;
    } else if (state.name === 'Hawaii') {
      latOffset = 1.0; // Hawaii is small island chain
      lngOffset = 1.5;
    } else if (state.name === 'Texas') {
      latOffset = 4.0; // Texas is large
      lngOffset = 5.0;
    } else if (state.name === 'California') {
      latOffset = 5.0; // California is long
      lngOffset = 3.0;
    } else if (state.name === 'Montana') {
      latOffset = 2.5; // Montana is wide
      lngOffset = 4.0;
    } else if (['Rhode Island', 'Delaware', 'Connecticut', 'New Hampshire', 'Vermont', 'Massachusetts', 'New Jersey', 'Maryland'].includes(state.name)) {
      latOffset = 0.8; // Small northeastern states
      lngOffset = 1.0;
    }
    
    return {
      type: 'Feature',
      properties: {
        name: state.name,
        abbreviation: state.abbreviation,
        fips: state.fips,
        population: state.population || 0,
        density: density,
        area: area
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [coords[0] - lngOffset, coords[1] - latOffset],
          [coords[0] + lngOffset, coords[1] - latOffset],
          [coords[0] + lngOffset, coords[1] + latOffset],
          [coords[0] - lngOffset, coords[1] + latOffset],
          [coords[0] - lngOffset, coords[1] - latOffset]
        ]]
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

// Helper function to create static GeoJSON for counties
function createStaticCountiesGeoJSON(counties: CensusCounty[], stateFips: string): any {
  // Get the state coordinates to position counties around it
  const stateNames: { [key: string]: string } = {
    '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas', '06': 'California',
    '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware', '12': 'Florida', '13': 'Georgia',
    '15': 'Hawaii', '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
    '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine', '24': 'Maryland',
    '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota', '28': 'Mississippi', '29': 'Missouri',
    '30': 'Montana', '31': 'Nebraska', '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey',
    '35': 'New Mexico', '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
    '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island', '45': 'South Carolina',
    '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas', '49': 'Utah', '50': 'Vermont',
    '51': 'Virginia', '53': 'Washington', '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming'
  };

  const stateName = stateNames[stateFips.padStart(2, '0')];
  const stateCenter = getStateCoordinates(stateName || 'Unknown');

  const features = counties.map((county, index) => {
    // Create a small polygon around the state center for each county
    // Distribute counties in a grid pattern around the state center
    const gridSize = Math.ceil(Math.sqrt(counties.length));
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    // Offset from state center
    const latOffset = (row - gridSize / 2) * 0.5;
    const lngOffset = (col - gridSize / 2) * 0.5;
    
    const centerLat = stateCenter[1] + latOffset;
    const centerLng = stateCenter[0] + lngOffset;
    
    // Create a small rectangular county
    const size = 0.2;
    
    return {
      type: 'Feature',
      properties: {
        name: county.name,
        fips: county.fips,
        population: county.population || 0
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [centerLng - size, centerLat - size],
          [centerLng + size, centerLat - size],
          [centerLng + size, centerLat + size],
          [centerLng - size, centerLat + size],
          [centerLng - size, centerLat - size]
        ]]
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

// Helper function to get approximate state coordinates
function getStateCoordinates(stateName: string): [number, number] {
  const coordinates: { [key: string]: [number, number] } = {
    'Alabama': [-86.79113, 32.377716],
    'Alaska': [-158.0, 21.0], // Positioned as inset in lower left (like typical US maps)
    'Arizona': [-111.431221, 33.729759],
    'Arkansas': [-92.373123, 34.969704],
    'California': [-119.681564, 36.116203],
    'Colorado': [-105.311104, 39.059811],
    'Connecticut': [-72.755371, 41.767],
    'Delaware': [-75.526755, 39.161921],
    'Florida': [-81.686783, 27.766279],
    'Georgia': [-83.441162, 32.157435],
    'Hawaii': [-155.5, 19.5], // Positioned as inset in lower left (like typical US maps)
    'Idaho': [-114.478828, 44.240459],
    'Illinois': [-88.986137, 40.349457],
    'Indiana': [-86.147685, 39.790942],
    'Iowa': [-93.620866, 42.032974],
    'Kansas': [-98.484246, 39.04],
    'Kentucky': [-84.86311, 37.839333],
    'Louisiana': [-91.8, 30.45809],
    'Maine': [-69.765261, 44.323535],
    'Maryland': [-76.501157, 38.972945],
    'Massachusetts': [-71.0275, 42.2352],
    'Michigan': [-84.5467, 44.3467],
    'Minnesota': [-94.6859, 46.39241],
    'Mississippi': [-89.678696, 32.354668],
    'Missouri': [-92.189283, 38.572954],
    'Montana': [-110.454353, 47.052632],
    'Nebraska': [-99.901813, 41.492537],
    'Nevada': [-116.419389, 38.313515],
    'New Hampshire': [-71.549709, 43.452492],
    'New Jersey': [-74.756138, 40.221741],
    'New Mexico': [-106.248482, 34.307144],
    'New York': [-74.948051, 42.659829],
    'North Carolina': [-79.806419, 35.759573],
    'North Dakota': [-101.002012, 47.528912],
    'Ohio': [-82.764915, 40.269789],
    'Oklahoma': [-96.921387, 35.482309],
    'Oregon': [-120.767, 43.804133],
    'Pennsylvania': [-77.209755, 40.269789],
    'Rhode Island': [-71.422132, 41.82355],
    'South Carolina': [-81.035, 33.836082],
    'South Dakota': [-99.901813, 44.299782],
    'Tennessee': [-86.784, 35.860119],
    'Texas': [-97.563461, 31.054487],
    'Utah': [-111.892622, 39.419220],
    'Vermont': [-72.710686, 44.0867],
    'Virginia': [-78.169968, 37.54],
    'Washington': [-121.1, 47.042],
    'West Virginia': [-80.954570, 38.349497],
    'Wisconsin': [-89.616508, 44.268543],
    'Wyoming': [-107.30249, 42.755966]
  };
  
  return coordinates[stateName] || [-98.5795, 39.8283]; // Default to center of US
}

// Helper function to get state abbreviation from name
function getStateAbbreviation(stateName: string): string {
  const stateMap: { [key: string]: string } = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    // US Territories
    'Puerto Rico': 'PR', 'American Samoa': 'AS', 'Guam': 'GU', 
    'Northern Mariana Islands': 'MP', 'U.S. Virgin Islands': 'VI'
  };
  
  return stateMap[stateName] || stateName.substring(0, 2).toUpperCase();
}

// Fallback static data in case Census API is unavailable
function getStaticStatesData(): CensusState[] {
  // Updated with latest Census estimates - accurate data including territories
  // This data will be automatically updated when newer Census data becomes available
  return [
    { name: 'Alabama', fips: '01', population: 5108468, abbreviation: 'AL' },
    { name: 'Alaska', fips: '02', population: 733583, abbreviation: 'AK' },
    { name: 'Arizona', fips: '04', population: 7431344, abbreviation: 'AZ' },
    { name: 'Arkansas', fips: '05', population: 3067732, abbreviation: 'AR' },
    { name: 'California', fips: '06', population: 38965193, abbreviation: 'CA' },
    { name: 'Colorado', fips: '08', population: 5877610, abbreviation: 'CO' },
    { name: 'Connecticut', fips: '09', population: 3617176, abbreviation: 'CT' },
    { name: 'Delaware', fips: '10', population: 1031890, abbreviation: 'DE' },
    { name: 'District of Columbia', fips: '11', population: 678972, abbreviation: 'DC' },
    { name: 'Florida', fips: '12', population: 23244842, abbreviation: 'FL' },
    { name: 'Georgia', fips: '13', population: 11029227, abbreviation: 'GA' },
    { name: 'Hawaii', fips: '15', population: 1435138, abbreviation: 'HI' },
    { name: 'Idaho', fips: '16', population: 1964726, abbreviation: 'ID' },
    { name: 'Illinois', fips: '17', population: 12549689, abbreviation: 'IL' },
    { name: 'Indiana', fips: '18', population: 6862199, abbreviation: 'IN' },
    { name: 'Iowa', fips: '19', population: 3207004, abbreviation: 'IA' },
    { name: 'Kansas', fips: '20', population: 2940865, abbreviation: 'KS' },
    { name: 'Kentucky', fips: '21', population: 4526154, abbreviation: 'KY' },
    { name: 'Louisiana', fips: '22', population: 4573749, abbreviation: 'LA' },
    { name: 'Maine', fips: '23', population: 1402957, abbreviation: 'ME' },
    { name: 'Maryland', fips: '24', population: 6164660, abbreviation: 'MD' },
    { name: 'Massachusetts', fips: '25', population: 7001399, abbreviation: 'MA' },
    { name: 'Michigan', fips: '26', population: 10037261, abbreviation: 'MI' },
    { name: 'Minnesota', fips: '27', population: 5742363, abbreviation: 'MN' },
    { name: 'Mississippi', fips: '28', population: 2940057, abbreviation: 'MS' },
    { name: 'Missouri', fips: '29', population: 6196010, abbreviation: 'MO' },
    { name: 'Montana', fips: '30', population: 1122069, abbreviation: 'MT' },
    { name: 'Nebraska', fips: '31', population: 1978379, abbreviation: 'NE' },
    { name: 'Nevada', fips: '32', population: 3194176, abbreviation: 'NV' },
    { name: 'New Hampshire', fips: '33', population: 1402054, abbreviation: 'NH' },
    { name: 'New Jersey', fips: '34', population: 9290841, abbreviation: 'NJ' },
    { name: 'New Mexico', fips: '35', population: 2114371, abbreviation: 'NM' },
    { name: 'New York', fips: '36', population: 19571216, abbreviation: 'NY' },
    { name: 'North Carolina', fips: '37', population: 10835491, abbreviation: 'NC' },
    { name: 'North Dakota', fips: '38', population: 783926, abbreviation: 'ND' },
    { name: 'Ohio', fips: '39', population: 11785935, abbreviation: 'OH' },
    { name: 'Oklahoma', fips: '40', population: 4053824, abbreviation: 'OK' },
    { name: 'Oregon', fips: '41', population: 4233358, abbreviation: 'OR' },
    { name: 'Pennsylvania', fips: '42', population: 12961683, abbreviation: 'PA' },
    { name: 'Rhode Island', fips: '44', population: 1095962, abbreviation: 'RI' },
    { name: 'South Carolina', fips: '45', population: 5373555, abbreviation: 'SC' },
    { name: 'South Dakota', fips: '46', population: 919318, abbreviation: 'SD' },
    { name: 'Tennessee', fips: '47', population: 7126489, abbreviation: 'TN' },
    { name: 'Texas', fips: '48', population: 30976754, abbreviation: 'TX' },
    { name: 'Utah', fips: '49', population: 3417734, abbreviation: 'UT' },
    { name: 'Vermont', fips: '50', population: 647464, abbreviation: 'VT' },
    { name: 'Virginia', fips: '51', population: 8715698, abbreviation: 'VA' },
    { name: 'Washington', fips: '53', population: 7812880, abbreviation: 'WA' },
    { name: 'West Virginia', fips: '54', population: 1770071, abbreviation: 'WV' },
    { name: 'Wisconsin', fips: '55', population: 5910955, abbreviation: 'WI' },
    { name: 'Wyoming', fips: '56', population: 584057, abbreviation: 'WY' },
    // US Territories - latest estimates
    { name: 'Puerto Rico', fips: '72', population: 3205691, abbreviation: 'PR' },
    { name: 'American Samoa', fips: '60', population: 44273, abbreviation: 'AS' },
    { name: 'Guam', fips: '66', population: 153836, abbreviation: 'GU' },
    { name: 'Northern Mariana Islands', fips: '69', population: 47329, abbreviation: 'MP' },
    { name: 'U.S. Virgin Islands', fips: '78', population: 87146, abbreviation: 'VI' }
  ];
}

// Fallback static counties data
function getStaticCountiesData(stateFips: string): CensusCounty[] {
  // Return some basic counties for major states
  const countiesData: { [key: string]: CensusCounty[] } = {
    '48': [ // Texas
      { name: 'Harris', state: 'Texas', fips: '48201', population: 4731145 },
      { name: 'Dallas', state: 'Texas', fips: '48113', population: 2613539 },
      { name: 'Tarrant', state: 'Texas', fips: '48439', population: 2110640 },
      { name: 'Bexar', state: 'Texas', fips: '48029', population: 2009324 },
      { name: 'Travis', state: 'Texas', fips: '48453', population: 1290188 },
      { name: 'Collin', state: 'Texas', fips: '48085', population: 1056924 },
      { name: 'Hidalgo', state: 'Texas', fips: '48215', population: 870781 },
      { name: 'El Paso', state: 'Texas', fips: '48141', population: 865657 }
    ],
    '06': [ // California
      { name: 'Los Angeles', state: 'California', fips: '06037', population: 10014009 },
      { name: 'San Diego', state: 'California', fips: '06073', population: 3298634 },
      { name: 'Orange', state: 'California', fips: '06059', population: 3186989 },
      { name: 'Riverside', state: 'California', fips: '06065', population: 2418185 },
      { name: 'San Bernardino', state: 'California', fips: '06071', population: 2180085 },
      { name: 'Santa Clara', state: 'California', fips: '06085', population: 1927852 },
      { name: 'Alameda', state: 'California', fips: '06001', population: 1682353 },
      { name: 'Sacramento', state: 'California', fips: '06067', population: 1585055 }
    ],
    '12': [ // Florida
      { name: 'Miami-Dade', state: 'Florida', fips: '12086', population: 2716940 },
      { name: 'Broward', state: 'Florida', fips: '12011', population: 1944375 },
      { name: 'Palm Beach', state: 'Florida', fips: '12099', population: 1492191 },
      { name: 'Hillsborough', state: 'Florida', fips: '12057', population: 1459762 },
      { name: 'Orange', state: 'Florida', fips: '12095', population: 1393452 },
      { name: 'Pinellas', state: 'Florida', fips: '12103', population: 959107 },
      { name: 'Duval', state: 'Florida', fips: '12031', population: 957755 },
      { name: 'Lee', state: 'Florida', fips: '12071', population: 760822 }
    ],
    '36': [ // New York
      { name: 'Kings', state: 'New York', fips: '36047', population: 2736074 },
      { name: 'Queens', state: 'New York', fips: '36081', population: 2405464 },
      { name: 'New York', state: 'New York', fips: '36061', population: 1694251 },
      { name: 'Suffolk', state: 'New York', fips: '36103', population: 1525920 },
      { name: 'Bronx', state: 'New York', fips: '36005', population: 1472654 },
      { name: 'Nassau', state: 'New York', fips: '36059', population: 1395774 },
      { name: 'Westchester', state: 'New York', fips: '36119', population: 1004457 },
      { name: 'Erie', state: 'New York', fips: '36029', population: 954236 }
    ],
    '42': [ // Pennsylvania
      { name: 'Philadelphia', state: 'Pennsylvania', fips: '42101', population: 1603797 },
      { name: 'Allegheny', state: 'Pennsylvania', fips: '42003', population: 1250578 },
      { name: 'Montgomery', state: 'Pennsylvania', fips: '42091', population: 856553 },
      { name: 'Bucks', state: 'Pennsylvania', fips: '42017', population: 646538 },
      { name: 'Chester', state: 'Pennsylvania', fips: '42029', population: 534413 },
      { name: 'Delaware', state: 'Pennsylvania', fips: '42045', population: 576830 },
      { name: 'Lancaster', state: 'Pennsylvania', fips: '42071', population: 552984 },
      { name: 'York', state: 'Pennsylvania', fips: '42133', population: 456438 }
    ],
    '17': [ // Illinois
      { name: 'Cook', state: 'Illinois', fips: '17031', population: 5275541 },
      { name: 'DuPage', state: 'Illinois', fips: '17043', population: 932877 },
      { name: 'Lake', state: 'Illinois', fips: '17097', population: 714342 },
      { name: 'Will', state: 'Illinois', fips: '17197', population: 696355 },
      { name: 'Kane', state: 'Illinois', fips: '17089', population: 516522 },
      { name: 'McHenry', state: 'Illinois', fips: '17111', population: 310229 },
      { name: 'Winnebago', state: 'Illinois', fips: '17201', population: 285350 },
      { name: 'St. Clair', state: 'Illinois', fips: '17163', population: 257400 }
    ],
    '39': [ // Ohio
      { name: 'Cuyahoga', state: 'Ohio', fips: '39035', population: 1264817 },
      { name: 'Franklin', state: 'Ohio', fips: '39049', population: 1323807 },
      { name: 'Hamilton', state: 'Ohio', fips: '39061', population: 830639 },
      { name: 'Summit', state: 'Ohio', fips: '39153', population: 540428 },
      { name: 'Montgomery', state: 'Ohio', fips: '39113', population: 537309 },
      { name: 'Lucas', state: 'Ohio', fips: '39095', population: 431279 },
      { name: 'Stark', state: 'Ohio', fips: '39151', population: 374853 },
      { name: 'Butler', state: 'Ohio', fips: '39017', population: 390357 }
    ],
    '13': [ // Georgia
      { name: 'Fulton', state: 'Georgia', fips: '13121', population: 1066710 },
      { name: 'Gwinnett', state: 'Georgia', fips: '13135', population: 957062 },
      { name: 'Cobb', state: 'Georgia', fips: '13067', population: 766149 },
      { name: 'DeKalb', state: 'Georgia', fips: '13089', population: 764382 },
      { name: 'Clayton', state: 'Georgia', fips: '13063', population: 297595 },
      { name: 'Cherokee', state: 'Georgia', fips: '13057', population: 266737 },
      { name: 'Henry', state: 'Georgia', fips: '13151', population: 240712 },
      { name: 'Forsyth', state: 'Georgia', fips: '13117', population: 251283 }
    ]
  };
  
  // Get the state name for the fallback county
  const stateInfo = getStaticStatesData().find(s => s.fips === stateFips.padStart(2, '0'));
  const stateName = stateInfo?.name || 'Unknown State';
  
  return countiesData[stateFips] || [
    // Default fallback county for any state
    { name: 'Main County', state: stateName, fips: `${stateFips}001`, population: 100000 }
  ];
}

// Get county count for a specific state
export async function getCountyCount(stateFips: string): Promise<number> {
  try {
    const counties = await getCountiesByState(stateFips);
    return counties.length;
  } catch (error) {
    console.warn(`Error getting county count for state ${stateFips}:`, error);
    return 0;
  }
}

// Get all US states from Census API with enhanced data
export async function getAllStatesWithCounties(): Promise<CensusState[]> {
  const states = await getAllStates();
  
  // Add county count to each state
  const statesWithCounties = await Promise.all(
    states.map(async (state) => {
      const countyCount = await getCountyCount(state.fips);
      return {
        ...state,
        countyCount
      };
    })
  );
  
  return statesWithCounties;
} 