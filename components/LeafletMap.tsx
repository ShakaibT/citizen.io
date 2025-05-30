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
    // County view legend
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
      <div className="absolute left-2 sm:left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 max-w-[300px]" style={{ top: selectedState ? '400px' : 'auto', bottom: selectedState ? 'auto' : '16px' }}>
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
  // Expanded state officials data with more states
  const stateOfficials: { [key: string]: { governor: string; party: string; senators: Array<{name: string; party: string}> } } = {
    'Alabama': {
      governor: 'Kay Ivey',
      party: 'Republican',
      senators: [
        { name: 'Richard Shelby', party: 'Republican' },
        { name: 'Tommy Tuberville', party: 'Republican' }
      ]
    },
    'Alaska': {
      governor: 'Mike Dunleavy',
      party: 'Republican',
      senators: [
        { name: 'Lisa Murkowski', party: 'Republican' },
        { name: 'Dan Sullivan', party: 'Republican' }
      ]
    },
    'Arizona': {
      governor: 'Katie Hobbs',
      party: 'Democratic',
      senators: [
        { name: 'Kyrsten Sinema', party: 'Independent' },
        { name: 'Mark Kelly', party: 'Democratic' }
      ]
    },
    'Arkansas': {
      governor: 'Sarah Huckabee Sanders',
      party: 'Republican',
      senators: [
        { name: 'John Boozman', party: 'Republican' },
        { name: 'Tom Cotton', party: 'Republican' }
      ]
    },
    'California': {
      governor: 'Gavin Newsom',
      party: 'Democratic',
      senators: [
        { name: 'Dianne Feinstein', party: 'Democratic' },
        { name: 'Alex Padilla', party: 'Democratic' }
      ]
    },
    'Colorado': {
      governor: 'Jared Polis',
      party: 'Democratic',
      senators: [
        { name: 'Michael Bennet', party: 'Democratic' },
        { name: 'John Hickenlooper', party: 'Democratic' }
      ]
    },
    'Connecticut': {
      governor: 'Ned Lamont',
      party: 'Democratic',
      senators: [
        { name: 'Richard Blumenthal', party: 'Democratic' },
        { name: 'Chris Murphy', party: 'Democratic' }
      ]
    },
    'Delaware': {
      governor: 'John Carney',
      party: 'Democratic',
      senators: [
        { name: 'Tom Carper', party: 'Democratic' },
        { name: 'Chris Coons', party: 'Democratic' }
      ]
    },
    'Florida': {
      governor: 'Ron DeSantis',
      party: 'Republican',
      senators: [
        { name: 'Marco Rubio', party: 'Republican' },
        { name: 'Rick Scott', party: 'Republican' }
      ]
    },
    'Georgia': {
      governor: 'Brian Kemp',
      party: 'Republican',
      senators: [
        { name: 'Jon Ossoff', party: 'Democratic' },
        { name: 'Raphael Warnock', party: 'Democratic' }
      ]
    },
    'Hawaii': {
      governor: 'Josh Green',
      party: 'Democratic',
      senators: [
        { name: 'Brian Schatz', party: 'Democratic' },
        { name: 'Mazie Hirono', party: 'Democratic' }
      ]
    },
    'Idaho': {
      governor: 'Brad Little',
      party: 'Republican',
      senators: [
        { name: 'Mike Crapo', party: 'Republican' },
        { name: 'James Risch', party: 'Republican' }
      ]
    },
    'Illinois': {
      governor: 'J.B. Pritzker',
      party: 'Democratic',
      senators: [
        { name: 'Dick Durbin', party: 'Democratic' },
        { name: 'Tammy Duckworth', party: 'Democratic' }
      ]
    },
    'Indiana': {
      governor: 'Eric Holcomb',
      party: 'Republican',
      senators: [
        { name: 'Todd Young', party: 'Republican' },
        { name: 'Mike Braun', party: 'Republican' }
      ]
    },
    'Iowa': {
      governor: 'Kim Reynolds',
      party: 'Republican',
      senators: [
        { name: 'Chuck Grassley', party: 'Republican' },
        { name: 'Joni Ernst', party: 'Republican' }
      ]
    },
    'Kansas': {
      governor: 'Laura Kelly',
      party: 'Democratic',
      senators: [
        { name: 'Jerry Moran', party: 'Republican' },
        { name: 'Roger Marshall', party: 'Republican' }
      ]
    },
    'Kentucky': {
      governor: 'Andy Beshear',
      party: 'Democratic',
      senators: [
        { name: 'Mitch McConnell', party: 'Republican' },
        { name: 'Rand Paul', party: 'Republican' }
      ]
    },
    'Louisiana': {
      governor: 'John Bel Edwards',
      party: 'Democratic',
      senators: [
        { name: 'Bill Cassidy', party: 'Republican' },
        { name: 'John Kennedy', party: 'Republican' }
      ]
    },
    'Maine': {
      governor: 'Janet Mills',
      party: 'Democratic',
      senators: [
        { name: 'Susan Collins', party: 'Republican' },
        { name: 'Angus King', party: 'Independent' }
      ]
    },
    'Maryland': {
      governor: 'Wes Moore',
      party: 'Democratic',
      senators: [
        { name: 'Ben Cardin', party: 'Democratic' },
        { name: 'Chris Van Hollen', party: 'Democratic' }
      ]
    },
    'Massachusetts': {
      governor: 'Maura Healey',
      party: 'Democratic',
      senators: [
        { name: 'Elizabeth Warren', party: 'Democratic' },
        { name: 'Ed Markey', party: 'Democratic' }
      ]
    },
    'Michigan': {
      governor: 'Gretchen Whitmer',
      party: 'Democratic',
      senators: [
        { name: 'Debbie Stabenow', party: 'Democratic' },
        { name: 'Gary Peters', party: 'Democratic' }
      ]
    },
    'Minnesota': {
      governor: 'Tim Walz',
      party: 'Democratic',
      senators: [
        { name: 'Amy Klobuchar', party: 'Democratic' },
        { name: 'Tina Smith', party: 'Democratic' }
      ]
    },
    'Mississippi': {
      governor: 'Tate Reeves',
      party: 'Republican',
      senators: [
        { name: 'Roger Wicker', party: 'Republican' },
        { name: 'Cindy Hyde-Smith', party: 'Republican' }
      ]
    },
    'Missouri': {
      governor: 'Mike Parson',
      party: 'Republican',
      senators: [
        { name: 'Roy Blunt', party: 'Republican' },
        { name: 'Josh Hawley', party: 'Republican' }
      ]
    },
    'Montana': {
      governor: 'Greg Gianforte',
      party: 'Republican',
      senators: [
        { name: 'Jon Tester', party: 'Democratic' },
        { name: 'Steve Daines', party: 'Republican' }
      ]
    },
    'Nebraska': {
      governor: 'Pete Ricketts',
      party: 'Republican',
      senators: [
        { name: 'Deb Fischer', party: 'Republican' },
        { name: 'Ben Sasse', party: 'Republican' }
      ]
    },
    'Nevada': {
      governor: 'Joe Lombardo',
      party: 'Republican',
      senators: [
        { name: 'Catherine Cortez Masto', party: 'Democratic' },
        { name: 'Jacky Rosen', party: 'Democratic' }
      ]
    },
    'New Hampshire': {
      governor: 'Chris Sununu',
      party: 'Republican',
      senators: [
        { name: 'Jeanne Shaheen', party: 'Democratic' },
        { name: 'Maggie Hassan', party: 'Democratic' }
      ]
    },
    'New Jersey': {
      governor: 'Phil Murphy',
      party: 'Democratic',
      senators: [
        { name: 'Bob Menendez', party: 'Democratic' },
        { name: 'Cory Booker', party: 'Democratic' }
      ]
    },
    'New Mexico': {
      governor: 'Michelle Lujan Grisham',
      party: 'Democratic',
      senators: [
        { name: 'Martin Heinrich', party: 'Democratic' },
        { name: 'Ben Ray Luján', party: 'Democratic' }
      ]
    },
    'New York': {
      governor: 'Kathy Hochul',
      party: 'Democratic',
      senators: [
        { name: 'Chuck Schumer', party: 'Democratic' },
        { name: 'Kirsten Gillibrand', party: 'Democratic' }
      ]
    },
    'North Carolina': {
      governor: 'Roy Cooper',
      party: 'Democratic',
      senators: [
        { name: 'Richard Burr', party: 'Republican' },
        { name: 'Thom Tillis', party: 'Republican' }
      ]
    },
    'North Dakota': {
      governor: 'Doug Burgum',
      party: 'Republican',
      senators: [
        { name: 'John Hoeven', party: 'Republican' },
        { name: 'Kevin Cramer', party: 'Republican' }
      ]
    },
    'Ohio': {
      governor: 'Mike DeWine',
      party: 'Republican',
      senators: [
        { name: 'Sherrod Brown', party: 'Democratic' },
        { name: 'J.D. Vance', party: 'Republican' }
      ]
    },
    'Oklahoma': {
      governor: 'Kevin Stitt',
      party: 'Republican',
      senators: [
        { name: 'James Lankford', party: 'Republican' },
        { name: 'Markwayne Mullin', party: 'Republican' }
      ]
    },
    'Oregon': {
      governor: 'Tina Kotek',
      party: 'Democratic',
      senators: [
        { name: 'Ron Wyden', party: 'Democratic' },
        { name: 'Jeff Merkley', party: 'Democratic' }
      ]
    },
    'Pennsylvania': {
      governor: 'Josh Shapiro',
      party: 'Democratic',
      senators: [
        { name: 'Bob Casey Jr.', party: 'Democratic' },
        { name: 'John Fetterman', party: 'Democratic' }
      ]
    },
    'Rhode Island': {
      governor: 'Dan McKee',
      party: 'Democratic',
      senators: [
        { name: 'Jack Reed', party: 'Democratic' },
        { name: 'Sheldon Whitehouse', party: 'Democratic' }
      ]
    },
    'South Carolina': {
      governor: 'Henry McMaster',
      party: 'Republican',
      senators: [
        { name: 'Lindsey Graham', party: 'Republican' },
        { name: 'Tim Scott', party: 'Republican' }
      ]
    },
    'South Dakota': {
      governor: 'Kristi Noem',
      party: 'Republican',
      senators: [
        { name: 'John Thune', party: 'Republican' },
        { name: 'Mike Rounds', party: 'Republican' }
      ]
    },
    'Tennessee': {
      governor: 'Bill Lee',
      party: 'Republican',
      senators: [
        { name: 'Marsha Blackburn', party: 'Republican' },
        { name: 'Bill Hagerty', party: 'Republican' }
      ]
    },
    'Texas': {
      governor: 'Greg Abbott',
      party: 'Republican',
      senators: [
        { name: 'John Cornyn', party: 'Republican' },
        { name: 'Ted Cruz', party: 'Republican' }
      ]
    },
    'Utah': {
      governor: 'Spencer Cox',
      party: 'Republican',
      senators: [
        { name: 'Mike Lee', party: 'Republican' },
        { name: 'Mitt Romney', party: 'Republican' }
      ]
    },
    'Vermont': {
      governor: 'Phil Scott',
      party: 'Republican',
      senators: [
        { name: 'Patrick Leahy', party: 'Democratic' },
        { name: 'Bernie Sanders', party: 'Independent' }
      ]
    },
    'Virginia': {
      governor: 'Glenn Youngkin',
      party: 'Republican',
      senators: [
        { name: 'Mark Warner', party: 'Democratic' },
        { name: 'Tim Kaine', party: 'Democratic' }
      ]
    },
    'Washington': {
      governor: 'Jay Inslee',
      party: 'Democratic',
      senators: [
        { name: 'Patty Murray', party: 'Democratic' },
        { name: 'Maria Cantwell', party: 'Democratic' }
      ]
    },
    'West Virginia': {
      governor: 'Jim Justice',
      party: 'Republican',
      senators: [
        { name: 'Joe Manchin', party: 'Democratic' },
        { name: 'Shelley Moore Capito', party: 'Republican' }
      ]
    },
    'Wisconsin': {
      governor: 'Tony Evers',
      party: 'Democratic',
      senators: [
        { name: 'Ron Johnson', party: 'Republican' },
        { name: 'Tammy Baldwin', party: 'Democratic' }
      ]
    },
    'Wyoming': {
      governor: 'Mark Gordon',
      party: 'Republican',
      senators: [
        { name: 'John Barrasso', party: 'Republican' },
        { name: 'Cynthia Lummis', party: 'Republican' }
      ]
    }
  }

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
    const officials = stateOfficials[selectedState]
    
    if (!officials) {
      return null // Don't show legend if no officials data available
    }

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
          
          {/* Governor */}
          <div className="space-y-2.5">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Governor</div>
            <div className="flex items-center space-x-3">
              <div 
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: getPartyColor(officials.party) }}
              />
              <div className="flex-1">
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  {officials.governor}
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: getPartyColor(officials.party) }}
                  >
                    {getPartyAbbr(officials.party)}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {officials.party}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Senators */}
          <div className="space-y-2.5 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Senators</div>
            <div className="space-y-3.5">
              {officials.senators.map((senator, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <div 
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: getPartyColor(senator.party) }}
                  />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                      {senator.name}
                    </div>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: getPartyColor(senator.party) }}
                      >
                        {getPartyAbbr(senator.party)}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {senator.party}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
  const [hoveredFeature, setHoveredFeature] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedOcdId, setSelectedOcdId] = useState<string | null>(null)
  const [enhancedStateData, setEnhancedStateData] = useState<any[]>([])
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null)

  // Fetch population data
  const { statePopData, totalPopulation, isLoading: popLoading, error: popError } = usePopulationData()
  const { countyPopData, isLoading: countyLoading, error: countyError } = useCountyPopulationData(selectedState || undefined)
  const selectedStateFips = useMemo(() => {
    if (!selectedState) return undefined
    const state = statePopData.find(s => s.name === selectedState)
    return state?.fips
  }, [selectedState, statePopData])

  const { data: officialsData } = useOfficialsData(selectedOcdId)

  // Load enhanced state data with county counts
  useEffect(() => {
    const loadEnhancedStateData = async () => {
      try {
        const response = await fetch('/api/census/states?includeCounties=true')
        if (response.ok) {
          const data = await response.json()
          setEnhancedStateData(data)
        }
      } catch (error) {
        console.error('Error loading enhanced state data:', error)
      }
    }

    loadEnhancedStateData()
  }, [])

  // Create color scale for population
  const colorScale = useMemo(() => {
    if (!statePopData || statePopData.length === 0) {
      // Return a more visible default color instead of gray when data is loading
      return () => '#93c5fd' // Light blue instead of gray
    }
    
    // Define the color scale to match the legend ranges
    return (population: number) => {
      if (population < 1000000) return '#dbeafe'        // <1M - lightest blue
      if (population < 3000000) return '#bfdbfe'        // 1M-3M
      if (population < 5000000) return '#93c5fd'        // 3M-5M  
      if (population < 10000000) return '#60a5fa'       // 5M-10M
      if (population < 20000000) return '#3b82f6'       // 10M-20M
      return '#2563eb'                                  // >20M - darkest blue
    }
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

  // Load counties data when state is selected
  useEffect(() => {
    if (selectedState && selectedStateFips) {
      const loadCountiesData = async () => {
        try {
          const response = await fetch(`/api/counties-geojson?state=${encodeURIComponent(selectedState)}`)
          if (!response.ok) {
            throw new Error(`Failed to load counties data: ${response.status}`)
          }
          const data = await response.json()
          setCountiesData(data)
          setCurrentView('counties')
          // Clear selected county when switching states
          setSelectedCounty(null)
        } catch (error) {
          console.error('Error loading counties data:', error)
          if (onError) {
            onError('Failed to load county data')
          }
        }
      }

      loadCountiesData()
    }
  }, [selectedState, selectedStateFips, onError])

  // Clear hover state when view changes
  useEffect(() => {
    setHoveredFeature(null)
    // Clear selected county when going back to states view
    if (currentView === 'states') {
      setSelectedCounty(null)
    }
  }, [currentView])

  // Handle zoom to location with smooth animation - DISABLED
  // This was causing unwanted street-level zooming when clicking states/counties
  useEffect(() => {
    // Disabled to prevent automatic zooming behavior
    // if (zoomToLocation && mapRef.current) {
    //   const { lat, lng, zoom = 12 } = zoomToLocation
    //   mapRef.current.flyTo([lat, lng], zoom, {
    //     duration: 1.0,
    //     easeLinearity: 0.1
    //   })
    // }
  }, [zoomToLocation])

  // Handle state click
  const handleStateClick = useCallback((feature: StateFeature) => {
    const stateName = feature.properties.NAME
    onStateClick?.(stateName)
    
    if (mode === 'dashboard') {
      const ocdId = `ocd-division/country:us/state:${stateName.toLowerCase().replace(/\s+/g, '_')}`
      setSelectedOcdId(ocdId)
      setDrawerOpen(true)
    }
  }, [onStateClick, mode])

  // Handle county click
  const handleCountyClick = useCallback((feature: CountyFeature) => {
    const countyName = feature.properties.NAME
    onCountyClick?.(countyName, selectedState || '')
  }, [onCountyClick, selectedState])

  // Handle feature hover
  const handleFeatureHover = useCallback((feature: any, event?: L.LeafletMouseEvent) => {
    if (event) {
      setMousePosition({ x: event.originalEvent.clientX, y: event.originalEvent.clientY })
    }
    setHoveredFeature(feature)
    onHover?.(feature)
  }, [onHover])

  // Map controls handlers
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
      mapRef.current.flyToBounds([
        [24.396308, -125.0],
        [49.384358, -66.93]
      ], { 
        duration: 0.8,
        easeLinearity: 0.1,
        padding: [20, 20]
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

  // Style functions - improved to handle different property names
  const getStateStyle = useCallback((feature: any) => {
    const stateName = feature.properties?.NAME || feature.properties?.name
    const stateData = statePopData.find(s => s.name === stateName)
    const population = stateData?.population || 0
    
    return {
      fillColor: colorScale(population),
      weight: 2,
      opacity: 1,
      color: '#64748b',
      fillOpacity: 0.8, // Increased opacity to make colors more visible
      cursor: 'pointer'
    }
  }, [statePopData, colorScale])

  const getCountyStyle = useCallback((feature: any) => {
    const countyName = feature.properties?.NAME || feature.properties?.name
    const countyData = countyPopData.find(c => c.name === countyName)
    const population = countyData?.population || 0
    
    // Calculate population density (people per square mile)
    // We'll need to estimate area or use a density calculation
    // For now, we'll use population ranges similar to states but scaled for counties
    const getCountyColor = (pop: number) => {
      if (pop < 5000) return '#f0f9ff'        // <5K - very light blue
      if (pop < 15000) return '#e0f2fe'       // 5K-15K
      if (pop < 50000) return '#bae6fd'       // 15K-50K
      if (pop < 100000) return '#7dd3fc'      // 50K-100K
      if (pop < 250000) return '#38bdf8'      // 100K-250K
      if (pop < 500000) return '#0ea5e9'      // 250K-500K
      return '#0284c7'                        // >500K - darkest blue
    }
    
    // Check if this county is selected
    const isSelected = selectedCounty === countyName
    
    return {
      fillColor: getCountyColor(population),
      weight: isSelected ? 3 : 1.5, // Thicker border for selected county
      opacity: 1,
      color: isSelected ? '#1e40af' : '#64748b', // Blue border for selected, gray for others
      fillOpacity: isSelected ? 0.9 : 0.7, // Higher opacity for selected
      cursor: 'pointer'
    }
  }, [countyPopData, selectedCounty])

  // Event handlers for states
  const onEachStateFeature = useCallback((feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        // Only show hover if we're in states view
        if (currentView !== 'states') return
        
        const layer = e.target
        const stateName = feature.properties?.NAME || feature.properties?.name
        const stateData = statePopData.find(s => s.name === stateName)
        const population = stateData?.population || 0
        const originalFillColor = colorScale(population)
        
        layer.setStyle({
          fillColor: originalFillColor, // Use the calculated color directly
          weight: 4,
          opacity: 1,
          color: '#1e40af',
          fillOpacity: 0.9,
          cursor: 'pointer'
        })
        
        // Bring to front
        if (layer.bringToFront) {
          layer.bringToFront()
        }
        
        setHoveredFeature(feature)
        setMousePosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
        
        if (onHover) {
          onHover(feature)
        }
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const layer = e.target
        // Reset to original style
        layer.setStyle(getStateStyle(feature))
        setHoveredFeature(null)
      },
      mousemove: (e: L.LeafletMouseEvent) => {
        // Only update position if we're in states view
        if (currentView === 'states') {
          setMousePosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
        }
      },
      click: (e: L.LeafletMouseEvent) => {
        const stateName = feature.properties?.NAME || feature.properties?.name
        
        // Clear hover state immediately when clicking
        setHoveredFeature(null)
        
        if (stateName && onStateClick) {
          onStateClick(stateName)
          setCurrentView('counties')
          
          // Zoom to state bounds to show the state overview with counties
          const layer = e.target
          if (mapRef.current && layer.getBounds) {
            mapRef.current.flyToBounds(layer.getBounds(), { 
              padding: [30, 30],
              duration: 0.8,
              easeLinearity: 0.1
            })
          }
        }
      }
    })
  }, [getStateStyle, onStateClick, onHover, currentView, statePopData, colorScale])

  // Event handlers for counties
  const onEachCountyFeature = useCallback((feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        // Only show hover if we're in counties view
        if (currentView !== 'counties') return
        
        const layer = e.target
        const countyName = feature.properties?.NAME || feature.properties?.name
        const countyData = countyPopData.find(c => c.name === countyName)
        const population = countyData?.population || 0
        
        // Calculate county color directly
        const getCountyColor = (pop: number) => {
          if (pop < 5000) return '#f0f9ff'        // <5K - very light blue
          if (pop < 15000) return '#e0f2fe'       // 5K-15K
          if (pop < 50000) return '#bae6fd'       // 15K-50K
          if (pop < 100000) return '#7dd3fc'      // 50K-100K
          if (pop < 250000) return '#38bdf8'      // 100K-250K
          if (pop < 500000) return '#0ea5e9'      // 250K-500K
          return '#0284c7'                        // >500K - darkest blue
        }
        
        const originalFillColor = getCountyColor(population)
        const isSelected = selectedCounty === countyName
        
        layer.setStyle({
          fillColor: originalFillColor, // Use the calculated color directly
          weight: 4,
          opacity: 1,
          color: '#1e40af',
          fillOpacity: 0.95,
          cursor: 'pointer'
        })
        
        if (layer.bringToFront) {
          layer.bringToFront()
        }
        
        setHoveredFeature(feature)
        setMousePosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const layer = e.target
        // Reset to original style
        layer.setStyle(getCountyStyle(feature))
        setHoveredFeature(null)
      },
      mousemove: (e: L.LeafletMouseEvent) => {
        // Only update position if we're in counties view
        if (currentView === 'counties') {
          setMousePosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
        }
      },
      click: (e: L.LeafletMouseEvent) => {
        const countyName = feature.properties?.NAME
        if (countyName && selectedState) {
          // Set the selected county
          setSelectedCounty(countyName)
          
          // Clear hover state
          setHoveredFeature(null)
          
          // Call the callback if provided - this will navigate to the next page
          if (onCountyClick) {
            onCountyClick(countyName, selectedState)
          }
          
          // Remove zoom behavior - just call the callback without zooming
          // This allows the parent component to handle navigation
        }
      }
    })
  }, [getCountyStyle, onCountyClick, selectedState, currentView, countyPopData, selectedCounty])

  // Get representatives data for counties
  const getCountyReps = (stateName: string, countyName: string) => {
    return countyHouseReps[stateName]?.[countyName] || []
  }

  const mapHeight = fullHeight 
    ? 'h-screen' 
    : mode === 'dashboard' 
      ? 'h-[60vh] sm:h-[65vh] lg:h-[70vh]' 
      : 'h-[50vh] sm:h-[55vh] lg:h-[60vh] xl:h-[65vh]'
  
  // US bounds for limiting zoom out - expanded to include Alaska and Hawaii
  const usBounds: L.LatLngBoundsExpression = [
    [15.0, -180.0], // Southwest corner (includes Hawaii and western Alaska)
    [72.0, -60.0]   // Northeast corner (includes northern Alaska)
  ]
  
  return (
    <div className={`relative ${mapHeight} ${className}`}>
      <MapContainer
        ref={(map) => {
          if (map) {
            mapRef.current = map
            
            // Implement smooth wheel zoom
            setTimeout(() => {
              if (map.scrollWheelZoom) {
                // Disable default scroll wheel zoom
                map.scrollWheelZoom.disable()
                
                // Add custom smooth wheel zoom handler
                let isWheeling = false
                let wheelMousePosition: L.Point
                let centerPoint: L.Point
                let startLatLng: L.LatLng
                let wheelStartLatLng: L.LatLng
                let startZoom: number
                let goalZoom: number
                let prevCenter: L.LatLng
                let prevZoom: number
                let zoomAnimationId: number
                let timeoutId: NodeJS.Timeout
                
                const onWheelScroll = (e: WheelEvent) => {
                  e.preventDefault()
                  
                  if (!isWheeling) {
                    // Start wheeling
                    isWheeling = true
                    wheelMousePosition = map.mouseEventToContainerPoint(e as any)
                    centerPoint = map.getSize().divideBy(2)
                    startLatLng = map.containerPointToLatLng(centerPoint)
                    wheelStartLatLng = map.containerPointToLatLng(wheelMousePosition)
                    startZoom = map.getZoom()
                    goalZoom = map.getZoom()
                    prevCenter = map.getCenter()
                    prevZoom = map.getZoom()
                    
                    map.stop()
                    if ((map as any)._panAnim) (map as any)._panAnim.stop()
                    
                    zoomAnimationId = requestAnimationFrame(updateWheelZoom)
                  }
                  
                  // Update goal zoom
                  goalZoom = goalZoom - e.deltaY * 0.003 * 1.5 // sensitivity
                  goalZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), goalZoom))
                  wheelMousePosition = map.mouseEventToContainerPoint(e as any)
                  
                  clearTimeout(timeoutId)
                  timeoutId = setTimeout(() => {
                    isWheeling = false
                    cancelAnimationFrame(zoomAnimationId)
                  }, 200)
                }
                
                const updateWheelZoom = () => {
                  if ((!map.getCenter().equals(prevCenter)) || map.getZoom() !== prevZoom) return
                  
                  const currentZoom = map.getZoom() + (goalZoom - map.getZoom()) * 0.3
                  const zoom = Math.floor(currentZoom * 100) / 100
                  const delta = wheelMousePosition.subtract(centerPoint)
                  
                  if (delta.x === 0 && delta.y === 0) return
                  
                  const center = map.unproject(map.project(wheelStartLatLng, zoom).subtract(delta), zoom)
                  
                  map.setView(center, zoom, { animate: false })
                  
                  prevCenter = map.getCenter()
                  prevZoom = map.getZoom()
                  
                  if (isWheeling) {
                    zoomAnimationId = requestAnimationFrame(updateWheelZoom)
                  }
                }
                
                // Add wheel event listener
                map.getContainer().addEventListener('wheel', onWheelScroll, { passive: false })
              }
            }, 100)
          }
        }}
        center={[39.8283, -98.5795]}
        zoom={4}
        minZoom={3}
        maxZoom={10}
        maxBounds={usBounds}
        maxBoundsViscosity={0.3}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        zoomSnap={0.1}
        zoomDelta={0.3}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        inertia={true}
        inertiaDeceleration={2000}
        inertiaMaxSpeed={1000}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* States layer */}
        {currentView === 'states' && statesData && (
          <GeoJSON
            key="states"
            data={statesData}
            style={getStateStyle}
            onEachFeature={onEachStateFeature}
          />
        )}
        
        {/* Counties layer */}
        {currentView === 'counties' && countiesData && (
          <GeoJSON
            key="counties"
            data={countiesData}
            style={getCountyStyle}
            onEachFeature={onEachCountyFeature}
          />
        )}
        
        {/* Selected location pin - DISABLED */}
        {/* Disabled to prevent pins from appearing when clicking states/counties */}
        {/* {selectedLocationPin && (
          <Marker position={[selectedLocationPin.lat, selectedLocationPin.lng]} />
        )} */}
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
        colorScale={colorScale}
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

      {/* Hover Info */}
      {hoveredFeature && (
        <HoverInfo
          feature={hoveredFeature}
          position={mousePosition}
          statePopData={statePopData || []}
          countyPopData={countyPopData || []}
          enhancedStateData={enhancedStateData}
          currentView={currentView}
          selectedState={selectedState}
          getCountyReps={getCountyReps}
        />
      )}

      {/* Dashboard Drawer */}
      {mode === 'dashboard' && (
        <DashboardDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          officials={officialsData.officials}
          stateName={selectedState || ''}
        />
      )}

      {/* ARIA Live Region for accessibility */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {hoveredFeature && (
          `${hoveredFeature.name}: ${hoveredFeature.population?.toLocaleString() || 'N/A'} people, ${hoveredFeature.density?.toFixed(1) || 'N/A'} people per square mile`
        )}
      </div>
    </div>
  )
}
