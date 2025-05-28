"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ZoomIn, ZoomOut, RefreshCw } from "lucide-react"

interface ModernUSMapProps {
  onStateClick?: (state: string) => void
  onCountyClick?: (county: string, state: string) => void
  selectedState?: string
  selectedLocationPin?: { lat: number; lng: number; address: string } | null
  className?: string
}

interface GeoJSONFeature {
  type: string
  properties: {
    name: string
    abbreviation?: string
    population?: number
    area_sq_miles?: number
  }
  geometry: {
    type: string
    coordinates: any[]
  }
}

export function USMap({ onStateClick, onCountyClick, selectedState, selectedLocationPin, className = "" }: ModernUSMapProps) {
  const [statesData, setStatesData] = useState<any>(null)
  const [countiesData, setCountiesData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState("0 0 1000 600")
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [hoveredFeature, setHoveredFeature] = useState<GeoJSONFeature | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Fetch states data
  useEffect(() => {
    async function fetchStatesData() {
      try {
        setLoading(true)
        const response = await fetch("/api/states-geojson")
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || `Failed to fetch states data: ${response.statusText}`)
        }
        const data = await response.json()
        
        // Validate GeoJSON data
        if (!data || !data.features || !Array.isArray(data.features)) {
          throw new Error("Invalid GeoJSON data format")
        }

        // Validate each feature
        const validFeatures = data.features.filter((feature: any) => {
          return feature && 
                 feature.type === "Feature" && 
                 feature.properties && 
                 feature.geometry && 
                 feature.geometry.coordinates
        })

        if (validFeatures.length === 0) {
          throw new Error("No valid state features found in the data")
        }

        setStatesData({ ...data, features: validFeatures })
        setError(null)
      } catch (err) {
        console.error("Error fetching states data:", err)
        setError(err instanceof Error ? err.message : "Failed to load map data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchStatesData()
  }, [])

  // Fetch counties data when a state is selected
  useEffect(() => {
    if (!currentState) {
      setCountiesData(null)
      return
    }

    async function fetchCountiesData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/counties-geojson?state=${currentState}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || `Failed to fetch counties data: ${response.statusText}`)
        }
        const data = await response.json()

        // Validate GeoJSON data
        if (!data || !data.features || !Array.isArray(data.features)) {
          throw new Error("Invalid GeoJSON data format")
        }

        // Validate each feature
        const validFeatures = data.features.filter((feature: any) => {
          return feature && 
                 feature.type === "Feature" && 
                 feature.properties && 
                 feature.geometry && 
                 feature.geometry.coordinates
        })

        if (validFeatures.length === 0) {
          throw new Error(`No valid county features found for state ${currentState}`)
        }

        setCountiesData({ ...data, features: validFeatures })
        setError(null)
      } catch (err) {
        console.error("Error fetching counties data:", err)
        setError(err instanceof Error ? err.message : "Failed to load county data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchCountiesData()
  }, [currentState])

  // Update current state when selectedState prop changes
  useEffect(() => {
    if (selectedState && selectedState !== currentState) {
      setCurrentState(selectedState)
    }
  }, [selectedState])

  // Convert GeoJSON coordinates to SVG path
  const geoJSONToSVGPath = (coordinates: any, type: string) => {
    if (type === "Polygon") {
      return (
        coordinates[0]
          .map((coord: number[], i: number) => {
            // Scale coordinates to fit SVG viewBox
            const x = (coord[0] + 125) * 10 + panOffset.x
            const y = (50 - coord[1]) * 10 + panOffset.y
            return `${i === 0 ? "M" : "L"}${x},${y}`
          })
          .join(" ") + "Z"
      )
    } else if (type === "MultiPolygon") {
      return coordinates
        .map((polygon: any) => {
          return (
            polygon[0]
              .map((coord: number[], i: number) => {
                const x = (coord[0] + 125) * 10 + panOffset.x
                const y = (50 - coord[1]) * 10 + panOffset.y
                return `${i === 0 ? "M" : "L"}${x},${y}`
              })
              .join(" ") + "Z"
          )
        })
        .join(" ")
    }
    return ""
  }

  // Handle state click
  const handleStateClick = (feature: GeoJSONFeature) => {
    const stateAbbr = feature.properties.abbreviation
    setCurrentState(stateAbbr || null)

    // Find the state's bounding box to zoom to it
    const coordinates = feature.geometry.coordinates[0]
    const lngs = coordinates.map((coord: number[]) => coord[0])
    const lats = coordinates.map((coord: number[]) => coord[1])

    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    // Calculate center point
    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2

    // Set zoom and pan to focus on the state
    setZoomLevel(3)
    setPanOffset({
      x: -((centerLng + 125) * 10 - 500),
      y: -((50 - centerLat) * 10 - 300),
    })

    if (onStateClick) {
      onStateClick(feature.properties.name)
    }
  }

  // Handle county click
  const handleCountyClick = (feature: GeoJSONFeature) => {
    if (onCountyClick && currentState) {
      onCountyClick(feature.properties.name, currentState)
    }
  }

  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 10))
  }

  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 0.5))
  }

  // Handle reset view
  const handleResetView = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    setCurrentState(null)
    setCountiesData(null)
  }

  // Handle retry - for when there's an error
  const handleRetry = () => {
    setError(null)
    setLoading(true)
    
    // Retry fetching states data
    async function retryFetchStatesData() {
      try {
        const response = await fetch("/api/states-geojson")
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || `Failed to fetch states data: ${response.statusText}`)
        }
        const data = await response.json()
        
        if (!data || !data.features || !Array.isArray(data.features)) {
          throw new Error("Invalid GeoJSON data format")
        }

        const validFeatures = data.features.filter((feature: any) => {
          return feature && 
                 feature.type === "Feature" && 
                 feature.properties && 
                 feature.geometry && 
                 feature.geometry.coordinates
        })

        if (validFeatures.length === 0) {
          throw new Error("No valid state features found in the data")
        }

        setStatesData({ ...data, features: validFeatures })
        setError(null)
      } catch (err) {
        console.error("Error retrying states data:", err)
        setError(err instanceof Error ? err.message : "Failed to load map data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    retryFetchStatesData()
  }

  // Handle back to states view
  const handleBackToStates = () => {
    setCurrentState(null)
    setCountiesData(null)
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  // Get fill color based on population density
  const getDensityColor = (population: number, area: number) => {
    if (!population || !area || area === 0) return "#f0f0f0"; // Default light gray for no data or zero area
    const density = population / area;
    if (density < 50) return "#f0f0f0"; // Very light gray
    if (density < 200) return "#d9d9d9"; // Light gray
    if (density < 500) return "#a6a6a6"; // Medium gray
    return "#595959"; // Dark gray
  };

  // Calculate effective viewBox based on zoom level
  const effectiveViewBox = () => {
    const width = 1000 / zoomLevel
    const height = 600 / zoomLevel
    const x = 500 - width / 2 - panOffset.x / zoomLevel
    const y = 300 - height / 2 - panOffset.y / zoomLevel
    return `${x} ${y} ${width} ${height}`
  }

  return (
    <Card className={`overflow-hidden border-black/10 dark:border-white/20 focus:outline-none map-container ${className}`}>
      <CardContent className="p-0 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-patriot-gray-900/90 backdrop-blur-sm z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-patriot-blue-600 dark:border-patriot-blue-400"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-patriot-gray-900/90 backdrop-blur-sm z-10">
            <div className="text-red-600 dark:text-red-400 text-center p-4">
              <p className="text-black dark:text-white mb-4">{error}</p>
              <Button 
                onClick={handleRetry} 
                className="mt-4 bg-patriot-blue-600 hover:bg-patriot-blue-700 text-white border-none"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          </div>
        )}

        <div className="relative w-full h-[500px] overflow-hidden">
          <svg ref={svgRef} viewBox={effectiveViewBox()} className="w-full h-full focus:outline-none" preserveAspectRatio="xMidYMid meet">
            {statesData &&
              !currentState &&
              statesData.features.map((feature: GeoJSONFeature, index: number) => (
                <path
                  key={`state-${index}`}
                  d={geoJSONToSVGPath(feature.geometry.coordinates, feature.geometry.type)}
                  fill={getDensityColor(feature.properties.population || 0, feature.properties.area_sq_miles || 1)}
                  stroke="#000"
                  strokeWidth="1"
                  onClick={() => handleStateClick(feature)}
                  onMouseEnter={() => setHoveredFeature(feature)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="cursor-pointer hover:opacity-80"
                />
              ))}

            {countiesData &&
              currentState &&
              countiesData.features.map((feature: GeoJSONFeature, index: number) => (
                <path
                  key={`county-${index}`}
                  d={geoJSONToSVGPath(feature.geometry.coordinates, feature.geometry.type)}
                  fill="#4ade80" // Green for counties
                  stroke="#000"
                  strokeWidth="0.5"
                  onClick={() => handleCountyClick(feature)}
                  onMouseEnter={() => setHoveredFeature(feature)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="cursor-pointer hover:opacity-80"
                />
              ))}

            {/* Location Pin */}
            {selectedLocationPin && (
              <g>
                {/* Pin marker */}
                <circle
                  cx={(selectedLocationPin.lng + 125) * 10 + panOffset.x}
                  cy={(50 - selectedLocationPin.lat) * 10 + panOffset.y}
                  r="8"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="drop-shadow-lg"
                />
                {/* Pin point */}
                <circle
                  cx={(selectedLocationPin.lng + 125) * 10 + panOffset.x}
                  cy={(50 - selectedLocationPin.lat) * 10 + panOffset.y}
                  r="3"
                  fill="#ffffff"
                />
              </g>
            )}
          </svg>

          {/* Tooltip */}
          {hoveredFeature && (
            <div
              className="absolute bg-white dark:bg-patriot-gray-800 p-2 rounded shadow-lg text-sm z-20 pointer-events-none text-black dark:text-white border border-black/10 dark:border-white/20"
              style={{
                left: svgRef.current ? `${svgRef.current.getBoundingClientRect().left + 20}px` : 'auto',
                top: svgRef.current ? `${svgRef.current.getBoundingClientRect().top + 20}px` : 'auto',
              }}
            >
              <p className="font-bold">{hoveredFeature.properties.name}</p>
              {hoveredFeature.properties.population && hoveredFeature.properties.area_sq_miles && (
                <>
                  <p>Population: {hoveredFeature.properties.population.toLocaleString()}</p>
                  <p>Density: {(hoveredFeature.properties.population / hoveredFeature.properties.area_sq_miles).toFixed(1)}/sq mi</p>
                </>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button size="icon" variant="outline" onClick={handleZoomIn} className="bg-white dark:bg-patriot-gray-800 border-black/20 dark:border-white/30 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-patriot-gray-700 hover:text-black dark:hover:text-white hover:scale-110 active:scale-95">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleZoomOut} className="bg-white dark:bg-patriot-gray-800 border-black/20 dark:border-white/30 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-patriot-gray-700 hover:text-black dark:hover:text-white hover:scale-110 active:scale-95">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleResetView} className="bg-white dark:bg-patriot-gray-800 border-black/20 dark:border-white/30 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-patriot-gray-700 hover:text-black dark:hover:text-white hover:scale-110 active:scale-95">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Back button */}
          {currentState && (
            <Button
              variant="outline"
              onClick={handleBackToStates}
              className="absolute top-4 left-4 bg-white dark:bg-patriot-gray-800 border-black/20 dark:border-white/30 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-patriot-gray-700"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to States
            </Button>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-patriot-gray-800 p-2 rounded shadow-lg text-sm text-black dark:text-white border border-black/10 dark:border-white/20">
            <div className="font-bold mb-1">Legend</div>
            {/* Population Density Legend */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#f0f0f0]"></div>
                <span>Low Density (&lt; 50/sq mi)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#d9d9d9]"></div>
                <span>Medium Density (50 - 200/sq mi)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#a6a6a6]"></div>
                <span>High Density (200 - 500/sq mi)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#595959]"></div>
                <span>Very High Density (&gt; 500/sq mi)</span>
              </div>
            </div>
            {currentState && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#4ade80]"></div>
                <span>Counties</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 bg-white dark:bg-patriot-gray-800 p-2 rounded shadow-lg text-sm max-w-[200px] text-black dark:text-white border border-black/10 dark:border-white/20">
            {!currentState ? <p>Click on a state to view its counties</p> : <p>Click on a county to select it</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
