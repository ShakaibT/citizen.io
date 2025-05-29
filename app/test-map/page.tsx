"use client"

import dynamic from "next/dynamic"
import { useState } from "react"

// Dynamic import to prevent SSR issues
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-gray-600">Loading map...</div>
    </div>
  )
})

export default function TestMapPage() {
  const [selectedState, setSelectedState] = useState<string | null>(null)

  const handleStateClick = (stateName: string) => {
    console.log("State clicked:", stateName)
    setSelectedState(stateName)
  }

  const handleCountyClick = (countyName: string, stateName: string) => {
    console.log("County clicked:", countyName, "in", stateName)
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Map Test Page</h1>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Interactive US Map</h2>
            <p className="text-gray-600">
              Total US Population: <span className="font-semibold">~338M</span> (including territories)
            </p>
            {selectedState && (
              <p className="text-patriot-blue-600 mt-2">
                Selected State: <span className="font-semibold">{selectedState}</span>
              </p>
            )}
          </div>

          <div className="w-full h-[600px] border border-gray-300 rounded-lg overflow-hidden">
            <LeafletMap
              onStateClick={handleStateClick}
              onCountyClick={handleCountyClick}
              selectedState={selectedState}
              zoomToLocation={null}
              selectedLocationPin={null}
              onReset={() => setSelectedState(null)}
              onError={(error) => console.error("Map Error:", error)}
              onHover={(feature) => console.log("Hovering on:", feature)}
            />
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>• Click on states to view county data</p>
            <p>• Hover over states to see population information</p>
            <p>• Population data is live from 2023 US Census</p>
          </div>
        </div>
      </div>
    </div>
  )
} 