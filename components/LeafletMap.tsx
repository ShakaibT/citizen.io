"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import { scaleQuantize } from 'd3-scale'
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeft, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePopulationData, useCountyPopulationData } from '@/hooks/usePopulationData'
import { useOfficialsData } from '@/hooks/useOfficialsData'
import { getCurrentCensusYear } from '@/lib/census-api'
import useSWR from 'swr'

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface LeafletMapProps {
  mode?: 'default' | 'dashboard'
  onStateClick?: (stateName: string) => void
  onCountyClick?: (countyName: string, stateName: string) => void
  onReset?: () => void
  selectedState?: string | null
  selectedLocationPin?: { lat: number; lng: number; address: string } | null
  zoomToLocation?: { lat: number; lng: number; zoom?: number } | null
  className?: string
  onError?: (error: string) => void
  onHover?: (feature: any) => void
  fullHeight?: boolean
}

interface StateFeature {
  type: 'Feature'
  properties: {
    NAME: string
    STATEFP: string
  }
  geometry: any
}

interface CountyFeature {
  type: 'Feature'
  properties: {
    NAME: string
    STATEFP: string
    COUNTYFP: string
  }
  geometry: any
}

// State centroids for county view markers
const stateCentroids: { [key: string]: [number, number] } = {
  'Alabama': [32.806671, -86.791130],
  'Alaska': [61.370716, -152.404419],
  'Arizona': [33.729759, -111.431221],
  'Arkansas': [34.969704, -92.373123],
  'California': [36.116203, -119.681564],
  'Colorado': [39.059811, -105.311104],
  'Connecticut': [41.597782, -72.755371],
  'Delaware': [39.318523, -75.507141],
  'Florida': [27.766279, -81.686783],
  'Georgia': [33.040619, -83.643074],
  'Hawaii': [21.094318, -157.498337],
  'Idaho': [44.240459, -114.478828],
  'Illinois': [40.349457, -88.986137],
  'Indiana': [39.849426, -86.258278],
  'Iowa': [42.011539, -93.210526],
  'Kansas': [38.526600, -96.726486],
  'Kentucky': [37.668140, -84.670067],
  'Louisiana': [31.169546, -91.867805],
  'Maine': [44.693947, -69.381927],
  'Maryland': [39.063946, -76.802101],
  'Massachusetts': [42.230171, -71.530106],
  'Michigan': [43.326618, -84.536095],
  'Minnesota': [45.694454, -93.900192],
  'Mississippi': [32.741646, -89.678696],
  'Missouri': [38.456085, -92.288368],
  'Montana': [47.042619, -110.454353],
  'Nebraska': [41.125370, -98.268082],
  'Nevada': [38.313515, -117.055374],
  'New Hampshire': [43.452492, -71.563896],
  'New Jersey': [40.298904, -74.521011],
  'New Mexico': [34.840515, -106.248482],
  'New York': [42.165726, -74.948051],
  'North Carolina': [35.630066, -79.806419],
  'North Dakota': [47.528912, -99.784012],
  'Ohio': [40.388783, -82.764915],
  'Oklahoma': [35.565342, -96.928917],
  'Oregon': [44.572021, -122.070938],
  'Pennsylvania': [40.590752, -77.209755],
  'Rhode Island': [41.680893, -71.51178],
  'South Carolina': [33.856892, -80.945007],
  'South Dakota': [44.299782, -99.438828],
  'Tennessee': [35.747845, -86.692345],
  'Texas': [31.054487, -97.563461],
  'Utah': [40.150032, -111.862434],
  'Vermont': [44.045876, -72.710686],
  'Virginia': [37.769337, -78.169968],
  'Washington': [47.400902, -121.490494],
  'West Virginia': [38.491226, -80.954453],
  'Wisconsin': [44.268543, -89.616508],
  'Wyoming': [42.755966, -107.302490]
}

