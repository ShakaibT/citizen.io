interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

interface GeocodeResult {
  address_components: AddressComponent[]
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  place_id: string
  types: string[]
}

interface ValidationResult {
  success: boolean
  data?: {
    formatted_address: string
    street_number?: string
    route?: string
    locality?: string
    administrative_area_level_2?: string // County
    administrative_area_level_1?: string // State
    country?: string
    postal_code?: string
    latitude: number
    longitude: number
    place_id: string
    address_components: AddressComponent[]
  }
  error?: string
  suggestions?: string[]
}

// Extract component by type from Google's address components
function getAddressComponent(components: AddressComponent[], type: string): string | undefined {
  const component = components.find((comp) => comp.types.includes(type))
  return component?.long_name
}

function getAddressComponentShort(components: AddressComponent[], type: string): string | undefined {
  const component = components.find((comp) => comp.types.includes(type))
  return component?.short_name
}

// Validate address using Google Maps Geocoding API
export async function validateAddress(address: string): Promise<ValidationResult> {
  if (!address.trim()) {
    return {
      success: false,
      error: "Please enter an address",
    }
  }

  try {
    // For development/demo purposes, we'll use a mock validation
    // In production, you would use Google Maps Geocoding API
    const mockValidation = await mockAddressValidation(address)
    return mockValidation
  } catch (error) {
    console.error("Address validation error:", error)
    return {
      success: false,
      error: "Unable to validate address. Please try again.",
    }
  }
}

// Mock address validation for demo purposes
// In production, replace this with actual Google Maps API calls
async function mockAddressValidation(address: string): Promise<ValidationResult> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Basic address patterns for common US addresses
  const addressPatterns = [
    // Full addresses
    /^(\d+)\s+([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(-\d{4})?)$/i,
    // Address without ZIP
    /^(\d+)\s+([^,]+),\s*([^,]+),\s*([A-Z]{2})$/i,
    // City, State ZIP
    /^([^,]+),\s*([A-Z]{2})\s*(\d{5}(-\d{4})?)$/i,
    // City, State
    /^([^,]+),\s*([A-Z]{2})$/i,
  ]

  const normalizedAddress = address.trim()

  // Try to match against patterns
  for (const pattern of addressPatterns) {
    const match = normalizedAddress.match(pattern)
    if (match) {
      return generateMockValidatedAddress(normalizedAddress, match)
    }
  }

  // Check if it's a recognizable city/state combination
  const cityStateMatch = normalizedAddress.match(/^([^,]+),?\s*([A-Z]{2}|[A-Za-z\s]+)$/i)
  if (cityStateMatch) {
    const [, city, state] = cityStateMatch
    const stateCode = getStateCode(state.trim())
    if (stateCode && isValidCity(city.trim(), stateCode)) {
      return generateMockCityValidation(city.trim(), stateCode)
    }
  }

  // If no pattern matches, return suggestions
  return {
    success: false,
    error: "Unable to find this address. Please check your input and try again.",
    suggestions: [
      "Make sure to include city and state (e.g., '123 Main St, Austin, TX')",
      "Try using the full state name or abbreviation",
      "Check for typos in street names or city names",
    ],
  }
}

function generateMockValidatedAddress(address: string, match: RegExpMatchArray): ValidationResult {
  const streetNumber = match[1] || ""
  const route = match[2] || ""
  const locality = match[3] || ""
  const state = match[4] || ""
  const postalCode = match[5] || ""

  const coordinates = getMockCoordinates(locality, state)

  return {
    success: true,
    data: {
      formatted_address: formatAddress(streetNumber, route, locality, state, postalCode),
      street_number: streetNumber,
      route: route,
      locality: locality,
      administrative_area_level_1: getStateName(state) || undefined,
      country: "United States",
      postal_code: postalCode,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      place_id: `mock_place_${Date.now()}`,
      address_components: generateMockAddressComponents(streetNumber, route, locality, state, postalCode),
    },
  }
}

