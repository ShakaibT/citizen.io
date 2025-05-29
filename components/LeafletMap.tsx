"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import { scaleQuantize } from 'd3-scale'
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePopulationData, useCountyPopulationData } from '@/hooks/usePopulationData'
import { useOfficialsData } from '@/hooks/useOfficialsData'

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
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      {showBack && (
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
          aria-label="Back to states"
          tabIndex={0}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomIn}
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
        aria-label="Zoom in"
        tabIndex={0}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomOut}
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
        aria-label="Zoom out"
        tabIndex={0}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onReset}
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800"
        aria-label="Reset view"
        tabIndex={0}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Legend component with population ranges
function Legend({ 
  colorScale, 
  totalPopulation,
  statePopData 
}: { 
  colorScale: (value: number) => string
  totalPopulation: number
  statePopData: any[]
}) {
  // Simplified population ranges for cleaner legend
  const populationRanges = [
    { min: 0, max: 1000000, label: '<1M' },
    { min: 1000000, max: 3000000, label: '1M-3M' },
    { min: 3000000, max: 5000000, label: '3M-5M' },
    { min: 5000000, max: 10000000, label: '5M-10M' },
    { min: 10000000, max: 20000000, label: '10M-20M' },
    { min: 20000000, max: 50000000, label: '>20M' }
  ]

  const formatPopulation = (num: number): string => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  return (
    <div className="absolute bottom-12 left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3 max-w-[200px]">
      <div className="space-y-2">
        <div className="text-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">US Population</h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {formatPopulation(totalPopulation)}
          </div>
        </div>
        
        <div className="space-y-1">
          {populationRanges.map((range, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-sm border border-gray-300 dark:border-gray-600 flex-shrink-0"
                style={{ backgroundColor: colorScale((range.min + range.max) / 2) }}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {range.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Hover info component
function HoverInfo({ 
  feature, 
  position, 
  statePopData, 
  countyPopData,
  enhancedStateData 
}: { 
  feature: any
  position: { x: number; y: number }
  statePopData: any[]
  countyPopData: any[]
  enhancedStateData: any[]
}) {
  if (!feature) return null

  const isState = feature.properties?.NAME && !feature.properties?.COUNTYFP
  const name = feature.properties?.NAME || feature.properties?.name
  
  let populationData
  let enhancedData
  if (isState) {
    populationData = statePopData.find(s => s.name === name)
    enhancedData = enhancedStateData.find(s => s.name === name)
  } else {
    populationData = countyPopData.find(c => c.name === name)
  }

  const formatPopulation = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Get representatives data for states
  const representatives = isState ? stateRepresentatives[name] : null

  // Current year for data display - dynamically determined
  const getCurrentCensusYear = () => {
    const currentYear = new Date().getFullYear()
    // Census data is typically released with a 1-year delay
    return currentYear >= 2024 ? 2024 : 2023
  }
  const currentYear = getCurrentCensusYear()

  // Debug logging to see what data we have
  if (isState) {
    console.log('HoverInfo Debug:', {
      stateName: name,
      populationData,
      enhancedData,
      representatives,
      enhancedStateDataLength: enhancedStateData.length
    })
  }

  return (
    <div 
      className="fixed bg-white/98 backdrop-blur-md border border-gray-300 rounded-xl p-4 shadow-2xl z-[1001] pointer-events-none max-w-sm"
      style={{
        left: position.x + 15,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="font-bold text-base text-black mb-2">{name}</div>
      
      {isState ? (
        <div className="space-y-2 text-sm">
          <div className="text-xs text-gray-700 font-semibold mb-2">
            {currentYear} Census Data
          </div>
          
          {(populationData?.population || enhancedData?.population) && (
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Population:</span>
              <span className="font-bold text-black">{formatPopulation(populationData?.population || enhancedData?.population || 0)}</span>
            </div>
          )}
          
          {enhancedData?.countyCount && (
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Counties:</span>
              <span className="font-bold text-black">{enhancedData.countyCount}</span>
            </div>
          )}
          
          {representatives && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-800 font-medium">House Reps:</span>
                <span className="font-bold text-black">{representatives.house}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-800 font-medium">Senators:</span>
                <span className="font-bold text-black">{representatives.senate}</span>
              </div>
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-300">
            <div className="text-xs text-blue-700 font-semibold">
              Click to view counties →
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="text-xs text-gray-700 font-semibold mb-2">
            {currentYear} Census Data
          </div>
          
          {populationData && (
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Population:</span>
              <span className="font-bold text-black">{formatPopulation(populationData.population)}</span>
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-300">
            <div className="text-xs text-gray-700 font-medium">
              County in {feature.properties?.STATEFP ? 'State' : 'Unknown State'}
            </div>
          </div>
        </div>
      )}
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
  onHover
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
      return () => '#e2e8f0'
    }
    
    const populations = statePopData.map(d => d.population)
    const maxPopulation = Math.max(...populations)
    const minPopulation = Math.min(...populations)
    
    console.log('Population range:', { min: minPopulation, max: maxPopulation, count: populations.length }) // Debug log
    
    // Use patriot blue with progressive darkening (lighter darkest blue)
    const scale = scaleQuantize<string>()
      .domain([minPopulation, maxPopulation])
      .range([
        '#dbeafe', // lightest patriot blue (patriot-blue-100)
        '#bfdbfe', // patriot-blue-200 
        '#93c5fd', // patriot-blue-300
        '#60a5fa', // patriot-blue-400
        '#3b82f6', // patriot-blue-500
        '#2563eb'  // lighter darkest blue (patriot-blue-600)
      ])
    
    // Test the scale with some known values
    console.log('Color scale test:', {
      california: scale(39000000),
      texas: scale(30000000),
      wyoming: scale(600000),
      vermont: scale(650000)
    })
    
    return scale
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

  // Handle zoom to location with smooth animation
  useEffect(() => {
    if (zoomToLocation && mapRef.current) {
      const { lat, lng, zoom = 12 } = zoomToLocation
      mapRef.current.flyTo([lat, lng], zoom, {
        duration: 1.0,
        easeLinearity: 0.1
      })
    }
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
    setDrawerOpen(false)
    onReset?.()
  }, [onReset])

  const handleBackToStates = useCallback(() => {
    setCurrentView('states')
    setCountiesData(null)
    setDrawerOpen(false)
    handleResetView()
  }, [handleResetView])

  // Style functions - improved to handle different property names
  const getStateStyle = useCallback((feature: any) => {
    const stateName = feature.properties?.NAME || feature.properties?.name
    const stateData = statePopData.find(s => s.name === stateName)
    const population = stateData?.population || 0
    
    console.log('Styling state:', stateName, 'Population:', population, 'Color:', colorScale(population)) // Debug log
    
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
    
    return {
      fillColor: colorScale(population),
      weight: 1,
      opacity: 1,
      color: '#94a3b8',
      fillOpacity: 0.7, // Increased opacity for counties too
      cursor: 'pointer'
    }
  }, [countyPopData, colorScale])

  // Event handlers for states
  const onEachStateFeature = useCallback((feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const layer = e.target
        layer.setStyle({
          weight: 4,
          color: '#1e40af',
          fillOpacity: 0.9,
          transform: 'scale(1.05)'
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
        layer.setStyle(getStateStyle(feature))
        setHoveredFeature(null)
      },
      mousemove: (e: L.LeafletMouseEvent) => {
        setMousePosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
      },
      click: (e: L.LeafletMouseEvent) => {
        const stateName = feature.properties?.NAME || feature.properties?.name
        console.log('State clicked:', stateName) // Debug log
        if (stateName && onStateClick) {
          onStateClick(stateName)
          setCurrentView('counties')
          
          // Zoom to state bounds with smooth animation
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
  }, [getStateStyle, onStateClick, onHover])

  // Event handlers for counties
  const onEachCountyFeature = useCallback((feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        const layer = e.target
        layer.setStyle({
          weight: 3,
          color: '#1e40af',
          fillOpacity: 0.9
        })
        
        if (layer.bringToFront) {
          layer.bringToFront()
        }
        
        setHoveredFeature(feature)
        setMousePosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const layer = e.target
        layer.setStyle(getCountyStyle(feature))
        setHoveredFeature(null)
      },
      mousemove: (e: L.LeafletMouseEvent) => {
        setMousePosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
      },
      click: (e: L.LeafletMouseEvent) => {
        const countyName = feature.properties?.NAME
        if (countyName && selectedState && onCountyClick) {
          onCountyClick(countyName, selectedState)
        }
      }
    })
  }, [getCountyStyle, onCountyClick, selectedState])

  const mapHeight = mode === 'dashboard' ? 'h-[600px]' : 'h-[500px]'
  
  // US bounds for limiting zoom out
  const usBounds: L.LatLngBoundsExpression = [
    [20.0, -130.0], // Southwest corner (includes Hawaii and Alaska)
    [50.0, -60.0]   // Northeast corner
  ]
  
  return (
    <div className={`relative ${mapHeight} ${className}`}>
      <MapContainer
        ref={(map) => {
          if (map) {
            mapRef.current = map
            
            // Set up zoom event handlers for smooth animations
            map.on('zoomstart', () => {
              // Add smooth transition class
              const container = map.getContainer()
              container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            })
            
            map.on('zoomend', () => {
              // Remove transition class after zoom completes
              const container = map.getContainer()
              container.style.transition = ''
            })
          }
        }}
        center={[39.8283, -98.5795]}
        zoom={4}
        minZoom={3}
        maxZoom={10}
        maxBounds={usBounds}
        maxBoundsViscosity={0.8}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        zoomSnap={0.25}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={60}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        inertia={true}
        inertiaDeceleration={3000}
        inertiaMaxSpeed={1500}
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
        
        {/* State centroid pin for county view */}
        {currentView === 'counties' && selectedState && stateCentroids[selectedState] && (
          <Marker position={stateCentroids[selectedState]} />
        )}
        
        {/* Selected location pin */}
        {selectedLocationPin && (
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

      {/* Legend */}
      <Legend 
        colorScale={colorScale}
        totalPopulation={totalPopulation}
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
