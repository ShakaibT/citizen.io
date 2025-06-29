"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Edit,
  ArrowRight,
  CheckCircle,
  Home,
  Users,
  Vote,
  Calendar,
  Building,
  Phone,
  Mail,
  Globe,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocation } from "@/components/location-provider"
import { useAuth } from "@/components/auth-provider"
import { ThemeToggle } from "@/components/theme-toggle"

interface AddressResultsProps {
  onChangeLocation: () => void
  onContinue: () => void
}

export function AddressResults({ onChangeLocation, onContinue }: AddressResultsProps) {
  const { location } = useLocation()
  const { user } = useAuth()
  const router = useRouter()

  if (!location) {
    return null
  }

  // Extract location facts for display
  const getLocationFacts = () => {
    // Mock data - in real app this would come from APIs
    const stateAbbr = location.state.length === 2 ? location.state : 
      location.state === "California" ? "CA" :
      location.state === "Texas" ? "TX" :
      location.state === "New York" ? "NY" :
      location.state === "Florida" ? "FL" :
      location.state === "Pennsylvania" ? "PA" : "XX"
    
    const mockFacts = {
      'CA': { population: '39.5M', counties: 58, founded: 1850, nickname: 'Golden State' },
      'TX': { population: '30.0M', counties: 254, founded: 1845, nickname: 'Lone Star State' },
      'NY': { population: '19.3M', counties: 62, founded: 1788, nickname: 'Empire State' },
      'FL': { population: '22.6M', counties: 67, founded: 1845, nickname: 'Sunshine State' },
      'PA': { population: '13.0M', counties: 67, founded: 1787, nickname: 'Keystone State' },
    }
    
    return mockFacts[stateAbbr as keyof typeof mockFacts] || { 
      population: '2.1M', 
      counties: 64, 
      founded: 1876, 
      nickname: 'Great State' 
    }
  }

  const locationFacts = getLocationFacts()

  const handleContinueToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-xl">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Address Confirmed!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            We've found your location and can now provide personalized civic information for your area.
          </p>
        </div>

        {/* Address Display Card */}
        <Card className="mb-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/40 dark:border-slate-700/40 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="h-6 w-6" />
                <div>
                  <CardTitle className="text-xl">Your Confirmed Address</CardTitle>
                  <CardDescription className="text-blue-100">
                    This is the address we'll use for your civic information
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={onChangeLocation}
                variant="outline"
                size="sm"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Change
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Main Address */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <Home className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Full Address
                    </div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      {location.address}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">City</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{location.city}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">State</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{location.state}</span>
                  </div>
                  {location.zipCode && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-600 dark:text-slate-400">ZIP Code</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{location.zipCode}</span>
                    </div>
                  )}
                  {location.county && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">County</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{location.county}</span>
                    </div>
                  )}
                </div>

                {/* State Facts */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    {location.state} Quick Facts
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                      <div className="text-xs text-green-600 dark:text-green-400 mb-1">Population</div>
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">{locationFacts.population}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                      <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Counties</div>
                      <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{locationFacts.counties}</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                      <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Statehood</div>
                      <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{locationFacts.founded}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Nickname</div>
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">{locationFacts.nickname}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next Section */}
        <Card className="mb-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/40 dark:border-slate-700/40 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-slate-900 dark:text-white">
              <Users className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              What You'll Discover
            </CardTitle>
            <CardDescription>
              Based on your location, here's what civic information we can provide
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Your Representatives
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    Federal, state, and local officials representing your area
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Vote className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    Voting Information
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">
                    Polling locations, ballot measures, and election dates
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <Building className="h-6 w-6 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    Local Government
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">
                    City council meetings, county commissioners, and local offices
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Civic Events
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">
                    Town halls, public hearings, and community meetings
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onChangeLocation}
            variant="outline"
            size="lg"
            className="bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Change My Address
          </Button>
          
          <Button
            onClick={handleContinueToDashboard}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <ArrowRight className="h-5 w-5 mr-2" />
            Continue to Dashboard
          </Button>
        </div>

        {/* User Status */}
        {user && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">
                Signed in as {user.email} • Address saved to your account
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 