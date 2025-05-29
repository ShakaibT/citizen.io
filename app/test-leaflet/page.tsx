"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to prevent SSR issues
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-gray-600">Loading new Leaflet map...</div>
    </div>
  )
})

export default function TestLeafletPage() {
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [mode, setMode] = useState<'default' | 'dashboard'>('default')

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

  const handleError = (error: string) => {
    console.error('Map error:', error)
  }

  const handleHover = (feature: string | null) => {
    console.log('Hovering:', feature)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            New Leaflet Map Test
          </h1>
          <p className="text-gray-600 mb-4">
            Testing the new Leaflet-based map implementation with Census data, TopoJSON, and glass morphism UI.
          </p>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setMode('default')}
              className={`px-4 py-2 rounded ${mode === 'default' ? 'bg-patriot-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Default Mode
            </button>
            <button
              onClick={() => setMode('dashboard')}
              className={`px-4 py-2 rounded ${mode === 'dashboard' ? 'bg-patriot-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Dashboard Mode
            </button>
          </div>
          
          {selectedState && (
            <p className="text-sm text-patriot-blue-600">
              Currently viewing: <strong>{selectedState}</strong>
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <LeafletMap
            mode={mode}
            onStateClick={handleStateClick}
            onCountyClick={handleCountyClick}
            onReset={handleReset}
            selectedState={selectedState}
            onError={handleError}
            onHover={handleHover}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">New Features</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Leaflet + react-leaflet implementation</li>
              <li>✅ TopoJSON data from US Atlas</li>
              <li>✅ Population density choropleth</li>
              <li>✅ Glass morphism hover tooltips</li>
              <li>✅ Smooth zoom transitions (0.3s)</li>
              <li>✅ Keyboard shortcuts (+, -, R)</li>
              <li>✅ State → County drill-down</li>
              <li>✅ State centroid pins</li>
              <li>✅ Dashboard mode with officials drawer</li>
              <li>✅ Accessibility support</li>
              <li>✅ Census API with idb-keyval caching</li>
              <li>✅ Officials API with fallbacks</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>🗺️ US Atlas TopoJSON (states & counties)</li>
              <li>📊 Census ACS 2023 (population & land area)</li>
              <li>🏛️ Google Civic API (officials)</li>
              <li>🏛️ OpenStates API (state legislators)</li>
              <li>🏛️ 5Calls API (federal representatives)</li>
              <li>📍 State/county centroids</li>
              <li>💾 IndexedDB caching (idb-keyval)</li>
              <li>🔄 SWR for data fetching</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Map Engine</h3>
              <ul className="space-y-1">
                <li>• Leaflet 1.9.4</li>
                <li>• react-leaflet 5.0.0</li>
                <li>• OpenStreetMap tiles</li>
                <li>• GeoJSON rendering</li>
                <li>• Custom controls</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Data Processing</h3>
              <ul className="space-y-1">
                <li>• TopoJSON → GeoJSON</li>
                <li>• D3 color scales</li>
                <li>• Population density calc</li>
                <li>• State/county filtering</li>
                <li>• Fallback data</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Performance</h3>
              <ul className="space-y-1">
                <li>• SWR caching</li>
                <li>• IndexedDB storage</li>
                <li>• Dynamic imports</li>
                <li>• Debounced events</li>
                <li>• Memoized calculations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 