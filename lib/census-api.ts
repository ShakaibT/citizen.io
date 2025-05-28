// Census API Integration
// This replaces the Supabase database approach with direct API calls
// Free, fast, and always up-to-date government data

export interface CensusState {
  name: string;
  abbreviation: string;
  fips: string;
  population?: number;
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
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

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
  return getCachedData('all-states', async () => {
    try {
      // Try Census API first
      const response = await fetch(
        'https://api.census.gov/data/2021/pep/population?get=NAME,POP_2021&for=state:*',
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );
      
      if (!response.ok) {
        throw new Error(`Census API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Skip header row and map to our format
      return data.slice(1).map((row: any[]) => ({
        name: row[0],
        abbreviation: getStateAbbreviation(row[0]),
        fips: row[2],
        population: parseInt(row[1])
      }));
    } catch (error) {
      console.error('Error fetching states from Census API:', error);
      // Fallback to static data if API fails
      return getStaticStatesData();
    }
  });
}

// Get counties for a specific state
export async function getCountiesByState(stateFips: string): Promise<CensusCounty[]> {
  return getCachedData(`counties-${stateFips}`, async () => {
    try {
      const response = await fetch(
        `https://api.census.gov/data/2021/pep/population?get=NAME,POP_2021&for=county:*&in=state:${stateFips}`,
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );
      
      if (!response.ok) {
        // Silently fall back to static data for API errors
        console.warn(`Census API returned ${response.status} for state ${stateFips}, using static data`);
        return getStaticCountiesData(stateFips);
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length < 2) {
        console.warn(`Invalid data format from Census API for state ${stateFips}, using static data`);
        return getStaticCountiesData(stateFips);
      }
      
      return data.slice(1).map((row: any[]) => ({
        name: row[0].replace(/ County.*$/, ''), // Remove "County" suffix
        state: stateFips,
        fips: `${row[3]}${row[2]}`, // State + County FIPS
        population: parseInt(row[1]) || 0
      }));
    } catch (error) {
      // Silently fall back to static data for any errors
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
    state.name.toLowerCase() === identifier.toLowerCase()
  ) || null;
}

// Get GeoJSON data for states - with actual US boundaries
export async function getStatesGeoJSON(): Promise<any> {
  return getCachedData('states-geojson', async () => {
    try {
      // Try to fetch actual US states GeoJSON from a reliable source
      const response = await fetch(
        'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
        { 
          headers: { 'User-Agent': 'CitizenApp/1.0' },
          signal: AbortSignal.timeout(15000) // 15 second timeout
        }
      );
      
      if (response.ok) {
        console.log('Successfully fetched external GeoJSON data');
        const geoJSON = await response.json();
        
        // Validate the GeoJSON structure
        if (!geoJSON || !geoJSON.features || !Array.isArray(geoJSON.features)) {
          console.warn('Invalid GeoJSON structure from external source, using fallback');
          throw new Error('Invalid GeoJSON structure');
        }
        
        // Get population data and enhance the GeoJSON
        const states = await getAllStates();
        const statePopMap = new Map(states.map(s => [s.name, s]));
        
        // Enhance features with population data and density
        geoJSON.features = geoJSON.features.map((feature: any) => {
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
        
        return geoJSON;
      }
      
      // Fallback to our static data if external source fails
      console.log('External GeoJSON source returned non-OK status:', response.status);
      throw new Error(`External GeoJSON source failed with status ${response.status}`);
    } catch (error) {
      console.warn('Using fallback GeoJSON data:', error);
      const states = await getAllStates();
      return createStaticStatesGeoJSON(states);
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
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };
  
  return stateMap[stateName] || stateName.substring(0, 2).toUpperCase();
}

// Fallback static data in case Census API is unavailable
function getStaticStatesData(): CensusState[] {
  return [
    { name: 'Alabama', abbreviation: 'AL', fips: '01', population: 5024279 },
    { name: 'Alaska', abbreviation: 'AK', fips: '02', population: 733391 },
    { name: 'Arizona', abbreviation: 'AZ', fips: '04', population: 7151502 },
    { name: 'Arkansas', abbreviation: 'AR', fips: '05', population: 3011524 },
    { name: 'California', abbreviation: 'CA', fips: '06', population: 39538223 },
    { name: 'Colorado', abbreviation: 'CO', fips: '08', population: 5773714 },
    { name: 'Connecticut', abbreviation: 'CT', fips: '09', population: 3605944 },
    { name: 'Delaware', abbreviation: 'DE', fips: '10', population: 989948 },
    { name: 'Florida', abbreviation: 'FL', fips: '12', population: 21538187 },
    { name: 'Georgia', abbreviation: 'GA', fips: '13', population: 10711908 },
    { name: 'Hawaii', abbreviation: 'HI', fips: '15', population: 1455271 },
    { name: 'Idaho', abbreviation: 'ID', fips: '16', population: 1839106 },
    { name: 'Illinois', abbreviation: 'IL', fips: '17', population: 12812508 },
    { name: 'Indiana', abbreviation: 'IN', fips: '18', population: 6785528 },
    { name: 'Iowa', abbreviation: 'IA', fips: '19', population: 3190369 },
    { name: 'Kansas', abbreviation: 'KS', fips: '20', population: 2937880 },
    { name: 'Kentucky', abbreviation: 'KY', fips: '21', population: 4505836 },
    { name: 'Louisiana', abbreviation: 'LA', fips: '22', population: 4657757 },
    { name: 'Maine', abbreviation: 'ME', fips: '23', population: 1396498 },
    { name: 'Maryland', abbreviation: 'MD', fips: '24', population: 6177224 },
    { name: 'Massachusetts', abbreviation: 'MA', fips: '25', population: 7001399 },
    { name: 'Michigan', abbreviation: 'MI', fips: '26', population: 10037261 },
    { name: 'Minnesota', abbreviation: 'MN', fips: '27', population: 5737915 },
    { name: 'Mississippi', abbreviation: 'MS', fips: '28', population: 2961279 },
    { name: 'Missouri', abbreviation: 'MO', fips: '29', population: 6196010 },
    { name: 'Montana', abbreviation: 'MT', fips: '30', population: 1084225 },
    { name: 'Nebraska', abbreviation: 'NE', fips: '31', population: 1961504 },
    { name: 'Nevada', abbreviation: 'NV', fips: '32', population: 3104614 },
    { name: 'New Hampshire', abbreviation: 'NH', fips: '33', population: 1395231 },
    { name: 'New Jersey', abbreviation: 'NJ', fips: '34', population: 9288994 },
    { name: 'New Mexico', abbreviation: 'NM', fips: '35', population: 2117522 },
    { name: 'New York', abbreviation: 'NY', fips: '36', population: 20201249 },
    { name: 'North Carolina', abbreviation: 'NC', fips: '37', population: 10439388 },
    { name: 'North Dakota', abbreviation: 'ND', fips: '38', population: 779094 },
    { name: 'Ohio', abbreviation: 'OH', fips: '39', population: 11799448 },
    { name: 'Oklahoma', abbreviation: 'OK', fips: '40', population: 3959353 },
    { name: 'Oregon', abbreviation: 'OR', fips: '41', population: 4237256 },
    { name: 'Pennsylvania', abbreviation: 'PA', fips: '42', population: 13002700 },
    { name: 'Rhode Island', abbreviation: 'RI', fips: '44', population: 1097379 },
    { name: 'South Carolina', abbreviation: 'SC', fips: '45', population: 5118425 },
    { name: 'South Dakota', abbreviation: 'SD', fips: '46', population: 886667 },
    { name: 'Tennessee', abbreviation: 'TN', fips: '47', population: 6910840 },
    { name: 'Texas', abbreviation: 'TX', fips: '48', population: 29145505 },
    { name: 'Utah', abbreviation: 'UT', fips: '49', population: 3271616 },
    { name: 'Vermont', abbreviation: 'VT', fips: '50', population: 643077 },
    { name: 'Virginia', abbreviation: 'VA', fips: '51', population: 8631393 },
    { name: 'Washington', abbreviation: 'WA', fips: '53', population: 7705281 },
    { name: 'West Virginia', abbreviation: 'WV', fips: '54', population: 1793716 },
    { name: 'Wisconsin', abbreviation: 'WI', fips: '55', population: 5893718 },
    { name: 'Wyoming', abbreviation: 'WY', fips: '56', population: 576851 }
  ];
}

// Fallback static counties data
function getStaticCountiesData(stateFips: string): CensusCounty[] {
  // Return some basic counties for major states
  const countiesData: { [key: string]: CensusCounty[] } = {
    '48': [ // Texas
      { name: 'Harris', state: '48', fips: '48201', population: 4731145 },
      { name: 'Dallas', state: '48', fips: '48113', population: 2613539 },
      { name: 'Tarrant', state: '48', fips: '48439', population: 2110640 },
      { name: 'Bexar', state: '48', fips: '48029', population: 2009324 },
      { name: 'Travis', state: '48', fips: '48453', population: 1290188 },
      { name: 'Collin', state: '48', fips: '48085', population: 1056924 },
      { name: 'Hidalgo', state: '48', fips: '48215', population: 870781 },
      { name: 'El Paso', state: '48', fips: '48141', population: 865657 }
    ],
    '06': [ // California
      { name: 'Los Angeles', state: '06', fips: '06037', population: 10014009 },
      { name: 'San Diego', state: '06', fips: '06073', population: 3298634 },
      { name: 'Orange', state: '06', fips: '06059', population: 3186989 },
      { name: 'Riverside', state: '06', fips: '06065', population: 2418185 },
      { name: 'San Bernardino', state: '06', fips: '06071', population: 2180085 },
      { name: 'Santa Clara', state: '06', fips: '06085', population: 1927852 },
      { name: 'Alameda', state: '06', fips: '06001', population: 1682353 },
      { name: 'Sacramento', state: '06', fips: '06067', population: 1585055 }
    ],
    '12': [ // Florida
      { name: 'Miami-Dade', state: '12', fips: '12086', population: 2716940 },
      { name: 'Broward', state: '12', fips: '12011', population: 1944375 },
      { name: 'Palm Beach', state: '12', fips: '12099', population: 1492191 },
      { name: 'Hillsborough', state: '12', fips: '12057', population: 1459762 },
      { name: 'Orange', state: '12', fips: '12095', population: 1393452 },
      { name: 'Pinellas', state: '12', fips: '12103', population: 959107 },
      { name: 'Duval', state: '12', fips: '12031', population: 957755 },
      { name: 'Lee', state: '12', fips: '12071', population: 760822 }
    ],
    '36': [ // New York
      { name: 'Kings', state: '36', fips: '36047', population: 2736074 },
      { name: 'Queens', state: '36', fips: '36081', population: 2405464 },
      { name: 'New York', state: '36', fips: '36061', population: 1694251 },
      { name: 'Suffolk', state: '36', fips: '36103', population: 1525920 },
      { name: 'Bronx', state: '36', fips: '36005', population: 1472654 },
      { name: 'Nassau', state: '36', fips: '36059', population: 1395774 },
      { name: 'Westchester', state: '36', fips: '36119', population: 1004457 },
      { name: 'Erie', state: '36', fips: '36029', population: 954236 }
    ],
    '42': [ // Pennsylvania
      { name: 'Philadelphia', state: '42', fips: '42101', population: 1603797 },
      { name: 'Allegheny', state: '42', fips: '42003', population: 1250578 },
      { name: 'Montgomery', state: '42', fips: '42091', population: 856553 },
      { name: 'Bucks', state: '42', fips: '42017', population: 646538 },
      { name: 'Chester', state: '42', fips: '42029', population: 534413 },
      { name: 'Delaware', state: '42', fips: '42045', population: 576830 },
      { name: 'Lancaster', state: '42', fips: '42071', population: 552984 },
      { name: 'York', state: '42', fips: '42133', population: 456438 }
    ],
    '17': [ // Illinois
      { name: 'Cook', state: '17', fips: '17031', population: 5275541 },
      { name: 'DuPage', state: '17', fips: '17043', population: 932877 },
      { name: 'Lake', state: '17', fips: '17097', population: 714342 },
      { name: 'Will', state: '17', fips: '17197', population: 696355 },
      { name: 'Kane', state: '17', fips: '17089', population: 516522 },
      { name: 'McHenry', state: '17', fips: '17111', population: 310229 },
      { name: 'Winnebago', state: '17', fips: '17201', population: 285350 },
      { name: 'St. Clair', state: '17', fips: '17163', population: 257400 }
    ],
    '39': [ // Ohio
      { name: 'Cuyahoga', state: '39', fips: '39035', population: 1264817 },
      { name: 'Franklin', state: '39', fips: '39049', population: 1323807 },
      { name: 'Hamilton', state: '39', fips: '39061', population: 830639 },
      { name: 'Summit', state: '39', fips: '39153', population: 540428 },
      { name: 'Montgomery', state: '39', fips: '39113', population: 537309 },
      { name: 'Lucas', state: '39', fips: '39095', population: 431279 },
      { name: 'Stark', state: '39', fips: '39151', population: 374853 },
      { name: 'Butler', state: '39', fips: '39017', population: 390357 }
    ],
    '13': [ // Georgia
      { name: 'Fulton', state: '13', fips: '13121', population: 1066710 },
      { name: 'Gwinnett', state: '13', fips: '13135', population: 957062 },
      { name: 'Cobb', state: '13', fips: '13067', population: 766149 },
      { name: 'DeKalb', state: '13', fips: '13089', population: 764382 },
      { name: 'Clayton', state: '13', fips: '13063', population: 297595 },
      { name: 'Cherokee', state: '13', fips: '13057', population: 266737 },
      { name: 'Henry', state: '13', fips: '13151', population: 240712 },
      { name: 'Forsyth', state: '13', fips: '13117', population: 251283 }
    ]
  };
  
  return countiesData[stateFips] || [
    // Default fallback county for any state
    { name: 'Main County', state: stateFips, fips: `${stateFips}001`, population: 100000 }
  ];
} 