// House representatives by state (approximate based on 2020 census)
const stateRepresentatives: { [key: string]: { house: number; senate: number } } = {
  'Alabama': { house: 7, senate: 2 },
  'Alaska': { house: 1, senate: 2 },
  'Arizona': { house: 9, senate: 2 },
  'Arkansas': { house: 4, senate: 2 },
  'California': { house: 52, senate: 2 },
  'Colorado': { house: 8, senate: 2 },
  'Connecticut': { house: 5, senate: 2 },
  'Delaware': { house: 1, senate: 2 },
  'Florida': { house: 28, senate: 2 },
  'Georgia': { house: 14, senate: 2 },
  'Hawaii': { house: 2, senate: 2 },
  'Idaho': { house: 2, senate: 2 },
  'Illinois': { house: 17, senate: 2 },
  'Indiana': { house: 9, senate: 2 },
  'Iowa': { house: 4, senate: 2 },
  'Kansas': { house: 4, senate: 2 },
  'Kentucky': { house: 6, senate: 2 },
  'Louisiana': { house: 6, senate: 2 },
  'Maine': { house: 2, senate: 2 },
  'Maryland': { house: 8, senate: 2 },
  'Massachusetts': { house: 9, senate: 2 },
  'Michigan': { house: 13, senate: 2 },
  'Minnesota': { house: 8, senate: 2 },
  'Mississippi': { house: 4, senate: 2 },
  'Missouri': { house: 8, senate: 2 },
  'Montana': { house: 2, senate: 2 },
  'Nebraska': { house: 3, senate: 2 },
  'Nevada': { house: 4, senate: 2 },
  'New Hampshire': { house: 2, senate: 2 },
  'New Jersey': { house: 12, senate: 2 },
  'New Mexico': { house: 3, senate: 2 },
  'New York': { house: 26, senate: 2 },
  'North Carolina': { house: 14, senate: 2 },
  'North Dakota': { house: 1, senate: 2 },
  'Ohio': { house: 15, senate: 2 },
  'Oklahoma': { house: 5, senate: 2 },
  'Oregon': { house: 6, senate: 2 },
  'Pennsylvania': { house: 17, senate: 2 },
  'Rhode Island': { house: 2, senate: 2 },
  'South Carolina': { house: 7, senate: 2 },
  'South Dakota': { house: 1, senate: 2 },
  'Tennessee': { house: 9, senate: 2 },
  'Texas': { house: 38, senate: 2 },
  'Utah': { house: 4, senate: 2 },
  'Vermont': { house: 1, senate: 2 },
  'Virginia': { house: 11, senate: 2 },
  'Washington': { house: 10, senate: 2 },
  'West Virginia': { house: 2, senate: 2 },
  'Wisconsin': { house: 8, senate: 2 },
  'Wyoming': { house: 1, senate: 2 }
}

// County House Representatives data (this would ideally come from an API)
const countyHouseReps: { [key: string]: { [key: string]: Array<{name: string; party: string; district: string}> } } = {
  'Oklahoma': {
    'Oklahoma County': [{ name: 'Stephanie Bice', party: 'Republican', district: '5th' }],
    'Tulsa County': [{ name: 'Kevin Hern', party: 'Republican', district: '1st' }],
    'Cleveland County': [{ name: 'Stephanie Bice', party: 'Republican', district: '5th' }],
    'Comanche County': [{ name: 'Tom Cole', party: 'Republican', district: '4th' }],
    'Canadian County': [{ name: 'Stephanie Bice', party: 'Republican', district: '5th' }],
    'Payne County': [{ name: 'Frank Lucas', party: 'Republican', district: '3rd' }],
    'Washington County': [{ name: 'Kevin Hern', party: 'Republican', district: '1st' }],
    'Rogers County': [{ name: 'Kevin Hern', party: 'Republican', district: '1st' }],
    'Wagoner County': [{ name: 'Josh Brecheen', party: 'Republican', district: '2nd' }],
    'Creek County': [{ name: 'Josh Brecheen', party: 'Republican', district: '2nd' }]
    // Add more counties as needed
  },
  'Texas': {
    'Harris County': [
      { name: 'Sheila Jackson Lee', party: 'Democratic', district: '18th' },
      { name: 'Al Green', party: 'Democratic', district: '9th' },
      { name: 'Sylvia Garcia', party: 'Democratic', district: '29th' }
    ],
    'Dallas County': [
      { name: 'Eddie Bernice Johnson', party: 'Democratic', district: '30th' },
      { name: 'Colin Allred', party: 'Democratic', district: '32nd' }
    ]
    // Add more counties as needed
  }
  // Add more states as needed
}

// Custom hook for map controls
function MapControls({ 
  onZoomIn, 
  onZoomOut, 
  onReset, 
  onBack, 
  showBack = false 
}: {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onBack?: () => void
  showBack?: boolean
}) {
  return (
    <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-[1000] flex flex-col gap-1 sm:gap-2">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation"
          title="Back to States"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}
      <button
        onClick={onZoomIn}
        className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation"
        title="Zoom In"
      >
        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <button
        onClick={onZoomOut}
        className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation"
        title="Zoom Out"
      >
        <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <button
        onClick={onReset}
        className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation"
        title="Reset View"
      >
        <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </div>
  )
}

