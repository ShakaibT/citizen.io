"use client"

import React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
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
  county?: string
}

interface LocationContextType {
  location: LocationData | null
  setLocation: (location: LocationData) => void
  clearLocation: () => void
  isLocationSet: boolean
  isLoading: boolean
  error: Error | null
  showLocationSetup: boolean
  setShowLocationSetup: (show: boolean) => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationData | null>(null)
  const [isLocationSet, setIsLocationSet] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showLocationSetup, setShowLocationSetup] = useState(false)
  const [hasCheckedForLocation, setHasCheckedForLocation] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { user, loading: authLoading, isConfigured } = useAuth()

  useEffect(() => {
    let mounted = true

    const loadLocation = async () => {
      if (!mounted) return
      
      // Add debugging
      console.log('LocationProvider: Loading location...', { 
        user: !!user, 
        authLoading, 
        isConfigured, 
        hasCheckedForLocation,
        isInitialized 
      })
      
      // If we've already initialized and have a location, don't re-run unless explicitly needed
      if (hasCheckedForLocation && isInitialized && location) {
        console.log('LocationProvider: Already initialized with location, skipping reload')
        return
      }
      
      setIsLoading(true)
      setError(null)

      try {
        let locationFound = false

        // If user is logged in and auth is configured, try to get their stored address
        if (user && isConfigured) {
          console.log('LocationProvider: Checking user stored address...')
          const storedAddress = await getUserPrimaryAddress(user.id)
          if (storedAddress) {
            console.log('LocationProvider: Found stored address')
            const locationData: LocationData = {
              address: storedAddress.formatted_address,
              city: storedAddress.locality || "Unknown City",
              state: storedAddress.administrative_area_level_1 || "Unknown State",
              zipCode: storedAddress.postal_code || "",
              latitude: Number(storedAddress.latitude),
              longitude: Number(storedAddress.longitude),
              congressionalDistrict: storedAddress.congressional_district || undefined,
              stateDistrict: storedAddress.state_district || undefined,
              county: storedAddress.administrative_area_level_2 || undefined,
            }
            if (mounted) {
              setLocationState(locationData)
              setIsLocationSet(true)
              setHasCheckedForLocation(true)
              setIsInitialized(true)
              setShowLocationSetup(false) // Explicitly set to false when location is found
              locationFound = true
            }
            return
          }
        }

        // If no stored address or auth is not configured, check localStorage for temporary location
        if (!locationFound) {
          console.log('LocationProvider: Checking localStorage...')
          const savedLocation = localStorage.getItem("citizen-location")
          if (savedLocation) {
            try {
              const parsedLocation = JSON.parse(savedLocation)
              console.log('LocationProvider: Found localStorage location')
              if (mounted) {
                setLocationState(parsedLocation)
                setIsLocationSet(true)
                setHasCheckedForLocation(true)
                setIsInitialized(true)
                setShowLocationSetup(false) // Explicitly set to false when location is found
                locationFound = true
              }
            } catch (parseError) {
              console.error("Error parsing saved location:", parseError)
              localStorage.removeItem("citizen-location")
              if (mounted) {
                setError(new Error("Failed to load saved location"))
                setHasCheckedForLocation(true)
                setIsInitialized(true)
              }
            }
          }
        }

        // Only show location setup if no location was found anywhere
        if (!locationFound && mounted) {
          console.log('LocationProvider: No location found, checking session...')
          setHasCheckedForLocation(true)
          setIsInitialized(true)
          
          // Check if user has already completed setup in this session
          const hasCompletedSetupInSession = (() => {
            try {
              return sessionStorage.getItem("citizen-location-setup-completed") === "true"
            } catch {
              return false
            }
          })()
          
          console.log('LocationProvider: Session setup completed?', hasCompletedSetupInSession)
          
          // Only show location setup if user hasn't completed it in this session
          if (!hasCompletedSetupInSession) {
            setShowLocationSetup(true)
          }
        }
      } catch (err) {
        console.error("Error loading location:", err)
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to load location"))
          setHasCheckedForLocation(true)
          setIsInitialized(true)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Only load location after auth state is determined AND if we haven't already initialized
    if (!authLoading && (!hasCheckedForLocation || !isInitialized)) {
      loadLocation()
    }

    return () => {
      mounted = false
    }
  }, [user, authLoading, isConfigured, hasCheckedForLocation, isInitialized, location])

  const setLocation = useCallback((newLocation: LocationData) => {
    // Use functional updates to prevent race conditions
    setLocationState(newLocation)
    setIsLocationSet(true)
    setError(null)
    setShowLocationSetup(false)
    
    // Mark that user has completed location setup in this session
    try {
      sessionStorage.setItem("citizen-location-setup-completed", "true")
    } catch (err) {
      console.error("Error saving location setup status:", err)
    }
    
    // Also save to localStorage as backup
    try {
      localStorage.setItem("citizen-location", JSON.stringify(newLocation))
    } catch (err) {
      console.error("Error saving location to localStorage:", err)
    }
  }, [])

  const clearLocation = useCallback(() => {
    setLocationState(null)
    setIsLocationSet(false)
    setError(null)
    setShowLocationSetup(true)
    
    // Clear the session marker when explicitly clearing location
    try {
      sessionStorage.removeItem("citizen-location-setup-completed")
    } catch (err) {
      console.error("Error clearing location setup status:", err)
    }
    
    try {
      localStorage.removeItem("citizen-location")
    } catch (err) {
      console.error("Error clearing location from localStorage:", err)
    }
  }, [])

  // Show loading state while checking for location
  if (authLoading || isLoading || !hasCheckedForLocation || !isInitialized) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-patriot-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
            className="px-4 py-2 bg-patriot-blue-600 text-white rounded-lg hover:bg-patriot-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Only show location setup when:
  // 1. Explicitly requested by user (showLocationSetup is true)
  // 2. AND we truly have no location data available
  // 3. AND we've finished all initialization checks
  // 4. AND user hasn't already completed setup in this session
  // 5. AND there's no location in localStorage
  const hasCompletedSetupInSession = (() => {
    try {
      return sessionStorage.getItem("citizen-location-setup-completed") === "true"
    } catch {
      return false
    }
  })()

  const hasLocationInStorage = (() => {
    try {
      const savedLocation = localStorage.getItem("citizen-location")
      return savedLocation && JSON.parse(savedLocation)
    } catch {
      return false
    }
  })()

  const shouldShowLocationSetup = showLocationSetup && 
    !location && 
    !isLocationSet && 
    hasCheckedForLocation && 
    isInitialized &&
    !hasCompletedSetupInSession &&
    !hasLocationInStorage

  console.log('LocationProvider: Should show location setup?', {
    showLocationSetup,
    location: !!location,
    isLocationSet,
    hasCheckedForLocation,
    isInitialized,
    hasCompletedSetupInSession,
    hasLocationInStorage,
    shouldShowLocationSetup
  })

  if (shouldShowLocationSetup) {
    return <LocationSetup onLocationSet={(newLocation) => {
      setLocation(newLocation)
      setShowLocationSetup(false)
    }} />
  }

  return (
    <LocationContext.Provider value={{ 
      location, 
      setLocation, 
      clearLocation, 
      isLocationSet, 
      isLoading: authLoading || isLoading,
      error,
      showLocationSetup,
      setShowLocationSetup
    }}>
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
