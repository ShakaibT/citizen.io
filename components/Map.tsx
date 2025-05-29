"use client"

import React, { useState } from 'react'
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
}

export default function Map({
  onStateClick,
  onCountyClick,
  onReset,
  selectedState,
  selectedLocationPin,
  zoomToLocation,
  className,
  mode = 'default'
}: MapProps) {
  const [currentSelectedState, setCurrentSelectedState] = useState<string | null>(selectedState || null)

  const handleStateClick = (stateName: string) => {
    setCurrentSelectedState(stateName)
    onStateClick?.(stateName)
  }

  const handleReset = () => {
    setCurrentSelectedState(null)
    onReset?.()
  }

  return (
    <LeafletMap
      mode={mode}
      onStateClick={handleStateClick}
      onCountyClick={onCountyClick}
      onReset={handleReset}
      selectedState={currentSelectedState}
      selectedLocationPin={selectedLocationPin}
      zoomToLocation={zoomToLocation}
      className={className}
    />
  )
}

// Export for backward compatibility
export { Map as LeafletMap } 