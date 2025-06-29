"use client"

import React, { useState } from "react"
import { Plus, Search, Filter, Check, Clock, AlertCircle, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  getCurationStats, 
  getCountiesByStatus, 
  addCountyData, 
  formatCountyStatus, 
  getStatusColor,
  US_COUNTY_COUNTS,
  TOTAL_US_COUNTIES,
  type CountyData 
} from "@/lib/county-data-manager"

interface CountyCurationAdminProps {
  isOpen: boolean
  onClose: () => void
}

export function CountyCurationAdmin({ isOpen, onClose }: CountyCurationAdminProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<CountyData['status'] | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCountyForm, setNewCountyForm] = useState<Partial<CountyData>>({
    status: 'coming_soon'
  })

  const stats = getCurationStats()
  const counties = statusFilter === 'all' 
    ? getCountiesByStatus('coming_soon').concat(
        getCountiesByStatus('in_progress'),
        getCountiesByStatus('verified'),
        getCountiesByStatus('needs_update')
      )
    : getCountiesByStatus(statusFilter)

  const filteredCounties = counties.filter(county =>
    county.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    county.state.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddCounty = () => {
    if (newCountyForm.name && newCountyForm.state && newCountyForm.stateFips && newCountyForm.countyFips) {
      const countyData: CountyData = {
        id: `${newCountyForm.stateFips}-${newCountyForm.countyFips}`,
        name: newCountyForm.name,
        state: newCountyForm.state,
        stateFips: newCountyForm.stateFips,
        countyFips: newCountyForm.countyFips,
        status: newCountyForm.status || 'coming_soon',
        population: newCountyForm.population,
        verifiedBy: 'manual_curation'
      }
      
      addCountyData(countyData)
      setNewCountyForm({ status: 'coming_soon' })
      setShowAddForm(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              County Data Curation Admin
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage manually curated county civic data for maximum accuracy
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            ✕
          </Button>
        </div>

        {/* Stats Dashboard */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{TOTAL_US_COUNTIES}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Counties</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Verified</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.comingSoon}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Coming Soon</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.percentComplete}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Complete</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search counties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CountyData['status'] | 'all')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="in_progress">In Progress</option>
                <option value="verified">Verified</option>
                <option value="needs_update">Needs Update</option>
              </select>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add County
            </Button>
          </div>
        </div>

        {/* Counties List */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm && (
            <Card className="mb-6 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-lg">Add New County</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="County Name (e.g., 'New York County')"
                    value={newCountyForm.name || ''}
                    onChange={(e) => setNewCountyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="State Name (e.g., 'New York')"
                    value={newCountyForm.state || ''}
                    onChange={(e) => setNewCountyForm(prev => ({ ...prev, state: e.target.value }))}
                  />
                  <Input
                    placeholder="State FIPS (e.g., '36')"
                    value={newCountyForm.stateFips || ''}
                    onChange={(e) => setNewCountyForm(prev => ({ ...prev, stateFips: e.target.value }))}
                  />
                  <Input
                    placeholder="County FIPS (e.g., '061')"
                    value={newCountyForm.countyFips || ''}
                    onChange={(e) => setNewCountyForm(prev => ({ ...prev, countyFips: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Population (optional)"
                    value={newCountyForm.population || ''}
                    onChange={(e) => setNewCountyForm(prev => ({ ...prev, population: parseInt(e.target.value) || undefined }))}
                  />
                  <select
                    value={newCountyForm.status || 'coming_soon'}
                    onChange={(e) => setNewCountyForm(prev => ({ ...prev, status: e.target.value as CountyData['status'] }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="coming_soon">Coming Soon</option>
                    <option value="in_progress">In Progress</option>
                    <option value="verified">Verified</option>
                    <option value="needs_update">Needs Update</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddCounty} className="bg-green-600 hover:bg-green-700 text-white">
                    <Check className="w-4 h-4 mr-2" />
                    Add County
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCounties.length > 0 ? (
              filteredCounties.map((county) => (
                <Card key={county.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{county.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{county.state}</p>
                      </div>
                      <Badge className={getStatusColor(county.status)}>
                        {formatCountyStatus(county.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div>ID: {county.id}</div>
                      {county.population && <div>Population: {county.population.toLocaleString()}</div>}
                      {county.lastUpdated && (
                        <div>Updated: {new Date(county.lastUpdated).toLocaleDateString()}</div>
                      )}
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Counties Found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || statusFilter !== 'all' 
                    ? "Try adjusting your search or filter criteria."
                    : "Start by adding counties to begin the curation process."
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              <strong>Goal:</strong> Manually curate all {TOTAL_US_COUNTIES.toLocaleString()} US counties for maximum data accuracy.
            </p>
            <p className="mt-1">
              Progress: {stats.verified} verified • {stats.inProgress} in progress • {(TOTAL_US_COUNTIES - stats.total).toLocaleString()} remaining
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 