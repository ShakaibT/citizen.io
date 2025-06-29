// County Data Management System
// This system tracks which counties have been manually curated and verified for accuracy

export interface CountyData {
  id: string // Format: "STATE_FIPS-COUNTY_FIPS" (e.g., "42-101" for Philadelphia County, PA)
  name: string
  state: string
  stateFips: string
  countyFips: string
  status: 'coming_soon' | 'in_progress' | 'verified' | 'needs_update'
  population?: number
  lastUpdated?: string
  verifiedBy?: string
  representatives?: {
    house: Array<{
      name: string
      party: 'Republican' | 'Democrat' | 'Independent'
      district: string
      phone?: string
      email?: string
      website?: string
    }>
    senate?: Array<{
      name: string
      party: 'Republican' | 'Democrat' | 'Independent'
      phone?: string
      email?: string
      website?: string
    }>
    mayor?: {
      name: string
      party?: string
      phone?: string
      email?: string
      website?: string
    }
    cityCouncil?: Array<{
      name: string
      district?: string
      party?: string
      phone?: string
      email?: string
    }>
  }
  localGovernment?: {
    type: 'city' | 'county' | 'township' | 'borough' | 'village'
    website?: string
    phone?: string
    address?: string
  }
  upcomingElections?: Array<{
    date: string
    type: string
    description: string
    registrationDeadline?: string
  }>
  activeIssues?: Array<{
    title: string
    description: string
    category: 'infrastructure' | 'education' | 'healthcare' | 'environment' | 'economy' | 'housing' | 'transportation'
    status: 'active' | 'pending' | 'resolved'
    lastUpdate: string
  }>
  meetingSchedule?: Array<{
    type: 'city_council' | 'county_commission' | 'school_board' | 'planning_commission'
    schedule: string // e.g., "First Monday of each month at 7:00 PM"
    location?: string
    virtualOption?: boolean
  }>
}

// This will be our manually curated database
// Initially, all counties will have status 'coming_soon'
// We'll work together to populate this county by county

const curatedCountyData: CountyData[] = [
  // Example of how we'll structure the data once we start curating:
  // {
  //   id: "36-061", // New York County (Manhattan), NY
  //   name: "New York County",
  //   state: "New York", 
  //   stateFips: "36",
  //   countyFips: "061",
  //   status: 'verified',
  //   population: 1694251,
  //   lastUpdated: "2024-12-19",
  //   verifiedBy: "manual_curation",
  //   representatives: {
  //     house: [
  //       {
  //         name: "Jerry Nadler",
  //         party: "Democrat",
  //         district: "NY-12",
  //         phone: "(202) 225-5635",
  //         website: "https://nadler.house.gov"
  //       }
  //     ],
  //     senate: [
  //       {
  //         name: "Chuck Schumer",
  //         party: "Democrat",
  //         phone: "(202) 224-6542"
  //       },
  //       {
  //         name: "Kirsten Gillibrand", 
  //         party: "Democrat",
  //         phone: "(202) 224-4451"
  //       }
  //     ],
  //     mayor: {
  //       name: "Eric Adams",
  //       party: "Democrat",
  //       phone: "(212) 788-3000"
  //     }
  //   }
  // }
]

// Function to get county data by ID
export function getCountyData(stateFips: string, countyFips: string): CountyData | null {
  const id = `${stateFips}-${countyFips}`
  return curatedCountyData.find(county => county.id === id) || null
}

// Function to get county data by name and state
export function getCountyDataByName(countyName: string, stateName: string): CountyData | null {
  return curatedCountyData.find(county => 
    county.name.toLowerCase() === countyName.toLowerCase() && 
    county.state.toLowerCase() === stateName.toLowerCase()
  ) || null
}

// Function to check if county has been curated
export function isCountyCurated(stateFips: string, countyFips: string): boolean {
  const data = getCountyData(stateFips, countyFips)
  return data?.status === 'verified' || data?.status === 'in_progress'
}

// Function to get all counties by state
export function getCountiesByState(stateName: string): CountyData[] {
  return curatedCountyData.filter(county => 
    county.state.toLowerCase() === stateName.toLowerCase()
  )
}

// Function to get counties by status
export function getCountiesByStatus(status: CountyData['status']): CountyData[] {
  return curatedCountyData.filter(county => county.status === status)
}

// Function to add or update county data (for our curation process)
export function addCountyData(data: CountyData): void {
  const existingIndex = curatedCountyData.findIndex(county => county.id === data.id)
  if (existingIndex >= 0) {
    curatedCountyData[existingIndex] = { ...data, lastUpdated: new Date().toISOString() }
  } else {
    curatedCountyData.push({ ...data, lastUpdated: new Date().toISOString() })
  }
}

// Function to get curation statistics
export function getCurationStats() {
  const total = curatedCountyData.length
  const verified = curatedCountyData.filter(c => c.status === 'verified').length
  const inProgress = curatedCountyData.filter(c => c.status === 'in_progress').length
  const comingSoon = curatedCountyData.filter(c => c.status === 'coming_soon').length
  
  return {
    total,
    verified,
    inProgress,
    comingSoon,
    percentComplete: total > 0 ? Math.round((verified / total) * 100) : 0
  }
}

// US County counts by state for reference
export const US_COUNTY_COUNTS = {
  'Alabama': 67, 'Alaska': 29, 'Arizona': 15, 'Arkansas': 75, 'California': 58,
  'Colorado': 64, 'Connecticut': 8, 'Delaware': 3, 'Florida': 67, 'Georgia': 159,
  'Hawaii': 5, 'Idaho': 44, 'Illinois': 102, 'Indiana': 92, 'Iowa': 99,
  'Kansas': 105, 'Kentucky': 120, 'Louisiana': 64, 'Maine': 16, 'Maryland': 23,
  'Massachusetts': 14, 'Michigan': 83, 'Minnesota': 87, 'Mississippi': 82, 'Missouri': 115,
  'Montana': 56, 'Nebraska': 93, 'Nevada': 17, 'New Hampshire': 10, 'New Jersey': 21,
  'New Mexico': 33, 'New York': 62, 'North Carolina': 100, 'North Dakota': 53, 'Ohio': 88,
  'Oklahoma': 77, 'Oregon': 36, 'Pennsylvania': 67, 'Rhode Island': 5, 'South Carolina': 46,
  'South Dakota': 66, 'Tennessee': 95, 'Texas': 254, 'Utah': 29, 'Vermont': 14,
  'Virginia': 95, 'Washington': 39, 'West Virginia': 55, 'Wisconsin': 72, 'Wyoming': 23
} as const

// Total counties in the US
export const TOTAL_US_COUNTIES = Object.values(US_COUNTY_COUNTS).reduce((sum, count) => sum + count, 0) // 3,143 counties

// Helper function to format status for display
export function formatCountyStatus(status: CountyData['status']): string {
  switch (status) {
    case 'coming_soon':
      return 'Coming Soon'
    case 'in_progress':
      return 'In Progress'
    case 'verified':
      return 'Verified'
    case 'needs_update':
      return 'Needs Update'
    default:
      return 'Unknown'
  }
}

// Helper function to get status color
export function getStatusColor(status: CountyData['status']): string {
  switch (status) {
    case 'coming_soon':
      return 'text-orange-600 dark:text-orange-400'
    case 'in_progress':
      return 'text-blue-600 dark:text-blue-400'
    case 'verified':
      return 'text-green-600 dark:text-green-400'
    case 'needs_update':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
} 