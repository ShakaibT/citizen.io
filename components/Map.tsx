"use client"

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to prevent SSR issues
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-gray-600">Loading map...</div>
    </div>
  )
})

interface MapProps {
  onStateClick?: (stateName: string) => void
  onCountyClick?: (countyName: string, stateName: string) => void
  onReset?: () => void
  selectedState?: string | null
  selectedLocationPin?: { lat: number; lng: number; address: string } | null
  zoomToLocation?: { lat: number; lng: number } | null
  className?: string
  mode?: 'default' | 'dashboard'
  fullHeight?: boolean
}

export default function Map({
  onStateClick,
  onCountyClick,
  onReset,
  selectedState,
  selectedLocationPin,
  zoomToLocation,
  className,
  mode = 'default',
  fullHeight
}: MapProps) {
  const [currentSelectedState, setCurrentSelectedState] = useState<string | null>(selectedState || null)
  const [mapKey, setMapKey] = useState(0) // Force re-render key

  // Update internal state when prop changes
  useEffect(() => {
    if (selectedState !== currentSelectedState) {
      setCurrentSelectedState(selectedState || null)
    }
  }, [selectedState, currentSelectedState])

  // Persist map state to prevent loss on navigation
  useEffect(() => {
    if (currentSelectedState) {
      try {
        sessionStorage.setItem('citizen-map-selected-state', currentSelectedState)
      } catch (error) {
        console.warn('Failed to save map state to sessionStorage:', error)
      }
    }
  }, [currentSelectedState])

  // Restore map state on mount
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem('citizen-map-selected-state')
      if (savedState && !currentSelectedState) {
        setCurrentSelectedState(savedState)
      }
    } catch (error) {
      console.warn('Failed to restore map state from sessionStorage:', error)
    }
  }, [currentSelectedState])

  const handleStateClick = (stateName: string) => {
    setCurrentSelectedState(stateName)
    onStateClick?.(stateName)
  }

  const handleCountyClick = (countyName: string, stateName: string) => {
    // Ensure state is set when county is clicked
    if (stateName !== currentSelectedState) {
      setCurrentSelectedState(stateName)
    }
    onCountyClick?.(countyName, stateName)
  }

  const handleReset = () => {
    setCurrentSelectedState(null)
    try {
      sessionStorage.removeItem('citizen-map-selected-state')
    } catch (error) {
      console.warn('Failed to clear map state from sessionStorage:', error)
    }
    onReset?.()
  }

  return (
    <LeafletMap
      key={mapKey} // Use key to force re-render if needed
      mode={mode}
      onStateClick={handleStateClick}
      onCountyClick={handleCountyClick}
      onReset={handleReset}
      selectedState={currentSelectedState}
      selectedLocationPin={selectedLocationPin}
      zoomToLocation={zoomToLocation}
      className={className}
      fullHeight={fullHeight}
    />
  )
}

// Export for backward compatibility
export { Map as LeafletMap } 