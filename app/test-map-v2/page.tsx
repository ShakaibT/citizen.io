"use client"

import { useState } from 'react'
import Map from '../../components/Map'

export default function TestMapV2() {
  const [selectedState, setSelectedState] = useState<string | null>(null)

  const handleStateClick = (stateName: string) => {
    console.log('State clicked:', stateName)
    setSelectedState(stateName)
  }

  const handleCountyClick = (countyName: string, stateName: string) => {
    console.log('County clicked:', countyName, 'in', stateName)
  }

  const handleReset = () => {
    console.log('Map reset')
    setSelectedState(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Map v2 Test Page
          </h1>
          <p className="text-gray-600">
            Testing the new react-simple-maps implementation with Census data and glass morphism UI.
          </p>
          {selectedState && (
            <p className="mt-2 text-sm text-patriot-blue-600">
              Currently viewing: <strong>{selectedState}</strong>
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[500px] lg:h-[600px] max-h-[600px]">
          <Map
            mode="default"
            onStateClick={handleStateClick}
            onCountyClick={handleCountyClick}
            onReset={handleReset}
            selectedState={selectedState}
            fullHeight={true}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Features</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Population density choropleth</li>
              <li>✅ Glass morphism hover cards</li>
              <li>✅ Smooth zoom transitions (0.25s)</li>
              <li>✅ Keyboard shortcuts (+, -, R)</li>
              <li>✅ State → County drill-down</li>
              <li>✅ Accessibility support</li>
              <li>✅ SWR data caching</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>📊 Census ACS 2023 (population)</li>
              <li>🗺️ US Atlas TopoJSON (geography)</li>
              <li>🏛️ Google Civic API (officials)</li>
              <li>📍 State/county centroids</li>
              <li>💰 Median income data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 