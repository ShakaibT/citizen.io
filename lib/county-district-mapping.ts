// Pennsylvania County to Congressional District Mapping
// This maps each county to its congressional district(s)
// Some counties may be split across multiple districts

export interface CountyDistrictMapping {
  [countyName: string]: string[] // Array because some counties span multiple districts
}

export const PENNSYLVANIA_COUNTY_DISTRICTS: CountyDistrictMapping = {
  // District 1 - Brian K. Fitzpatrick
  'Bucks': ['1'],
  
  // District 2 - Brendan F. Boyle  
  'Philadelphia': ['2', '3'], // Philadelphia is split across multiple districts
  
  // District 3 - Dwight Evans
  // Part of Philadelphia
  
  // District 4 - Madeleine Dean
  'Montgomery': ['4'],
  'Berks': ['4'],
  
  // District 5 - Mary Gay Scanlon
  'Delaware': ['5'],
  'Chester': ['5'],
  
  // District 6 - Chrissy Houlahan
  // Part of Chester, Berks
  
  // District 7 - Susan Wild
  'Lehigh': ['7'],
  'Northampton': ['7'],
  'Carbon': ['7'],
  
  // District 8 - Matt Cartwright
  'Lackawanna': ['8'],
  'Luzerne': ['8'],
  'Pike': ['8'],
  'Wayne': ['8'],
  'Monroe': ['8'],
  
  // District 9 - Dan Meuser
  'Columbia': ['9'],
  'Lebanon': ['9'],
  'Montour': ['9'],
  'Northumberland': ['9'],
  'Schuylkill': ['9'],
  'Snyder': ['9'],
  'Union': ['9'],
  
  // District 10 - Scott Perry
  'Cumberland': ['10'],
  'Dauphin': ['10'],
  'Perry': ['10'],
  'York': ['10'],
  
  // District 11 - Lloyd Smucker
  'Lancaster': ['11'],
  
  // District 12 - Summer Lee
  'Allegheny': ['12'], // Part of Allegheny
  'Westmoreland': ['12'],
  
  // District 13 - John Joyce
  'Bedford': ['13'],
  'Blair': ['13'],
  'Cambria': ['13'],
  'Fulton': ['13'],
  'Huntingdon': ['13'],
  'Somerset': ['13'],
  
  // District 14 - Guy Reschenthaler
  'Fayette': ['14'],
  'Greene': ['14'],
  'Washington': ['14'],
  
  // District 15 - Glenn Thompson
  'Bradford': ['15'],
  'Cameron': ['15'],
  'Centre': ['15'],
  'Clarion': ['15'],
  'Clearfield': ['15'],
  'Clinton': ['15'],
  'Elk': ['15'],
  'Forest': ['15'],
  'Jefferson': ['15'],
  'Lycoming': ['15'],
  'McKean': ['15'],
  'Mifflin': ['15'],
  'Potter': ['15'],
  'Sullivan': ['15'],
  'Susquehanna': ['15'],
  'Tioga': ['15'],
  'Wyoming': ['15'],
  
  // District 16 - Mike Kelly
  'Butler': ['16'],
  'Crawford': ['16'],
  'Erie': ['16'],
  'Lawrence': ['16'],
  'Mercer': ['16'],
  'Venango': ['16'],
  'Warren': ['16'],
  
  // District 17 - Chris Deluzio
  'Beaver': ['17'],
  'Indiana': ['17'],
  'Armstrong': ['17']
}

/**
 * Get the congressional district(s) for a given county in Pennsylvania
 */
export function getDistrictsForCounty(countyName: string, state: string): string[] {
  if (state !== 'Pennsylvania') {
    return [] // Only Pennsylvania mapping is implemented
  }
  
  return PENNSYLVANIA_COUNTY_DISTRICTS[countyName] || []
}

/**
 * Get the primary congressional district for a county (first one if multiple)
 */
export function getPrimaryDistrictForCounty(countyName: string, state: string): string | null {
  const districts = getDistrictsForCounty(countyName, state)
  return districts.length > 0 ? districts[0] : null
} 