"use client"

import React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { LocationSetup } from "./location-setup"
import { getUserPrimaryAddress } from "../lib/address-storage"
import { useAuth } from "./auth-provider"

interface LocationData {
  address: string
  city: string
  state: string
  zipCode: string
  latitude: number
  longitude: number
  congressionalDistrict?: string
  stateDistrict?: string
}

interface LocationContextType {
  location: LocationData | null
  setLocation: (location: LocationData) => void
  clearLocation: () => void
  isLocationSet: boolean
  isLoading: boolean
  error: Error | null
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationData | null>(null)
  const [isLocationSet, setIsLocationSet] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user, loading: authLoading, isConfigured } = useAuth()

  useEffect(() => {
    let mounted = true

    const loadLocation = async () => {
      if (!mounted) return
      setIsLoading(true)
      setError(null)

      try {
        // If user is logged in and auth is configured, try to get their stored address
        if (user && isConfigured) {
          const storedAddress = await getUserPrimaryAddress(user.id)
          if (storedAddress) {
            const locationData: LocationData = {
              address: storedAddress.formatted_address,
              city: storedAddress.locality || "Unknown City",
              state: storedAddress.administrative_area_level_1 || "Unknown State",
              zipCode: storedAddress.postal_code || "",
              latitude: Number(storedAddress.latitude),
              longitude: Number(storedAddress.longitude),
              congressionalDistrict: storedAddress.congressional_district || undefined,
              stateDistrict: storedAddress.state_district || undefined,
            }
            if (mounted) {
              setLocationState(locationData)
              setIsLocationSet(true)
            }
            return
          }
        }

        // If no stored address or auth is not configured, check localStorage for temporary location
        const savedLocation = localStorage.getItem("citizen-location")
        if (savedLocation) {
          try {
            const parsedLocation = JSON.parse(savedLocation)
            if (mounted) {
              setLocationState(parsedLocation)
              setIsLocationSet(true)
            }
          } catch (parseError) {
            console.error("Error parsing saved location:", parseError)
            localStorage.removeItem("citizen-location")
            if (mounted) {
              setError(new Error("Failed to load saved location"))
            }
          }
        }
      } catch (err) {
        console.error("Error loading location:", err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to load location"))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Only load location after auth state is determined
    if (!authLoading) {
      loadLocation()
    }

    return () => {
      mounted = false
    }
  }, [user, authLoading, isConfigured])

  const setLocation = (newLocation: LocationData) => {
    setLocationState(newLocation)
    setIsLocationSet(true)
    setError(null)
    // Also save to localStorage as backup
    try {
      localStorage.setItem("citizen-location", JSON.stringify(newLocation))
    } catch (err) {
      console.error("Error saving location to localStorage:", err)
    }
  }

  const clearLocation = () => {
    setLocationState(null)
    setIsLocationSet(false)
    setError(null)
    try {
      localStorage.removeItem("citizen-location")
    } catch (err) {
      console.error("Error clearing location from localStorage:", err)
    }
  }

  // Show loading state while determining auth and location
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-navy-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <p className="text-gray-600">Loading your civic information...</p>
        </div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">!</span>
          </div>
          <p className="text-gray-600 mb-4">Failed to load location information</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!isLocationSet) {
    return <LocationSetup onLocationSet={setLocation} />
  }

  return (
    <LocationContext.Provider value={{ location, setLocation, clearLocation, isLocationSet, isLoading, error }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider")
  }
  return context
}