// Population Legend component
function PopulationLegend({ 
  colorScale, 
  totalPopulation,
  statePopData,
  censusYear,
  currentView,
  selectedState,
  countyPopData
}: { 
  colorScale: (value: number) => string
  totalPopulation: number
  statePopData: any[]
  censusYear: number
  currentView: 'states' | 'counties'
  selectedState?: string | null
  countyPopData?: any[]
}) {
  const formatPopulation = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`
    }
    return num.toString()
  }

  if (currentView === 'counties' && selectedState) {
    // County view legend - position it below the OfficialsLegend to avoid overlap
    const stateData = statePopData.find(s => s.name === selectedState)
    const statePopulation = stateData?.population || 0
    
    const countyRanges = [
      { label: '<5K', min: 0, max: 5000, color: '#f0f9ff' },
      { label: '5K-15K', min: 5000, max: 15000, color: '#e0f2fe' },
      { label: '15K-50K', min: 15000, max: 50000, color: '#bae6fd' },
      { label: '50K-100K', min: 50000, max: 100000, color: '#7dd3fc' },
      { label: '100K-250K', min: 100000, max: 250000, color: '#38bdf8' },
      { label: '250K-500K', min: 250000, max: 500000, color: '#0ea5e9' },
      { label: '>500K', min: 500000, max: Infinity, color: '#0284c7' }
    ]

    return (
      <div className="absolute left-2 sm:left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 max-w-[300px]" style={{ top: '480px' }}>
        <div className="space-y-3">
          {/* State Title */}
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {selectedState}
          </div>
          
          {/* State Population */}
          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {formatPopulation(statePopulation)}
          </div>
          
          {/* County Population Ranges */}
          <div className="space-y-2.5">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">County Population</div>
            {countyRanges.map((range, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-sm border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: range.color }}
                />
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {range.label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Year indicator */}
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-600">
            {censusYear} Census Data
          </div>
        </div>
      </div>
    )
  }

  // Default state view legend
  const populationRanges = [
    { label: '<1M', min: 0, max: 1000000, color: '#dbeafe' },
    { label: '1M-3M', min: 1000000, max: 3000000, color: '#bfdbfe' },
    { label: '3M-5M', min: 3000000, max: 5000000, color: '#93c5fd' },
    { label: '5M-10M', min: 5000000, max: 10000000, color: '#60a5fa' },
    { label: '10M-20M', min: 10000000, max: 20000000, color: '#3b82f6' },
    { label: '>20M', min: 20000000, max: Infinity, color: '#2563eb' }
  ]

  return (
    <div className="absolute bottom-4 sm:bottom-6 left-2 sm:left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 max-w-[300px]">
      <div className="space-y-4">
        {/* Title */}
        <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
          US Population
        </div>
        
        {/* Total Population */}
        <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {formatPopulation(totalPopulation)}
        </div>
        
        {/* Population Ranges */}
        <div className="space-y-2.5">
          {populationRanges.map((range, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: range.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {range.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* Year indicator */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-600">
          {censusYear} Census Data
        </div>
      </div>
    </div>
  )
}

// Officials Legend component
function OfficialsLegend({ 
  currentView,
  selectedState,
  statePopData
}: { 
  currentView: 'states' | 'counties'
  selectedState?: string | null
  statePopData: any[]
}) {
  // Use the real-time officials data hook
  const { data: officialsData, error, isLoading } = useOfficialsData(selectedState || null)

  // Helper function to get party colors
  const getPartyColor = (party: string) => {
    switch (party) {
      case 'Democratic':
        return '#2563eb' // Blue
      case 'Republican':
        return '#dc2626' // Red
      case 'Independent':
        return '#7c3aed' // Purple
      default:
        return '#6b7280' // Gray
    }
  }

  // Helper function to get party abbreviation
  const getPartyAbbr = (party: string) => {
    switch (party) {
      case 'Democratic':
        return 'D'
      case 'Republican':
        return 'R'
      case 'Independent':
        return 'I'
      default:
        return '?'
    }
  }

  // Show officials legend when a state is selected (both states and counties view)
  if (selectedState && (currentView === 'states' || currentView === 'counties')) {
    // Show loading state
    if (isLoading) {
      return (
        <div className="absolute top-20 sm:top-24 left-2 sm:left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 max-w-[300px]">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-red-500 rounded-full"></div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {selectedState}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Loading officials data...
            </div>
          </div>
        </div>
      )
    }

    // Show error state with fallback
    if (error || !officialsData?.officials?.length) {
      return (
        <div className="absolute top-20 sm:top-24 left-2 sm:left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 max-w-[300px]">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-red-500 rounded-full"></div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {selectedState}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Officials data temporarily unavailable
            </div>
          </div>
        </div>
      )
    }

    // Process the real-time officials data
    const officials = officialsData.officials
    const governor = officials.find(o => o.office.toLowerCase().includes('governor'))
    const senators = officials.filter(o => o.office.toLowerCase().includes('senator'))
    
    return (
      <div className="absolute top-20 sm:top-24 left-2 sm:left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 max-w-[300px]">
        <div className="space-y-4">
          {/* Title with state name */}
          <div className="flex items-center space-x-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-red-500 rounded-full"></div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {selectedState}
            </div>
          </div>
          
          {/* Data source indicator */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {officialsData.source === 'google_civic_api' && '🔴 Live Data'}
            {officialsData.source === 'supabase_cache' && '🟡 Cached Data'}
            {officialsData.source === 'fallback_data' && '🟠 Fallback Data'}
            {officialsData.lastUpdated && (
              <span className="ml-2">
                Updated: {new Date(officialsData.lastUpdated).toLocaleDateString()}
              </span>
            )}
          </div>
          
          {/* Governor */}
          {governor && (
            <div className="space-y-2.5">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Governor</div>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: getPartyColor(governor.party || '') }}
                />
                <div className="flex-1">
                  <div className="text-sm text-gray-900 dark:text-white font-medium">
                    {governor.name}
                  </div>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: getPartyColor(governor.party || '') }}
                    >
                      {getPartyAbbr(governor.party || '')}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {governor.party || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Senators */}
          {senators.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Senators ({senators.length})
              </div>
              <div className="space-y-3.5">
                {senators.map((senator, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <div 
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: getPartyColor(senator.party || '') }}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {senator.name}
                      </div>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: getPartyColor(senator.party || '') }}
                        >
                          {getPartyAbbr(senator.party || '')}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {senator.party || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional officials count */}
          {officials.length > (governor ? 1 : 0) + senators.length && (
            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
              +{officials.length - (governor ? 1 : 0) - senators.length} other officials
            </div>
          )}
        </div>
      </div>
    )
  }

  return null // Don't show officials legend when no state is selected
}

// Hover info component
function HoverInfo({ 
  feature, 
  position, 
  statePopData, 
  countyPopData,
  enhancedStateData,
  currentView,
  selectedState,
  getCountyReps
}: { 
  feature: any
  position: { x: number; y: number }
  statePopData: any[]
  countyPopData: any[]
  enhancedStateData: any[]
  currentView: 'states' | 'counties'
  selectedState?: string | null
  getCountyReps: (stateName: string, countyName: string) => Array<{name: string; party: string; district: string}>
}) {
  if (!feature) return null

  // Get the feature name from various possible property names
  const featureName = feature.properties?.NAME || 
                     feature.properties?.name || 
                     feature.properties?.State || 
                     feature.properties?.state ||
                     feature.name

  // Determine if this is a county or state based on currentView and properties
  const isCountyFeature = currentView === 'counties' || feature.properties?.COUNTYFP
  const isStateFeature = currentView === 'states' && !feature.properties?.COUNTYFP

  let displayData = null

  if (isCountyFeature) {
    // For counties, look in county data
    displayData = countyPopData?.find(
      (item: any) => item.name === featureName
    )
  } else {
    // For states, use enhanced data if available, otherwise fall back to basic state data
    const enhancedData = enhancedStateData?.find(
      (item: any) => item.name === featureName
    )
    const stateData = statePopData?.find(
      (item: any) => item.name === featureName
    )
    displayData = enhancedData || stateData
  }

  // Get representatives data for states
  const repsData = isStateFeature ? stateRepresentatives[featureName] : null

  // Get actual county counts for states (fallback to known values if API data is incomplete)
  const getActualCountyCount = (stateName: string, apiCount?: number): number => {
    const knownCountyCounts: { [key: string]: number } = {
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
    }
    
    // If API data seems incomplete (like 1 or 8 counties for major states), use known count
    if (apiCount && apiCount > 10) {
      return apiCount
    }
    
    return knownCountyCounts[stateName] || apiCount || 0
  }

  const formatPopulation = (num: number): string => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  // Calculate position to keep tooltip on screen
  const tooltipWidth = 280
  const tooltipHeight = 140
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let adjustedX = position.x + 8   // Much closer to cursor
  let adjustedY = position.y + 8   // Just below cursor
  
  // Adjust for mobile screens
  if (viewportWidth < 640) {
    // On mobile, position tooltip above cursor with some offset
    adjustedX = Math.max(10, Math.min(viewportWidth - tooltipWidth - 10, position.x - tooltipWidth / 2))
    adjustedY = Math.max(10, position.y - tooltipHeight - 10)
  } else {
    // Desktop positioning - keep very close to cursor
    if (adjustedX + tooltipWidth > viewportWidth) {
      adjustedX = position.x - tooltipWidth - 8  // Show to the left of cursor - MUCH CLOSER
    }
    if (adjustedY + tooltipHeight > viewportHeight) {
      adjustedY = position.y - tooltipHeight - 8  // Show above cursor
    }
    
    // Ensure minimum distance from edges
    adjustedX = Math.max(5, Math.min(viewportWidth - tooltipWidth - 5, adjustedX))
    adjustedY = Math.max(5, Math.min(viewportHeight - tooltipHeight - 5, adjustedY))
  }

  return (
    <div
      className="fixed z-[2000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 pointer-events-none max-w-[280px] sm:max-w-xs"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
    >
      <div className="space-y-2 sm:space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-1">
            {featureName || 'Unknown Location'}
          </h3>
          {feature.properties?.STATEFP && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              FIPS: {feature.properties.STATEFP}{isCountyFeature && feature.properties?.COUNTYFP ? feature.properties.COUNTYFP : ''}
            </p>
          )}
        </div>

        {displayData ? (
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Population:</span>
              <span className="font-medium text-gray-900 dark:text-white ml-2">
                {formatPopulation(displayData.population)}
              </span>
            </div>
            {!isCountyFeature && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Counties:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">
                    {getActualCountyCount(featureName, displayData.county_count || displayData.counties || displayData.countyCount)}
                  </span>
                </div>
                {repsData && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Representatives:</span>
                    <span className="font-medium text-gray-900 dark:text-white ml-2">
                      {repsData.house}
                    </span>
                  </div>
                )}
              </>
            )}
            {isCountyFeature && selectedState && (
              <>
                {/* Show House Representatives for counties */}
                {(() => {
                  const countyReps = getCountyReps(selectedState, featureName)
                  if (countyReps.length > 0) {
                    return (
                      <div className="space-y-1">
                        <div className="text-gray-600 dark:text-gray-400">House Rep{countyReps.length > 1 ? 's' : ''}:</div>
                        {countyReps.map((rep, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {rep.name}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 ml-1">
                              ({rep.party.charAt(0)}-{rep.district})
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return null
                })()}
              </>
            )}
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {isCountyFeature ? 'County data loading...' : 'State data loading...'}
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
          {getCurrentCensusYear()} Census Data
        </div>
      </div>
    </div>
  )
}

// Dashboard drawer component
function DashboardDrawer({
  isOpen,
  onClose,
  officials,
  stateName
}: {
  isOpen: boolean
  onClose: () => void
  officials: any[]
  stateName: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{stateName} Officials</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
            {officials.map((official, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="font-medium">{official.name}</div>
                <div className="text-sm text-gray-600">{official.office}</div>
                {official.party && (
                  <div className="text-xs text-gray-500">{official.party}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Custom tile layer component for NYT-style responsive mapping
function ResponsiveTileLayer({ 
  currentZoom, 
  statePopData, 
  countyPopData, 
  selectedState,
  currentView 
}: {
  currentZoom: number
  statePopData: any[]
  countyPopData: any[]
  selectedState?: string | null
  currentView: 'states' | 'counties'
}) {
  const map = useMap()
  
  // Define different tile sources for different zoom levels and contexts
  const getTileConfig = useCallback(() => {
    // Base map style - clean, minimal for civic data
    const baseStyle = {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }
    
    // For high zoom levels (street level), use detailed OSM
    if (currentZoom >= 10) {
      return {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19
      }
    }
    
    // For medium zoom (city/county level), use clean CartoDB
    if (currentZoom >= 6) {
      return {
        url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }
    }
    
    // For low zoom (state/national level), use minimal base
    return baseStyle
  }, [currentZoom])
  
  const tileConfig = getTileConfig()
  
  return (
    <TileLayer
      key={`${currentZoom}-${currentView}`}
      url={tileConfig.url}
      attribution={tileConfig.attribution}
      subdomains={tileConfig.subdomains}
      maxZoom={tileConfig.maxZoom}
      opacity={currentZoom >= 10 ? 1 : 0.8}
      className="responsive-tile-layer"
    />
  )
}

// Enhanced GeoJSON layer with NYT-style styling
function EnhancedGeoJSONLayer({
  data,
  currentZoom,
  currentView,
  statePopData,
  countyPopData,
  selectedState,
  selectedCounty,
  onFeatureClick,
  onFeatureHover,
  onFeatureMouseOut
}: {
  data: any
  currentZoom: number
  currentView: 'states' | 'counties'
  statePopData: any[]
  countyPopData: any[]
  selectedState?: string | null
  selectedCounty?: string | null
  onFeatureClick: (feature: any, event: L.LeafletMouseEvent) => void
  onFeatureHover: (feature: any, event: L.LeafletMouseEvent) => void
  onFeatureMouseOut: (feature: any, event: L.LeafletMouseEvent) => void
}) {
  
  // NYT-style color scales with better contrast
  const getPopulationColor = useCallback((population: number, isState: boolean) => {
    if (isState) {
      // State-level colors - civic blue palette
      if (population < 1000000) return '#f0f9ff'        // Very light blue
      if (population < 3000000) return '#e0f2fe'        // Light blue  
      if (population < 5000000) return '#bae6fd'        // Medium light blue
      if (population < 10000000) return '#7dd3fc'       // Medium blue
      if (population < 20000000) return '#38bdf8'       // Medium dark blue
      return '#0ea5e9'                                  // Dark blue
    } else {
      // County-level colors - warmer civic palette
      if (population < 5000) return '#fef3c7'          // Very light amber
      if (population < 15000) return '#fde68a'         // Light amber
      if (population < 50000) return '#fcd34d'         // Medium amber
      if (population < 100000) return '#f59e0b'        // Medium orange
      if (population < 250000) return '#d97706'        // Dark orange
      if (population < 500000) return '#b45309'        // Darker orange
      return '#92400e'                                 // Darkest orange
    }
  }, [])
  
  // Enhanced styling function
  const getFeatureStyle = useCallback((feature: any) => {
    const isState = currentView === 'states'
    const featureName = feature.properties?.NAME || feature.properties?.name || ''
    
    let population = 0
    let isSelected = false
    
    if (isState) {
      const stateData = statePopData.find(s => s.name === featureName)
      population = stateData?.population || 0
      isSelected = selectedState === featureName
    } else {
      const countyData = countyPopData.find(c => c.name === featureName)
      population = countyData?.population || 0
      isSelected = selectedCounty === featureName
    }
    
    const baseColor = getPopulationColor(population, isState)
    
    return {
      fillColor: baseColor,
      weight: isSelected ? 3 : 2,
      opacity: 1,
      color: isSelected ? '#1e40af' : '#6b7280',
      fillOpacity: 0.7,
      cursor: 'pointer'
    }
  }, [currentView, currentZoom, statePopData, countyPopData, selectedState, selectedCounty, getPopulationColor])
  
  // Enhanced event handlers
  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const layer = e.target
        const currentStyle = getFeatureStyle(feature)
        
        // Apply prominent hover style with scaling effect
        layer.setStyle({
          ...currentStyle,
          weight: currentStyle.weight + 2,
          fillOpacity: Math.min(currentStyle.fillOpacity + 0.2, 0.9),
          color: '#1e40af',
          dashArray: '' // Ensure no dashed lines
        })
        
        // Add scaling effect via CSS transform
        if (layer.getElement) {
          const element = layer.getElement()
          if (element) {
            element.style.transform = 'scale(1.05)'
            element.style.transformOrigin = 'center'
            element.style.transition = 'transform 0.2s ease-out'
            element.style.filter = 'brightness(1.1)'
            element.style.zIndex = '1000'
          }
        }
        
        // Bring to front
        layer.bringToFront()
        
        onFeatureHover(feature, e)
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const layer = e.target
        
        // Reset scaling effect
        if (layer.getElement) {
          const element = layer.getElement()
          if (element) {
            element.style.transform = 'scale(1)'
            element.style.transition = 'transform 0.2s ease-out'
            element.style.filter = 'none'
            element.style.zIndex = 'auto'
          }
        }
        
        // Completely reset to fresh style
        const resetStyle = getFeatureStyle(feature)
        layer.setStyle({
          ...resetStyle,
          dashArray: '' // Explicitly remove any dashed lines
        })
        
        onFeatureMouseOut(feature, e)
      },
      click: (e: L.LeafletMouseEvent) => {
        onFeatureClick(feature, e)
      }
    })
  }, [getFeatureStyle, onFeatureClick, onFeatureHover, onFeatureMouseOut])
  
  if (!data) return null
  
  return (
    <GeoJSON
      key={`${currentView}-layer`}
      data={data}
      style={getFeatureStyle}
      onEachFeature={onEachFeature}
    />
  )
}

export default function LeafletMap({
  mode = 'default',
  onStateClick,
  onCountyClick,
  onReset,
  selectedState,
  selectedLocationPin,
  zoomToLocation,
  className = '',
  onError,
  onHover,
  fullHeight = false
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [statesData, setStatesData] = useState<any>(null)
  const [countiesData, setCountiesData] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'states' | 'counties'>('states')
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null)
  const [hoveredFeature, setHoveredFeature] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(4) // Track current zoom level
  const [isMapReady, setIsMapReady] = useState(false)

  // Data hooks
  const { statePopData = [], isLoading: statePopLoading } = usePopulationData()
  const { countyPopData = [], isLoading: countyPopLoading } = useCountyPopulationData(selectedState || '')
  const { data: countyHouseReps = {} } = useOfficialsData(selectedState || null)

  // Calculate total population
  const totalPopulation = useMemo(() => {
    return statePopData.reduce((sum: number, state: any) => sum + (state.population || 0), 0)
  }, [statePopData])

  // Load states data from local API
  useEffect(() => {
    const loadStatesData = async () => {
      try {
        const response = await fetch('/api/states-geojson')
        if (!response.ok) {
          throw new Error(`Failed to load states data: ${response.status}`)
        }
        const data = await response.json()
        setStatesData(data)
      } catch (error) {
        console.error('Error loading states data:', error)
        if (onError) {
          onError('Failed to load map data')
        }
      }
    }

    loadStatesData()
  }, [onError])

  // Load counties data when a state is selected AND we're in counties view
  useEffect(() => {
    if (selectedState && currentView === 'counties') {
      const loadCountiesData = async () => {
        try {
          console.log(`Loading counties for ${selectedState}...`)
          const response = await fetch(`/api/counties-geojson?state=${encodeURIComponent(selectedState)}`)
          if (!response.ok) {
            throw new Error(`Failed to load counties data: ${response.status}`)
          }
          const data = await response.json()
          console.log(`Loaded ${data.features?.length || 0} counties for ${selectedState}`)
          setCountiesData(data)
        } catch (error) {
          console.error('Error loading counties data:', error)
          if (onError) {
            onError('Failed to load counties data')
          }
        }
      }

      loadCountiesData()
    } else if (currentView === 'states') {
      // Clear counties data when switching back to states view
      setCountiesData(null)
      setSelectedCounty(null)
    }
  }, [selectedState, currentView, onError])

  // Handle zoom to location
  useEffect(() => {
    if (zoomToLocation && mapRef.current && isMapReady) {
      const { lat, lng, zoom = 12 } = zoomToLocation
      mapRef.current.flyTo([lat, lng], zoom, {
        duration: 1.2,
        easeLinearity: 0.1
      })
    }
  }, [zoomToLocation, isMapReady])

  // Enhanced feature click handler
  const handleFeatureClick = useCallback((feature: any, event: L.LeafletMouseEvent) => {
    const featureName = feature.properties?.NAME || feature.properties?.name || ''
    
    if (currentView === 'states') {
      if (featureName && onStateClick) {
        onStateClick(featureName)
        
        // Always switch to counties view when clicking a state
        setCurrentView('counties')
        
        // Zoom to state bounds with proper padding
        const layer = event.target
        if (mapRef.current && layer.getBounds) {
          // Use a timeout to ensure the counties data loads first
          setTimeout(() => {
            mapRef.current?.flyToBounds(layer.getBounds(), { 
              padding: [20, 20],
              duration: 1.0,
              easeLinearity: 0.1,
              maxZoom: 8 // Prevent over-zooming
            })
          }, 100)
        }
      }
    } else if (currentView === 'counties') {
      if (featureName && selectedState) {
        setSelectedCounty(featureName)
        
        if (onCountyClick) {
          onCountyClick(featureName, selectedState)
        }
      }
    }
  }, [currentView, onStateClick, onCountyClick, selectedState])

  // Enhanced feature hover handler
  const handleFeatureHover = useCallback((feature: any, event: L.LeafletMouseEvent) => {
    setHoveredFeature(feature)
    setMousePosition({ x: event.originalEvent.clientX, y: event.originalEvent.clientY })
    onHover?.(feature)
  }, [onHover])

  // Feature mouse out handler
  const handleFeatureMouseOut = useCallback((feature: any, event: L.LeafletMouseEvent) => {
    setHoveredFeature(null)
    setMousePosition(null)
  }, [])

  // Map controls handlers with zoom tracking
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom()
      const currentCenter = mapRef.current.getCenter()
      mapRef.current.flyTo(currentCenter, currentZoom + 0.5, {
        duration: 0.5,
        easeLinearity: 0.1
      })
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom()
      const currentCenter = mapRef.current.getCenter()
      mapRef.current.flyTo(currentCenter, currentZoom - 0.5, {
        duration: 0.5,
        easeLinearity: 0.1
      })
    }
  }, [])

  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      // Simple reset to initial view without restrictive bounds
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const resetCenter: [number, number] = isMobile 
        ? [45.0, -95.0] // Mobile center
        : [39.8283, -98.5795] // Desktop center
      const resetZoom = isMobile ? 3.8 : 4
      
      mapRef.current.flyTo(resetCenter, resetZoom, { 
        duration: 0.8,
        easeLinearity: 0.1
      })
    }
    setCurrentView('states')
    setCountiesData(null)
    setSelectedCounty(null)
    setDrawerOpen(false)
    onReset?.()
  }, [onReset])

  const handleBackToStates = useCallback(() => {
    setCurrentView('states')
    setCountiesData(null)
    setSelectedCounty(null)
    setDrawerOpen(false)
    handleResetView()
  }, [handleResetView])

  // Map height configuration
  const mapHeight = fullHeight 
    ? 'h-screen' 
    : mode === 'dashboard' 
      ? 'h-[60vh] sm:h-[65vh] lg:h-[70vh]' 
      : 'h-[50vh] sm:h-[55vh] lg:h-[60vh] xl:h-[65vh]'
  
  // Mobile-responsive initial view settings
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const initialCenter: [number, number] = isMobile 
    ? [45.0, -95.0] // Much higher latitude for mobile to push US states up significantly
    : [39.8283, -98.5795] // Keep original desktop center unchanged
  const initialZoom = isMobile ? 3.8 : 4 // Slightly lower zoom for mobile to fit more content
  
  // Removed problematic window resize handler that was interfering with zoom

  return (
    <div className={`relative ${mapHeight} ${className}`}>
      <MapContainer
        ref={(map) => {
          if (map) {
            mapRef.current = map
            
            // Set initial view after map is ready
            setTimeout(() => {
              const isMobile = window.innerWidth < 768
              const center: [number, number] = isMobile 
                ? [45.0, -95.0] // Much higher latitude for mobile to push US states up significantly
                : [39.8283, -98.5795] // Keep original desktop center unchanged
              const zoom = isMobile ? 3.8 : 4 // Slightly lower zoom for mobile to fit more content
              
              map.setView(center, zoom, { animate: false })
              setCurrentZoom(zoom)
              setIsMapReady(true)
            }, 100)
            
            // Add zoom change listener
            map.on('zoomend', () => {
              setCurrentZoom(map.getZoom())
            })
          }
        }}
        center={initialCenter}
        zoom={initialZoom}
        minZoom={2} // Allow wide zoom out
        maxZoom={18} // Allow street-level zoom in
        className="w-full h-full nyt-style-map"
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={true} // Enable scroll wheel zoom
        zoomSnap={0.25} // Smoother zoom increments
        zoomDelta={0.5} // Reasonable zoom delta
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        inertia={true}
        inertiaDeceleration={2000}
        inertiaMaxSpeed={1000}
      >
        {/* Responsive Tile Layer */}
        <ResponsiveTileLayer
          currentZoom={currentZoom}
          statePopData={statePopData}
          countyPopData={countyPopData}
          selectedState={selectedState}
          currentView={currentView}
        />
        
        {/* Enhanced States Layer */}
        {currentView === 'states' && statesData && (
          <EnhancedGeoJSONLayer
            data={statesData}
            currentZoom={currentZoom}
            currentView={currentView}
            statePopData={statePopData}
            countyPopData={countyPopData}
            selectedState={selectedState}
            selectedCounty={selectedCounty}
            onFeatureClick={handleFeatureClick}
            onFeatureHover={handleFeatureHover}
            onFeatureMouseOut={handleFeatureMouseOut}
          />
        )}
        
        {/* Enhanced Counties Layer */}
        {currentView === 'counties' && countiesData && (
          <EnhancedGeoJSONLayer
            data={countiesData}
            currentZoom={currentZoom}
            currentView={currentView}
            statePopData={statePopData}
            countyPopData={countyPopData}
            selectedState={selectedState}
            selectedCounty={selectedCounty}
            onFeatureClick={handleFeatureClick}
            onFeatureHover={handleFeatureHover}
            onFeatureMouseOut={handleFeatureMouseOut}
          />
        )}
        
        {/* Selected location pin - only show when explicitly set */}
        {selectedLocationPin && currentZoom >= 8 && (
          <Marker position={[selectedLocationPin.lat, selectedLocationPin.lng]} />
        )}
      </MapContainer>

      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetView}
        onBack={handleBackToStates}
        showBack={currentView === 'counties'}
      />

      {/* Population Legend */}
      <PopulationLegend
        colorScale={() => '#93c5fd'} // Simplified for now
        totalPopulation={totalPopulation}
        statePopData={statePopData}
        censusYear={getCurrentCensusYear()}
        currentView={currentView}
        selectedState={selectedState}
        countyPopData={countyPopData}
      />

      {/* Officials Legend */}
      <OfficialsLegend
        key={`officials-${selectedState || 'none'}`}
        currentView={currentView}
        selectedState={selectedState}
        statePopData={statePopData}
      />

      {/* Enhanced Hover Info */}
      {hoveredFeature && mousePosition && (
        <div
          className="fixed z-[2000] pointer-events-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 max-w-xs"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: mousePosition.x > window.innerWidth - 200 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {hoveredFeature.properties?.NAME || hoveredFeature.properties?.name}
          </div>
          {currentView === 'states' && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {(() => {
                const stateName = hoveredFeature.properties?.NAME || hoveredFeature.properties?.name
                const stateData = statePopData.find((s: any) => s.name === stateName)
                return stateData ? `Population: ${stateData.population.toLocaleString()}` : 'Loading...'
              })()}
            </div>
          )}
          {currentView === 'counties' && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {(() => {
                const countyName = hoveredFeature.properties?.NAME || hoveredFeature.properties?.name
                const countyData = countyPopData.find((c: any) => c.name === countyName)
                return countyData ? `Population: ${countyData.population.toLocaleString()}` : 'Loading...'
              })()}
            </div>
          )}
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Zoom: {currentZoom.toFixed(1)}x • Click to {currentView === 'states' ? 'explore counties' : 'select'}
          </div>
        </div>
      )}
    </div>
  )
}
