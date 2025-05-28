"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ZoomIn, ZoomOut, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LeafletMapProps {
  onStateClick: (state: string) => void
  onCountyClick: (county: string, state: string) => void
  onReset: () => void
  selectedState: string | null
  zoomToLocation?: { lat: number; lng: number } | null
  selectedLocationPin?: { lat: number; lng: number; address: string } | null
  onError: (error: string) => void
  onHover: (feature: string | null) => void
  onLocationSelect?: (location: { 
    type: string; 
    name: string; 
    fips?: string; 
    abbreviation?: string; 
    state?: string;
    population?: number 
  }) => void
}

// Helper function to get number of House representatives for each state
function getStateRepresentatives(stateName: string): number {
  const representatives: { [key: string]: number } = {
    'Alabama': 7, 'Alaska': 1, 'Arizona': 9, 'Arkansas': 4, 'California': 52,
    'Colorado': 8, 'Connecticut': 5, 'Delaware': 1, 'Florida': 28, 'Georgia': 14,
    'Hawaii': 2, 'Idaho': 2, 'Illinois': 17, 'Indiana': 9, 'Iowa': 4,
    'Kansas': 4, 'Kentucky': 6, 'Louisiana': 6, 'Maine': 2, 'Maryland': 8,
    'Massachusetts': 9, 'Michigan': 13, 'Minnesota': 8, 'Mississippi': 4, 'Missouri': 8,
    'Montana': 2, 'Nebraska': 3, 'Nevada': 4, 'New Hampshire': 2, 'New Jersey': 12,
    'New Mexico': 3, 'New York': 26, 'North Carolina': 14, 'North Dakota': 1, 'Ohio': 15,
    'Oklahoma': 5, 'Oregon': 6, 'Pennsylvania': 17, 'Rhode Island': 2, 'South Carolina': 7,
    'South Dakota': 1, 'Tennessee': 9, 'Texas': 38, 'Utah': 4, 'Vermont': 1,
    'Virginia': 11, 'Washington': 10, 'West Virginia': 2, 'Wisconsin': 8, 'Wyoming': 1
  };
  
  return representatives[stateName] || 1;
}