function generateMockCityValidation(city: string, stateCode: string): ValidationResult {
  const coordinates = getMockCoordinates(city, stateCode)
  const stateName = getStateName(stateCode)

  return {
    success: true,
    data: {
      formatted_address: `${city}, ${stateName}, USA`,
      locality: city,
      administrative_area_level_1: stateName || undefined,
      country: "United States",
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      place_id: `mock_place_${Date.now()}`,
      address_components: generateMockAddressComponents("", "", city, stateCode, ""),
    },
  }
}

function formatAddress(
  streetNumber: string,
  route: string,
  locality: string,
  state: string,
  postalCode: string,
): string {
  const parts = []
  if (streetNumber && route) {
    parts.push(`${streetNumber} ${route}`)
  }
  if (locality) {
    parts.push(locality)
  }
  if (state) {
    parts.push(getStateName(state) || state)
  }
  if (postalCode) {
    parts.push(postalCode)
  }
  return parts.join(", ") + ", USA"
}

function generateMockAddressComponents(
  streetNumber: string,
  route: string,
  locality: string,
  state: string,
  postalCode: string,
): AddressComponent[] {
  const components: AddressComponent[] = []

  if (streetNumber) {
    components.push({
      long_name: streetNumber,
      short_name: streetNumber,
      types: ["street_number"],
    })
  }

  if (route) {
    components.push({
      long_name: route,
      short_name: route,
      types: ["route"],
    })
  }

  if (locality) {
    components.push({
      long_name: locality,
      short_name: locality,
      types: ["locality", "political"],
    })
  }

  if (state) {
    const stateName = getStateName(state)
    components.push({
      long_name: stateName || state,
      short_name: state.toUpperCase(),
      types: ["administrative_area_level_1", "political"],
    })
  }

  components.push({
    long_name: "United States",
    short_name: "US",
    types: ["country", "political"],
  })

  if (postalCode) {
    components.push({
      long_name: postalCode,
      short_name: postalCode,
      types: ["postal_code"],
    })
  }

  return components
}

