export interface PopulationRecord {
  state: string
  stateFips: string
  population: number
  landArea: number // in square meters
  density: number // people per square mile
  name: string
}

export interface CountyPopulationRecord {
  county: string
  countyFips: string
  state: string
  stateFips: string
  population: number
  landArea: number
  density: number
  name: string
  medianIncome?: number
  countySeat?: string
}

export interface OfficialsRecord {
  divisionId: string
  offices: Array<{
    name: string
    officials: Array<{
      name: string
      party?: string
      phones?: string[]
      urls?: string[]
      emails?: string[]
    }>
  }>
}

export interface StateInfo {
  name: string
  population: number
  density: number
  counties: number
  representatives: number
  senators: number
  landArea: number
}

export interface CountyInfo {
  name: string
  state: string
  population: number
  density: number
  countySeat?: string
  medianIncome?: number
  representatives?: number
}

export interface MapViewport {
  center: [number, number]
  zoom: number
}

export interface MapProps {
  mode?: 'default' | 'dashboard'
  onStateClick?: (state: string) => void
  onCountyClick?: (county: string, state: string) => void
  onReset?: () => void
  selectedState?: string | null
  className?: string
}

export interface HoverCardData {
  type: 'state' | 'county'
  name: string
  population: number
  density: number
  counties?: number
  representatives?: number
  senators?: number
  countySeat?: string
  medianIncome?: number
}

export type ColorScale = (value: number) => string 