// Create a client-side only map component
function LeafletMapComponent({
  selectedState,
  zoomToLocation,
  selectedLocationPin,
  onStateClick,
  onCountyClick,
  onReset,
  onError,
  onHover,
  onLocationSelect,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [L, setL] = useState<any>(null)
  const [statesLayer, setStatesLayer] = useState<any>(null)
  const [countiesLayer, setCountiesLayer] = useState<any>(null)
  const [locationMarker, setLocationMarker] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredFeature, setHoveredFeature] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [currentSelectedState, setCurrentSelectedState] = useState<string | null>(selectedState)

  // Dynamically import Leaflet only on client side
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        if (typeof window === 'undefined') {
          console.log('Window is undefined, skipping Leaflet load')
          return
        }
        
        // Add a small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log('Loading Leaflet...')
        const leaflet = await import('leaflet')
        console.log('Leaflet loaded successfully')
        
        // CSS is imported in app/leaflet.css
        
        // Fix Leaflet icon issues
        delete (leaflet.Icon.Default.prototype as any)._getIconUrl
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        })
        
        setL(leaflet)
        setIsLoading(false)
        console.log('Leaflet setup complete')
      } catch (err) {
        console.error('Failed to load Leaflet:', err)
        setError('Failed to load map library')
        setIsLoading(false)
        onError('Failed to load map library')
      }
    }

    // Add a small delay before starting the load process
    const timer = setTimeout(loadLeaflet, 200)
    return () => clearTimeout(timer)
  }, [onError])

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!L || !mapRef.current || map || typeof window === 'undefined') {
      console.log('Map initialization skipped:', { 
        hasL: !!L, 
        hasMapRef: !!mapRef.current, 
        hasMap: !!map, 
        isClient: typeof window !== 'undefined' 
      })
      return
    }

    try {
      console.log('Starting map initialization...')
      
      // Ensure the container is properly available and not already initialized
      const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number }
      if (!container || container._leaflet_id) {
        console.warn('Map container already initialized or not available', {
          hasContainer: !!container,
          leafletId: container?._leaflet_id
        })
        return
      }

      // Clear any existing map instance
      if (container._leaflet_id) {
        console.log('Clearing existing Leaflet ID')
        delete container._leaflet_id
      }

      console.log('Creating map instance...')
      
      // Optimized US bounds to show the entire country including Alaska and Hawaii insets
      const US_BOUNDS = L.latLngBounds(
        L.latLng(18.0, -180.0), // Southwest corner (includes Hawaii and Alaska insets)
        L.latLng(72.0, -66.0), // Northeast corner (includes Alaska)
      )

      const mapInstance = L.map(container, {
        center: [39.8283, -98.5795], // Geographic center of contiguous US
        zoom: 3, // Lower zoom to show entire US including insets
        minZoom: 2,
        maxZoom: 12,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        renderer: L.canvas({ padding: 0.5 }),
        // Optimized for instant zoom
        zoomAnimation: false, // Disable animation for instant zoom
        fadeAnimation: false,
        markerZoomAnimation: false,
        inertia: false, // Disable inertia for instant response
        wheelPxPerZoomLevel: 120, // More responsive wheel zoom
        zoomSnap: 0.1, // Finer zoom increments
        zoomDelta: 0.5,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        scrollWheelZoom: true,
        touchZoom: true,
      })

      console.log('Map instance created successfully')

      // Add a clean basemap optimized for US political data
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: '',
        maxZoom: 12,
        tileSize: 256,
        zoomOffset: 0,
        detectRetina: true,
        updateWhenIdle: false,
        updateWhenZooming: false,
        keepBuffer: 2,
      }).addTo(mapInstance)

      console.log('Tile layer added successfully')

      // Set max bounds to include Alaska and Hawaii but prevent excessive panning
      mapInstance.setMaxBounds(US_BOUNDS.pad(0.1))

      // Track mouse position for tooltip
      mapInstance.on('mousemove', (e: any) => {
        const containerPoint = mapInstance.latLngToContainerPoint(e.latlng)
        setMousePosition({ x: containerPoint.x, y: containerPoint.y })
      })

      setMap(mapInstance)
      console.log('Map initialization complete')
      
      // Load states data immediately after map initialization with retry
      const loadWithRetry = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            await loadStatesData(mapInstance)
            break
          } catch (error) {
            console.warn(`Map data load attempt ${i + 1} failed:`, error)
            if (i === retries - 1) {
              console.error('All map data load attempts failed')
              setError('Failed to load map data after multiple attempts')
            } else {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
            }
          }
        }
      }
      
      setTimeout(() => {
        loadWithRetry()
      }, 100)

      return () => {
        console.log('Cleaning up map instance...')
        if (mapInstance) {
          try {
            mapInstance.remove()
            console.log('Map instance removed successfully')
          } catch (err) {
            console.warn('Error removing map instance:', err)
          }
        }
      }
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setError('Failed to initialize map')
      onError('Failed to initialize map')
    }
  }, [L, onError])

  // Load states GeoJSON data with better performance and error handling
  const loadStatesData = async (mapInstance: any) => {
    try {
      console.log("Loading states data...")
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch("/api/states-geojson", {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'max-age=3600',
        }
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Loaded states data:", data.features?.length, "states")

      if (mapInstance && data.features && L) {
        // Remove existing layers if any
        if (statesLayer) {
          mapInstance.removeLayer(statesLayer)
          setStatesLayer(null)
        }
        if (countiesLayer) {
          mapInstance.removeLayer(countiesLayer)
          setCountiesLayer(null)
        }

        // Create GeoJSON layer for states with improved styling
        const newStatesLayer = L.geoJSON(data, {
          style: (feature: any) => {
            const population = feature?.properties?.population || 0
            
            // Enhanced color scheme based on population
            let fillColor = "#f3f4f6" // Default very light gray
            
            if (population >= 10000000) {
              fillColor = "#7f1d1d" // 10M+ - dark red
            } else if (population >= 5000000) {
              fillColor = "#ea580c" // 5M+ - orange
            } else if (population >= 1000000) {
              fillColor = "#eab308" // 1M+ - yellow
            } else if (population > 0) {
              fillColor = "#22c55e" // <1M - green
            }

            return {
              fillColor,
              weight: 1.5,
              opacity: 1,
              color: "#374151",
              fillOpacity: 0.8,
              className: 'state-path'
            }
          },
          onEachFeature: (feature: any, layer: any) => {
            const props = feature.properties
            const stateName = props.name || props.NAME || 'Unknown State'
            const population = props.population || 0
            const stateFips = props.fips || props.FIPS || ''
            const stateAbbr = props.abbreviation || ''
            
            // Create popup content
            const popupContent = `
              <div class="p-3 min-w-[200px]">
                <h3 class="font-bold text-lg text-gray-900 mb-2">${stateName}</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Population:</span>
                    <span class="font-medium">${population.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Abbreviation:</span>
                    <span class="font-medium">${stateAbbr}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">FIPS Code:</span>
                    <span class="font-medium">${stateFips}</span>
                  </div>
                </div>
                <div class="mt-3 pt-2 border-t border-gray-200">
                  <p class="text-xs text-gray-500">Click to view counties</p>
                </div>
              </div>
            `
            
            layer.bindPopup(popupContent)
            
            // Add hover effects
            layer.on({
              mouseover: (e: any) => {
                setHoveredFeature({
                  name: stateName,
                  population,
                  type: 'state'
                })
                onHover(stateName)
                e.target.setStyle({
                  weight: 3,
                  fillOpacity: 0.95,
                  color: "#1f2937",
                })
                e.target.bringToFront()
              },
              mouseout: (e: any) => {
                setHoveredFeature(null)
                onHover(null)
                e.target.setStyle({
                  weight: 1.5,
                  fillOpacity: 0.8,
                  color: "#374151",
                })
              },
              click: (e: any) => {
                console.log('State clicked:', { stateName, stateFips, stateAbbr })
                
                // Load counties for this state
                if (stateFips || stateAbbr) {
                  loadCountiesData(mapInstance, stateFips, stateName)
                } else {
                  console.warn('No FIPS code or abbreviation available for state:', stateName)
                }
                
                // Notify parent component
                onLocationSelect?.({
                  type: 'state',
                  name: stateName,
                  fips: stateFips,
                  abbreviation: stateAbbr,
                  population: population
                })
              },
            })
          },
        }).addTo(mapInstance)

        setStatesLayer(newStatesLayer)
      }
    } catch (error) {
      console.error("Error loading states data:", error)
      onError("Failed to load states data")
      throw error // Re-throw for retry mechanism
    }
  }

  // Load counties data for a specific state
  const loadCountiesData = async (mapInstance: L.Map, stateFips: string, stateName?: string) => {
    try {
      console.log('Loading counties data for state:', { stateFips, stateName })
      
      // Convert FIPS code to state abbreviation for the API
      const stateAbbreviations: { [key: string]: string } = {
        '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
        '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS',
        '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
        '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY',
        '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC',
        '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
        '55': 'WI', '56': 'WY'
      }
      
      const stateAbbr = stateAbbreviations[stateFips] || stateName || stateFips
      console.log('Using state identifier for API:', stateAbbr)
      
      const response = await fetch(`/api/counties-geojson?state=${encodeURIComponent(stateAbbr)}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Counties API error:', response.status, errorText)
        throw new Error(`Failed to fetch counties data: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Counties data received:', { 
        featureCount: data.features?.length || 0,
        firstFeature: data.features?.[0]?.properties 
      })

      if (mapInstance && data.features && data.features.length > 0) {
        // Remove existing layers
        if (statesLayer) {
          mapInstance.removeLayer(statesLayer)
          setStatesLayer(null)
        }
        if (countiesLayer) {
          mapInstance.removeLayer(countiesLayer)
          setCountiesLayer(null)
        }

        // Create GeoJSON layer for counties
        const newCountiesLayer = L.geoJSON(data, {
          style: (feature: any) => {
            const population = feature?.properties?.population || 0
            
            // Color counties based on population
            let fillColor = "#f9fafb" // Very light gray for no data
            
            if (population >= 1000000) {
              fillColor = "#7f1d1d" // 1M+ - dark red
            } else if (population >= 500000) {
              fillColor = "#dc2626" // 500K+ - red
            } else if (population >= 250000) {
              fillColor = "#ea580c" // 250K+ - orange-red
            } else if (population >= 100000) {
              fillColor = "#f59e0b" // 100K+ - orange
            } else if (population >= 50000) {
              fillColor = "#eab308" // 50K+ - yellow
            } else if (population >= 25000) {
              fillColor = "#84cc16" // 25K+ - lime
            } else if (population >= 10000) {
              fillColor = "#22c55e" // 10K+ - green
            } else if (population > 0) {
              fillColor = "#06b6d4" // 1+ - cyan
            }

            return {
              fillColor,
              weight: 1,
              opacity: 0.8,
              color: '#374151',
              fillOpacity: 0.7
            }
          },
          onEachFeature: (feature: any, layer: any) => {
            const props = feature.properties
            const countyName = props.name || props.NAME || 'Unknown County'
            const population = props.population || 0
            const fips = props.fips || props.FIPS || 'Unknown'
            
            // Create popup content
            const popupContent = `
              <div class="p-3 min-w-[200px]">
                <h3 class="font-bold text-lg text-gray-900 mb-2">${countyName} County</h3>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Population:</span>
                    <span class="font-medium">${population.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">FIPS Code:</span>
                    <span class="font-medium">${fips}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">State:</span>
                    <span class="font-medium">${stateAbbr}</span>
                  </div>
                </div>
              </div>
            `
            
            layer.bindPopup(popupContent)
            
            // Add hover effects
            layer.on({
              mouseover: (e: any) => {
                const layer = e.target
                layer.setStyle({
                  weight: 3,
                  color: '#1f2937',
                  fillOpacity: 0.9
                })
                layer.bringToFront()
              },
              mouseout: (e: any) => {
                newCountiesLayer.resetStyle(e.target)
              },
              click: (e: any) => {
                // Handle county click - could show detailed info
                console.log('County clicked:', props)
                onLocationSelect?.({
                  type: 'county',
                  name: countyName,
                  state: stateAbbr,
                  fips: fips,
                  population: population
                })
                onCountyClick(countyName, stateAbbr)
              }
            })
          }
        })

        // Add the layer to the map
        newCountiesLayer.addTo(mapInstance)
        setCountiesLayer(newCountiesLayer)
        
        // Fit map to counties bounds
        const bounds = newCountiesLayer.getBounds()
        if (bounds.isValid()) {
          mapInstance.fitBounds(bounds, { padding: [20, 20] })
        }
        
        // Update selected state
        setCurrentSelectedState(stateAbbr)
        
        console.log('Counties layer added successfully')
      } else {
        console.warn('No counties data received or empty features array')
        throw new Error('No counties data available')
      }
    } catch (error) {
      console.error('Error loading counties data:', error)
      // Show user-friendly error message
      if (mapInstance) {
        const errorPopup = L.popup()
          .setLatLng(mapInstance.getCenter())
          .setContent(`
            <div class="p-3 text-center">
              <h3 class="font-bold text-red-600 mb-2">Error Loading Counties</h3>
              <p class="text-sm text-gray-600">
                Unable to load county data for this state. 
                Please try again or select a different state.
              </p>
            </div>
          `)
          .openOn(mapInstance)
        
        // Auto-close error popup after 5 seconds
        setTimeout(() => {
          mapInstance.closePopup(errorPopup)
        }, 5000)
      }
    }
  }

  // Handle state selection changes
  useEffect(() => {
    if (map && currentSelectedState) {
      loadCountiesData(map, currentSelectedState, currentSelectedState)
    } else if (map && !currentSelectedState) {
      loadStatesData(map)
    }
  }, [currentSelectedState, map])

  // Handle zoom to location
  useEffect(() => {
    if (map && zoomToLocation && L) {
      map.setView([zoomToLocation.lat, zoomToLocation.lng], 10, { animate: false })
    }
  }, [map, zoomToLocation, L])

  // Handle location pin
  useEffect(() => {
    if (map && L) {
      // Remove existing marker
      if (locationMarker) {
        map.removeLayer(locationMarker)
      }

      // Add new marker if location is provided
      if (selectedLocationPin) {
        const marker = L.marker([selectedLocationPin.lat, selectedLocationPin.lng])
          .addTo(map)
          .bindPopup(selectedLocationPin.address)
        setLocationMarker(marker)
      }
    }
  }, [map, selectedLocationPin, L, locationMarker])

  // Zoom control functions
  const handleZoomIn = () => {
    if (map) {
      map.zoomIn(1, { animate: false })
    }
  }

  const handleZoomOut = () => {
    if (map) {
      map.zoomOut(1, { animate: false })
    }
  }

  const handleResetView = () => {
    if (map) {
      // Reset to initial view showing entire US
      map.setView([39.8283, -98.5795], 3, { animate: false })
      onReset()
      // Reload states data if we're currently showing counties
      if (currentSelectedState) {
        loadStatesData(map)
      }
    }
  }

  const handleHomeView = () => {
    if (map) {
      // Reset to initial view showing entire US
      map.setView([39.8283, -98.5795], 3, { animate: false })
      // Always reload states data for home view
      loadStatesData(map)
      onReset()
    }
  }

  // Cleanup effect to ensure map is properly disposed
  useEffect(() => {
    return () => {
      if (map) {
        try {
          // Remove all layers first
          if (statesLayer) {
            map.removeLayer(statesLayer)
          }
          if (countiesLayer) {
            map.removeLayer(countiesLayer)
          }
          if (locationMarker) {
            map.removeLayer(locationMarker)
          }
          
          // Remove the map instance
          map.remove()
          setMap(null)
        } catch (err) {
          console.warn('Error during map cleanup:', err)
        }
      }
    }
  }, [map, statesLayer, countiesLayer, locationMarker])

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl backdrop-blur-md border border-white/20">
        <div className="text-center p-8 bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-xl border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Loading interactive map...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl backdrop-blur-md border border-white/20">
        <div className="text-center p-8 bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-xl border border-white/20">
          <div className="text-red-500 mb-4 text-2xl">⚠️</div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600/80 hover:bg-blue-700/80 text-white text-sm rounded-lg backdrop-blur-md border border-white/20 transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
      
      {/* Glassmorphic Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <Button
          size="icon"
          onClick={handleZoomIn}
          className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 hover:bg-white/30 hover:border-white/50 text-gray-800 dark:text-white transition-all duration-200 shadow-lg"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={handleZoomOut}
          className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 hover:bg-white/30 hover:border-white/50 text-gray-800 dark:text-white transition-all duration-200 shadow-lg"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={handleHomeView}
          className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 hover:bg-white/30 hover:border-white/50 text-gray-800 dark:text-white transition-all duration-200 shadow-lg"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={handleResetView}
          className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 hover:bg-white/30 hover:border-white/50 text-gray-800 dark:text-white transition-all duration-200 shadow-lg"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Enhanced Glassmorphic Tooltip */}
      {hoveredFeature && (
        <div
          className="absolute z-[1000] pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 rounded-lg p-3 shadow-xl max-w-xs">
            <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">
              {hoveredFeature.name}
            </div>
            {hoveredFeature.type === 'state' && (
              <>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                  Population: {hoveredFeature.population.toLocaleString()}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                  House Reps: {getStateRepresentatives(hoveredFeature.name)}
                </div>
              </>
            )}
            {hoveredFeature.type === 'county' && (
              <>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                  {hoveredFeature.state}
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                  Population: {hoveredFeature.population.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Click to select county
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Glassmorphic Legend */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 rounded-lg p-3 shadow-xl">
          <div className="font-bold text-gray-900 dark:text-white text-sm mb-2">
            {currentSelectedState ? 'County Population' : 'State Population'}
          </div>
          <div className="space-y-1">
            {currentSelectedState ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#7f1d1d] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">1M+</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#ea580c] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">500K+</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#eab308] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">100K+</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#22c55e] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">50K+</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#3b82f6] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">&lt;50K</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#7f1d1d] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">10M+</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#ea580c] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">5M+</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#eab308] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">1M+</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 bg-[#22c55e] rounded-sm"></div>
                  <span className="text-gray-700 dark:text-gray-300">&lt;1M</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Export with dynamic loading to ensure client-side only rendering
const LeafletMap = dynamic(() => Promise.resolve(LeafletMapComponent), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl">
      <div className="text-center p-8 bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-xl border border-white/20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Loading interactive map...</p>
      </div>
    </div>
  ),
})

export default LeafletMap