// Mock coordinates for major US cities
function getMockCoordinates(city: string, state: string): { lat: number; lng: number } {
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    // Major cities with realistic coordinates
    "new york_ny": { lat: 40.7128, lng: -74.006 },
    "los angeles_ca": { lat: 34.0522, lng: -118.2437 },
    chicago_il: { lat: 41.8781, lng: -87.6298 },
    houston_tx: { lat: 29.7604, lng: -95.3698 },
    phoenix_az: { lat: 33.4484, lng: -112.074 },
    philadelphia_pa: { lat: 39.9526, lng: -75.1652 },
    "san antonio_tx": { lat: 29.4241, lng: -98.4936 },
    "san diego_ca": { lat: 32.7157, lng: -117.1611 },
    dallas_tx: { lat: 32.7767, lng: -96.797 },
    "san jose_ca": { lat: 37.3382, lng: -121.8863 },
    austin_tx: { lat: 30.2672, lng: -97.7431 },
    jacksonville_fl: { lat: 30.3322, lng: -81.6557 },
    "fort worth_tx": { lat: 32.7555, lng: -97.3308 },
    columbus_oh: { lat: 39.9612, lng: -82.9988 },
    charlotte_nc: { lat: 35.2271, lng: -80.8431 },
    "san francisco_ca": { lat: 37.7749, lng: -122.4194 },
    indianapolis_in: { lat: 39.7684, lng: -86.1581 },
    seattle_wa: { lat: 47.6062, lng: -122.3321 },
    denver_co: { lat: 39.7392, lng: -104.9903 },
    washington_dc: { lat: 38.9072, lng: -77.0369 },
    boston_ma: { lat: 42.3601, lng: -71.0589 },
    "el paso_tx": { lat: 31.7619, lng: -106.485 },
    detroit_mi: { lat: 42.3314, lng: -83.0458 },
    nashville_tn: { lat: 36.1627, lng: -86.7816 },
    portland_or: { lat: 45.5152, lng: -122.6784 },
    memphis_tn: { lat: 35.1495, lng: -90.049 },
    "oklahoma city_ok": { lat: 35.4676, lng: -97.5164 },
    "las vegas_nv": { lat: 36.1699, lng: -115.1398 },
    louisville_ky: { lat: 38.2527, lng: -85.7585 },
    baltimore_md: { lat: 39.2904, lng: -76.6122 },
    milwaukee_wi: { lat: 43.0389, lng: -87.9065 },
    albuquerque_nm: { lat: 35.0844, lng: -106.6504 },
    tucson_az: { lat: 32.2226, lng: -110.9747 },
    fresno_ca: { lat: 36.7378, lng: -119.7871 },
    sacramento_ca: { lat: 38.5816, lng: -121.4944 },
    mesa_az: { lat: 33.4152, lng: -111.8315 },
    "kansas city_mo": { lat: 39.0997, lng: -94.5786 },
    atlanta_ga: { lat: 33.749, lng: -84.388 },
    "long beach_ca": { lat: 33.7701, lng: -118.1937 },
    "colorado springs_co": { lat: 38.8339, lng: -104.8214 },
    raleigh_nc: { lat: 35.7796, lng: -78.6382 },
    miami_fl: { lat: 25.7617, lng: -80.1918 },
    "virginia beach_va": { lat: 36.8529, lng: -75.978 },
    omaha_ne: { lat: 41.2565, lng: -95.9345 },
    oakland_ca: { lat: 37.8044, lng: -122.2711 },
    minneapolis_mn: { lat: 44.9778, lng: -93.265 },
    tulsa_ok: { lat: 36.154, lng: -95.9928 },
    arlington_tx: { lat: 32.7357, lng: -97.1081 },
    "new orleans_la": { lat: 29.9511, lng: -90.0715 },
    wichita_ks: { lat: 37.6872, lng: -97.3301 },
    cleveland_oh: { lat: 41.4993, lng: -81.6944 },
    tampa_fl: { lat: 27.9506, lng: -82.4572 },
    bakersfield_ca: { lat: 35.3733, lng: -119.0187 },
    aurora_co: { lat: 39.7294, lng: -104.8319 },
    anaheim_ca: { lat: 33.8366, lng: -117.9143 },
    honolulu_hi: { lat: 21.3099, lng: -157.8581 },
    "santa ana_ca": { lat: 33.7455, lng: -117.8677 },
    "corpus christi_tx": { lat: 27.8006, lng: -97.3964 },
    riverside_ca: { lat: 33.9533, lng: -117.3962 },
    lexington_ky: { lat: 38.0406, lng: -84.5037 },
    stockton_ca: { lat: 37.9577, lng: -121.2908 },
    henderson_nv: { lat: 36.0395, lng: -114.9817 },
    "saint paul_mn": { lat: 44.9537, lng: -93.09 },
    "st. louis_mo": { lat: 38.627, lng: -90.1994 },
    cincinnati_oh: { lat: 39.1031, lng: -84.512 },
    pittsburgh_pa: { lat: 40.4406, lng: -79.9959 },
  }

  const key = `${city.toLowerCase()}_${state.toLowerCase()}`
  if (cityCoords[key]) {
    return cityCoords[key]
  }

  // If city not found, return state center coordinates
  const stateCoords = getStateCoordinates(state)
  return stateCoords
}

function getStateCoordinates(state: string): { lat: number; lng: number } {
  const stateCoords: Record<string, { lat: number; lng: number }> = {
    al: { lat: 32.806671, lng: -86.79113 },
    ak: { lat: 61.370716, lng: -152.404419 },
    az: { lat: 33.729759, lng: -111.431221 },
    ar: { lat: 34.969704, lng: -92.373123 },
    ca: { lat: 36.116203, lng: -119.681564 },
    co: { lat: 39.059811, lng: -105.311104 },
    ct: { lat: 41.597782, lng: -72.755371 },
    de: { lat: 39.318523, lng: -75.507141 },
    fl: { lat: 27.766279, lng: -81.686783 },
    ga: { lat: 33.040619, lng: -83.643074 },
    hi: { lat: 21.094318, lng: -157.498337 },
    id: { lat: 44.240459, lng: -114.478828 },
    il: { lat: 40.349457, lng: -88.986137 },
    in: { lat: 39.849426, lng: -86.258278 },
    ia: { lat: 42.011539, lng: -93.210526 },
    ks: { lat: 38.5266, lng: -96.726486 },
    ky: { lat: 37.66814, lng: -84.670067 },
    la: { lat: 31.169546, lng: -91.867805 },
    me: { lat: 44.693947, lng: -69.381927 },
    md: { lat: 39.063946, lng: -76.802101 },
    ma: { lat: 42.230171, lng: -71.530106 },
    mi: { lat: 43.326618, lng: -84.536095 },
    mn: { lat: 45.694454, lng: -93.900192 },
    ms: { lat: 32.741646, lng: -89.678696 },
    mo: { lat: 38.456085, lng: -92.288368 },
    mt: { lat: 47.052952, lng: -109.63304 },
    ne: { lat: 41.12537, lng: -98.268082 },
    nv: { lat: 38.313515, lng: -117.055374 },
    nh: { lat: 43.452492, lng: -71.563896 },
    nj: { lat: 40.298904, lng: -74.521011 },
    nm: { lat: 34.840515, lng: -106.248482 },
    ny: { lat: 42.165726, lng: -74.948051 },
    nc: { lat: 35.630066, lng: -79.806419 },
    nd: { lat: 47.528912, lng: -99.784012 },
    oh: { lat: 40.388783, lng: -82.764915 },
    ok: { lat: 35.565342, lng: -96.928917 },
    or: { lat: 44.572021, lng: -122.070938 },
    pa: { lat: 40.590752, lng: -77.209755 },
    ri: { lat: 41.680893, lng: -71.51178 },
    sc: { lat: 33.856892, lng: -80.945007 },
    sd: { lat: 44.299782, lng: -99.438828 },
    tn: { lat: 35.747845, lng: -86.692345 },
    tx: { lat: 31.054487, lng: -97.563461 },
    ut: { lat: 40.150032, lng: -111.862434 },
    vt: { lat: 44.045876, lng: -72.710686 },
    va: { lat: 37.769337, lng: -78.169968 },
    wa: { lat: 47.400902, lng: -121.490494 },
    wv: { lat: 38.491226, lng: -80.95457 },
    wi: { lat: 44.268543, lng: -89.616508 },
    wy: { lat: 42.755966, lng: -107.30249 },
    dc: { lat: 38.9072, lng: -77.0369 },
  }

  return stateCoords[state.toLowerCase()] || { lat: 39.8283, lng: -98.5795 } // Center of US
}

function getStateCode(state: string): string | null {
  const stateCodes: Record<string, string> = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
    "district of columbia": "DC",
    "washington dc": "DC",
    "washington d.c.": "DC",
  }

  const normalized = state.toLowerCase().trim()

  // Check if it's already a state code
  if (state.length === 2 && /^[A-Z]{2}$/i.test(state)) {
    return state.toUpperCase()
  }

  return stateCodes[normalized] || null
}

function getStateName(code: string): string | null {
  const stateNames: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
  }

  return stateNames[code.toUpperCase()] || null
}

function isValidCity(city: string, state: string): boolean {
  // This is a simplified validation - in production you'd use a comprehensive city database
  // For now, we'll accept any reasonable city name
  return city.length >= 2 && /^[a-zA-Z\s\-'.]+$/.test(city)
}
