"use client"

import { useState, useEffect, useRef } from "react"
import {
  MapPin,
  ChevronRight,
  Globe2,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Star,
  Bell,
  Shield,
  Flag,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { StateSelector } from "@/components/state-selector"
import { AuthModal } from "@/components/auth-modal"
import { storeValidatedAddress, logAddressValidation } from "@/lib/address-storage"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import React from "react"
import LeafletMap from "@/components/leaflet-map"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"

// Add Google Maps API type declarations
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => any
          PlacesServiceStatus: {
            OK: string
          }
        }
        Geocoder: new () => any
        LatLng: new (lat: number, lng: number) => any
      }
    }
  }
}

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

interface LocationSetupProps {
  onLocationSet: (location: LocationData) => void
}

export function LocationSetup({ onLocationSet }: LocationSetupProps) {
  const [address, setAddress] = useState("")
  const [selectedState, setSelectedState] = useState("")
  const [selectedCounty, setSelectedCounty] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"welcome" | "address" | "state" | "auth-prompt">("welcome")
  const [validationError, setValidationError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [validatedAddress, setValidatedAddress] = useState<string | null>(null)
  const [pendingLocationData, setPendingLocationData] = useState<LocationData | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mapZoomLocation, setMapZoomLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedLocationPin, setSelectedLocationPin] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signup")

  const { user } = useAuth()
  const { toast } = useToast()
  const { theme, resolvedTheme } = useTheme()
  
  // Debounce address for real-time geocoding
  const debouncedAddress = useDebounce(address, 1000)

  // Glass card styles that adapt to light/dark mode
  const isDark = theme === 'dark' || resolvedTheme === 'dark'
  const glassCardStyle = isDark ? {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px 0 rgba(255, 255, 255, 0.2)'
  } : {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
  }







  // Handle debounced address geocoding for real-time map updates
  React.useEffect(() => {
    if (debouncedAddress.length > 10 && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode(
        {
          address: debouncedAddress.trim(),
          componentRestrictions: { country: "US" },
        },
        (results: any, status: any) => {
          if (status === "OK" && results && results[0]) {
            const result = results[0]
            const location = result.geometry.location
            const lat = location.lat()
            const lng = location.lng()
            
            // Update map location and pin in real-time
            setMapZoomLocation({ lat, lng })
            setSelectedLocationPin({ 
              lat, 
              lng, 
              address: result.formatted_address 
            })
          }
        }
      )
    } else if (debouncedAddress.length < 3) {
      // Clear pin if address is too short
      setSelectedLocationPin(null)
      setMapZoomLocation(null)
    }
  }, [debouncedAddress])

  // Add this useEffect to load Google Maps API
  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log("Google Maps API Key check:", { 
      hasKey: !!apiKey, 
      keyStart: apiKey?.substring(0, 10),
      googleLoaded: !!window.google 
    })
    
    if (!window.google) {
      if (!apiKey) {
        console.warn("Google Maps API key is missing. Some features may not work correctly.")
        toast({
          title: "Maps API Error",
          description: "Google Maps API key is not configured. Some features may be limited.",
          variant: "destructive",
        })
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        console.log("Google Maps API loaded successfully")
        // Test if the API is working
        if (window.google && window.google.maps) {
          console.log("Google Maps API is ready for use")
        } else {
          console.error("Google Maps API loaded but window.google is not available")
        }
      }
      script.onerror = (event) => {
        console.error("Failed to load Google Maps API - Script Error:", event)
        console.error("Script src:", script.src)
        console.error("API Key (first 20 chars):", apiKey?.substring(0, 20))
        toast({
          title: "Maps API Error",
          description: "Unable to load address validation. Please check your internet connection and try again.",
          variant: "destructive",
        })
      }
      
      // Add additional error handling
      script.addEventListener('error', (event) => {
        console.error("Google Maps Script Load Error Event:", event)
      })
      
      document.head.appendChild(script)
      
      // Set a timeout to check if the script loaded
      setTimeout(() => {
        if (!window.google) {
          console.error("Google Maps API failed to load within 10 seconds")
          toast({
            title: "Maps API Timeout",
            description: "Google Maps API is taking too long to load. Please refresh the page.",
            variant: "destructive",
          })
        }
      }, 10000)
    } else {
      console.log("Google Maps API already loaded")
    }
  }, [toast])

  // Add this function after the existing state declarations
  const handleAddressChange = async (value: string) => {
    setAddress(value)

    if (value.length > 2 && window.google && window.google.maps) {
      try {
        const service = new window.google.maps.places.AutocompleteService()
        const request = {
          input: value,
          types: ["address"],
          componentRestrictions: { country: "us" },
        }

        service.getPlacePredictions(request, (predictions: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const suggestions = predictions.slice(0, 5).map((prediction: any) => prediction.description)
            setAddressSuggestions(suggestions)
            setShowSuggestions(true)
          } else {
            setShowSuggestions(false)
            setAddressSuggestions([])
          }
        })

        // Real-time geocoding is now handled by debounced useEffect
      } catch (error) {
        console.error("Google Places API error:", error)
        setShowSuggestions(false)
        setAddressSuggestions([])
      }
    } else {
      setShowSuggestions(false)
      setAddressSuggestions([])
      // Pin clearing is now handled by debounced useEffect
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setAddress(suggestion)
    setShowSuggestions(false)
    setAddressSuggestions([])
    
    // Geocode the selected suggestion to update the map
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode(
        {
          address: suggestion.trim(),
          componentRestrictions: { country: "US" },
        },
        (results: any, status: any) => {
          if (status === "OK" && results && results[0]) {
            const result = results[0]
            const location = result.geometry.location
            const lat = location.lat()
            const lng = location.lng()
            
            // Update map location and pin
            setMapZoomLocation({ lat, lng })
            setSelectedLocationPin({ 
              lat, 
              lng, 
              address: result.formatted_address 
            })
          }
        }
      )
    }
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // In a real app, you'd reverse geocode these coordinates
          // For now, we'll create a mock location
          const { latitude, longitude } = position.coords

          // Zoom map to detected location and place pin
          setMapZoomLocation({ lat: latitude, lng: longitude })
          setSelectedLocationPin({ 
            lat: latitude, 
            lng: longitude, 
            address: `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` 
          })

          const locationData: LocationData = {
            address: `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city: "Detected City",
            state: "Detected State",
            zipCode: "",
            latitude,
            longitude,
          }

          toast({
            title: "Location detected!",
            description: "We've found your approximate location.",
          })

          if (user) {
            onLocationSet(locationData)
          } else {
            setPendingLocationData(locationData)
            setStep("auth-prompt")
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to process your location.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        setLoading(false)
        toast({
          title: "Location access denied",
          description: "Please enter your address manually or enable location access.",
          variant: "destructive",
        })
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  const handleAddressSubmit = async () => {
    if (!address.trim()) {
      setValidationError("Please enter an address")
      return
    }

    // Check if Google Maps API is loaded
    if (!window.google) {
      setValidationError("Google Maps API not loaded. Please refresh the page and try again.")
      console.error("Google Maps API not loaded - window.google is undefined")
      return
    }

    if (!window.google.maps) {
      setValidationError("Google Maps API not properly initialized. Please refresh the page and try again.")
      console.error("Google Maps API not properly initialized - window.google.maps is undefined")
      return
    }

    if (!window.google.maps.Geocoder) {
      setValidationError("Google Maps Geocoder not available. Please refresh the page and try again.")
      console.error("Google Maps Geocoder not available")
      return
    }

    setLoading(true)
    setValidationError(null)
    setSuggestions([])
    setValidatedAddress(null)

    try {
      const geocoder = new window.google.maps.Geocoder()

      geocoder.geocode(
        {
          address: address.trim(),
          componentRestrictions: { country: "US" },
        },
        async (results: any, status: any) => {
          if (status === "OK" && results && results[0]) {
            const result = results[0]
            const location = result.geometry.location

            // Extract address components
            const addressComponents = result.address_components
            const getComponent = (type: string) => {
              const component = addressComponents.find((comp: any) => comp.types.includes(type))
              return component?.long_name || ""
            }

            const validationData = {
              formatted_address: result.formatted_address,
              street_number: getComponent("street_number"),
              route: getComponent("route"),
              locality: getComponent("locality"),
              administrative_area_level_2: getComponent("administrative_area_level_2"),
              administrative_area_level_1: getComponent("administrative_area_level_1"),
              country: getComponent("country"),
              postal_code: getComponent("postal_code"),
              latitude: location.lat(),
              longitude: location.lng(),
              place_id: result.place_id,
              address_components: addressComponents,
            }

            // Log the validation attempt
            await logAddressValidation(user?.id || null, address.trim(), "success", undefined, undefined)

            // Set the validated address for display
            setValidatedAddress(validationData.formatted_address)

            // Zoom map to validated address location and place pin
            setMapZoomLocation({ lat: validationData.latitude, lng: validationData.longitude })
            setSelectedLocationPin({ 
              lat: validationData.latitude, 
              lng: validationData.longitude, 
              address: validationData.formatted_address 
            })

            // Create location data for the app
            const locationData: LocationData = {
              address: validationData.formatted_address,
              city: validationData.locality || "Unknown City",
              state: validationData.administrative_area_level_1 || "Unknown State",
              zipCode: validationData.postal_code || "",
              latitude: validationData.latitude,
              longitude: validationData.longitude,
              congressionalDistrict: undefined,
              stateDistrict: undefined,
              county: validationData.administrative_area_level_2 || undefined,
            }

            // Store the validated address if user is logged in
            if (user) {
              const storeResult = await storeValidatedAddress(user, address.trim(), validationData)
              if (storeResult.success) {
                toast({
                  title: "Address Saved!",
                  description: "Your address has been validated and saved to your account.",
                })
                onLocationSet(locationData)
              } else {
                toast({
                  title: "Address Validated",
                  description: "Address validated but couldn't be saved. You can continue using the app.",
                  variant: "destructive",
                })
                onLocationSet(locationData)
              }
            } else {
              // If not logged in, show auth prompt
              setPendingLocationData(locationData)
              setStep("auth-prompt")
            }
          } else {
            // Handle validation failure
            let errorMessage = "Unable to validate address"
            const suggestions = [
              "Make sure to include city and state (e.g., '123 Main St, Austin, TX')",
              "Try using the full state name or abbreviation",
              "Check for typos in street names or city names",
            ]

            if (status === "ZERO_RESULTS") {
              errorMessage = "No results found for this address"
            } else if (status === "OVER_QUERY_LIMIT") {
              errorMessage = "Too many requests. Please try again later."
            } else if (status === "REQUEST_DENIED") {
              errorMessage = "Address validation service unavailable"
            }

            setValidationError(errorMessage)
            setSuggestions(suggestions)

            // Log the error
            await logAddressValidation(user?.id || null, address.trim(), "failed", errorMessage)
          }
          setLoading(false)
        },
      )
    } catch (error) {
      console.error("Address validation error:", error)
      setValidationError("An error occurred while validating your address. Please try again.")
      await logAddressValidation(user?.id || null, address.trim(), "failed", "System error during validation")
      setLoading(false)
    }
  }

  const handleStateSelect = (state: string) => {
    setSelectedState(state)
    setAddress(`${state}, USA`)
  }

  const handleCountySelect = (county: string, state: string) => {
    setSelectedCounty(county)
    setSelectedState(state)

    // Create location data for county selection
    const locationData: LocationData = {
      address: `${county}, ${state}, USA`,
      city: county.replace(" County", ""),
      state: state,
      zipCode: "",
      latitude: 39.8283,
      longitude: -98.5795,
      county: county,
    }

    toast({
      title: "County Selected",
      description: `Selected ${county}, ${state}`,
    })

    if (user) {
      onLocationSet(locationData)
    } else {
      setPendingLocationData(locationData)
      setStep("auth-prompt")
    }
  }

  const handleContinueWithoutAccount = () => {
    if (pendingLocationData) {
      toast({
        title: "Location Set",
        description: "You can create an account later to save your preferences.",
      })
      onLocationSet(pendingLocationData)
    }
  }

  const handleAuthSuccess = () => {
    setAuthModalOpen(false)
    if (pendingLocationData) {
      toast({
        title: "Welcome!",
        description: "Your location preferences will be saved to your account.",
      })
      onLocationSet(pendingLocationData)
    }
  }

  const handleTryAgain = () => {
    setValidationError(null)
    setSuggestions([])
    setValidatedAddress(null)
    setAddress("")
    setMapZoomLocation(null)
    setSelectedLocationPin(null)
  }

  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-patriot-blue-50 via-white to-patriot-red-50 dark:from-patriot-gray-950 dark:via-patriot-gray-900 dark:to-patriot-gray-950 flex items-center justify-center p-4 pt-12">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-4xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <img src="/logo.png" alt="Citizen Logo" className="h-20 w-auto max-w-20 shadow-xl rounded-2xl object-contain" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-patriot-gray-900"></div>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-black dark:text-white mb-4 tracking-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-patriot-blue-600 to-patriot-red-600 bg-clip-text text-transparent">
                Citizen
              </span>
            </h1>
            <p className="text-xl text-black dark:text-white mb-8 max-w-2xl mx-auto leading-relaxed">
              Stay Informed. Stay Empowered. Stay Engaged.
            </p>

            {/* Feature highlights */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div 
                className="flex flex-col items-center p-6 backdrop-blur-xl rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-1 bg-white/80 border border-black/10 dark:bg-white/15 dark:border-white/30 transition-all duration-300"
                style={{
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="w-16 h-16 bg-patriot-blue-100/70 dark:bg-patriot-blue-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <Globe2 className="h-8 w-8 text-patriot-blue-600 dark:text-patriot-blue-400" />
                </div>
                <h3 className="font-semibold text-black dark:text-white mb-2">Location-Based</h3>
                <p className="text-black/80 dark:text-white/80 text-sm text-center">
                  Track legislation and news that directly affects your community.
                </p>
              </div>
              <div 
                className="flex flex-col items-center p-6 backdrop-blur-xl rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-1 bg-white/80 border border-black/10 dark:bg-white/15 dark:border-white/30 transition-all duration-300"
                style={{
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="w-16 h-16 bg-green-100/70 dark:bg-green-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-black dark:text-white mb-2">Real-Time Updates</h3>
                <p className="text-black/80 dark:text-white/80 text-sm text-center">
                  Follow bills and headlines as they unfold — no noise, just facts.
                </p>
              </div>
              <div 
                className="flex flex-col items-center p-6 backdrop-blur-xl rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-1 bg-white/80 border border-black/10 dark:bg-white/15 dark:border-white/30 transition-all duration-300"
                style={{
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="w-16 h-16 bg-patriot-red-100/70 dark:bg-patriot-red-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-patriot-red-600 dark:text-patriot-red-400" />
                </div>
                <h3 className="font-semibold text-black dark:text-white mb-2">Take Action</h3>
                <p className="text-black/80 dark:text-white/80 text-sm text-center">
                  Contact representatives and join campaigns that matter to you
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setStep("address")}
                className="group relative inline-flex items-center justify-center gap-3 font-bold px-12 py-6 text-xl rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 ease-out"
                style={{ 
                  backgroundColor: '#002868',
                  color: 'white',
                  textShadow: 'none',
                  WebkitTextStroke: 'none',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a4d'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#002868'}
              >
                <span className="relative z-10" style={{ color: 'white', textShadow: 'none', WebkitTextStroke: 'none' }}>Get Started with Your Address</span>
                <ChevronRight className="h-6 w-6 flex-shrink-0 relative z-10 group-hover:translate-x-1 transition-transform duration-200" style={{ color: 'white' }} />
              </button>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <button
                  onClick={() => {
                    setAuthModalTab("signup")
                    setAuthModalOpen(true)
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-patriot-red-600/90 hover:bg-patriot-red-700 active:bg-patriot-red-800 text-white font-semibold px-8 py-3 text-lg rounded-xl shadow-xl hover:shadow-2xl backdrop-blur-sm border border-white/10"
                >
                  <UserPlus className="h-5 w-5" />
                  Sign Up
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab("signin")
                    setAuthModalOpen(true)
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-white/80 hover:bg-white/90 active:bg-white/95 dark:bg-slate-600 dark:hover:bg-slate-500 dark:active:bg-slate-400 text-black dark:text-white font-semibold px-8 py-3 text-lg rounded-xl shadow-xl hover:shadow-2xl backdrop-blur-sm border border-white/40 dark:border-slate-500"
                >
                  <Shield className="h-5 w-5" />
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Modal for welcome step */}
        <AuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          defaultTab={authModalTab}
          title={authModalTab === "signup" ? "Create Your Citizen Account" : "Welcome Back"}
          description={authModalTab === "signup" ? "Join thousands of engaged citizens staying informed about their democracy." : "Sign in to access your personalized civic dashboard."}
        />
      </div>
    )
  }

  if (step === "auth-prompt") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-patriot-blue-50 via-white to-patriot-red-50 dark:from-patriot-gray-950 dark:via-patriot-gray-900 dark:to-patriot-gray-950 flex items-center justify-center p-4">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-2xl w-full">
          <Card className="patriot-card shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-patriot-blue-600 to-patriot-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-black dark:text-white">Save Your Preferences</CardTitle>
              <CardDescription className="text-base text-black/80 dark:text-white/80">
                Create an account to save your location and get personalized civic updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {validatedAddress && (
                <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-300">
                    <strong>Location Validated:</strong> {validatedAddress}
                  </AlertDescription>
                </Alert>
              )}

              {/* Benefits of creating an account */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black dark:text-white">With an account, you can:</h3>
                <div className="grid gap-3">
                  <div className="flex items-center space-x-3 p-3 bg-patriot-blue-50 dark:bg-patriot-blue-900/20 rounded-lg border border-patriot-blue-200 dark:border-patriot-blue-800">
                    <Star className="h-5 w-5 text-patriot-blue-600 dark:text-patriot-blue-400" />
                    <span className="text-sm text-black/80 dark:text-white/80">
                      Track legislation and save articles
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-black/80 dark:text-white/80">Get personalized notifications</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-patriot-red-50 dark:bg-patriot-red-900/20 rounded-lg border border-patriot-red-200 dark:border-patriot-red-800">
                    <Users className="h-5 w-5 text-patriot-red-600 dark:text-patriot-red-400" />
                    <span className="text-sm text-black/80 dark:text-white/80">Contact your representatives</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <MapPin className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm text-black/80 dark:text-white/80">Save multiple addresses</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full patriot-button-primary py-6 text-lg rounded-xl shadow-xl"
                >
                  Create Account & Save Location
                </Button>

                <Button
                  onClick={handleContinueWithoutAccount}
                  variant="outline"
                  className="w-full py-6 text-lg rounded-xl border-patriot-gray-300 dark:border-patriot-gray-600"
                >
                  Continue Without Account
                </Button>
              </div>

              <p className="text-xs text-black/80 dark:text-white/80 text-center">
                You can always create an account later from the main navigation
              </p>
            </CardContent>
          </Card>
        </div>

        <AuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          defaultTab="signup"
          title="Create Your Citizen Account"
          description="Join thousands of engaged citizens staying informed about their democracy."
        />
      </div>
    )
  }

  if (step === "address") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-patriot-blue-50 via-white to-patriot-red-50 dark:from-patriot-gray-950 dark:via-patriot-gray-900 dark:to-patriot-gray-950 flex items-center justify-center p-4">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-6xl w-full">
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              onClick={() => setStep("welcome")}
              className="mb-4 text-black/80 dark:text-white/80 hover:text-white hover:bg-blue-600 hover:border-blue-600 border border-transparent transition-all duration-200"
            >
              ← Back
            </Button>
            <h2 className="text-3xl font-bold text-black dark:text-white mb-4">Enter Your Address</h2>
            <p className="text-black/80 dark:text-white/80">
              We'll validate and find your representatives and local civic information
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Your Location Card */}
            <Card className="patriot-card shadow-2xl">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-patriot-blue-600 to-patriot-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl text-black dark:text-white">Your Location</CardTitle>
                <CardDescription className="text-black/80 dark:text-white/80">
                  Get personalized political updates based on where you live
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* What You'll Unlock Section */}
                <div className="p-4 bg-gradient-to-br from-patriot-blue-50 to-patriot-red-50 dark:from-patriot-blue-900/20 dark:to-patriot-red-900/20 rounded-xl border border-patriot-blue-200 dark:border-patriot-blue-800">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center">
                    🧭 What You'll Unlock
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-black/80 dark:text-white/80">
                      <span>🏛</span>
                      <span>Your Representatives & Voting Records</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-black/80 dark:text-white/80">
                      <span>📜</span>
                      <span>Relevant Bills & Local Legislation</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-black/80 dark:text-white/80">
                      <span>🗳</span>
                      <span>Upcoming Elections & Sample Ballots</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-black/80 dark:text-white/80">
                      <span>📬</span>
                      <span>One-Click Contact Tools</span>
                    </div>
                  </div>
                </div>

                {/* Privacy & Security Section */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center">
                    🔒 Privacy & Security
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-black/80 dark:text-white/80">
                      <span>🛡️</span>
                      <span>Your address is encrypted and never shared</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-black/80 dark:text-white/80">
                      <span>🔐</span>
                      <span>Only used to find your representatives</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-black/80 dark:text-white/80">
                      <span>❌</span>
                      <span>No marketing or data selling - ever</span>
                    </div>
                  </div>
                </div>

                {/* Keep all the existing validation alerts, input field, buttons, and other content below this */}
                {/* Validation Success */}
                {validatedAddress && (
                  <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-300">
                      <div className="space-y-2">
                        <div className="font-semibold">✅ Address Validated Successfully!</div>
                        <div className="text-sm">{validatedAddress}</div>
                        <div className="text-xs bg-green-100 dark:bg-green-800/30 p-2 rounded border border-green-200 dark:border-green-700">
                          🏛️ Loading your congressional district information...
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Validation Error */}
                {validationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Validation Error:</strong> {validationError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                      <strong>Suggestions:</strong>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="relative">
                  <Input
                    id="address"
                    placeholder="Start typing your address..."
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !loading && handleAddressSubmit()}
                    onFocus={() => address.length > 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className={`text-lg py-6 px-4 rounded-xl border-2 backdrop-blur-md bg-white/70 dark:bg-gray-800/70 text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 ${
                      validationError
                        ? "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400"
                        : "border-black/20 dark:border-white/30 focus:border-patriot-blue-600 dark:focus:border-patriot-blue-400 hover:border-black/30 dark:hover:border-white/40"
                    }`}
                    disabled={loading}
                    aria-describedby={validationError ? "address-error" : "address-help"}
                    aria-invalid={validationError ? "true" : "false"}
                    style={{
                      boxShadow: "none",
                      outline: "none",
                    }}
                  />

                  {/* Address Suggestions Dropdown */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-2 border-black/20 dark:border-white/30 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50/80 dark:hover:bg-blue-900/40 transition-colors text-sm text-black dark:text-white first:rounded-t-xl last:rounded-b-xl border-b border-gray-200/50 dark:border-gray-600/50 last:border-b-0"
                        >
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            {suggestion}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleAddressSubmit}
                      disabled={loading || !address.trim()}
                      className="flex-1 font-bold py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      style={{ 
                        backgroundColor: '#002868',
                        color: 'white'
                      }}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#001a4d'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#002868'}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          Validating...
                        </div>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Validate Address
                        </>
                      )}
                    </Button>

                    {(validationError || suggestions.length > 0) && (
                      <Button
                        onClick={handleTryAgain}
                        variant="outline"
                        className="px-6 py-6 rounded-xl border-patriot-gray-300 dark:border-patriot-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-black dark:text-white hover:text-black dark:hover:text-white hover:border-patriot-gray-400 dark:hover:border-patriot-gray-500"
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Map Card */}
            <Card className="patriot-card shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-black dark:text-white">
                  <Globe2 className="h-5 w-5 mr-2 text-blue-600" />
                  Interactive Map
                </CardTitle>
                <CardDescription className="text-black/80 dark:text-white/80">
                  Explore your state's representation — or verify your address for local-level insights
                </CardDescription>
              </CardHeader>
              <CardContent>

                <div className="relative w-full h-[500px] bg-white dark:bg-white/10 rounded-xl overflow-hidden border border-gray-200 dark:border-white/20 backdrop-blur-md">
                  <LeafletMap
                    selectedState={selectedState}
                    onStateClick={handleStateSelect}
                    onCountyClick={handleCountySelect}
                    selectedLocationPin={selectedLocationPin}
                    zoomToLocation={mapZoomLocation}
                    onReset={() => {
                      setSelectedLocationPin(null)
                      setMapZoomLocation(null)
                    }}
                    onError={(error) => console.error("Map Error:", error)}
                    onHover={(feature) => console.log("Hovering on:", feature)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (step === "state") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-patriot-blue-50 via-white to-patriot-red-50 dark:from-patriot-gray-950 dark:via-patriot-gray-900 dark:to-patriot-gray-950 p-4">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 pt-8">
            <Button
              variant="ghost"
              onClick={() => setStep("welcome")}
              className="mb-4 text-black/80 dark:text-white/80 hover:text-white hover:bg-blue-600 hover:border-blue-600 border border-transparent transition-all duration-200"
            >
              ← Back
            </Button>
            <h2 className="text-3xl font-bold text-black dark:text-white mb-4">Select Your State</h2>
            <p className="text-black/80 dark:text-white/80">
              Choose your state to get started with general civic information
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Interactive Map */}
            <Card className="patriot-card shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-black dark:text-white">
                  <Globe2 className="h-5 w-5 mr-2 text-patriot-blue-600 dark:text-patriot-blue-400" />
                  Interactive US Map
                </CardTitle>
                <CardDescription className="text-black/80 dark:text-white/80">
                  Click on any state to get started • Zoom and pan to explore
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-[500px] bg-white dark:bg-white/10 rounded-xl overflow-hidden border border-gray-200 dark:border-white/20 backdrop-blur-md">
                  <LeafletMap
                    onStateClick={handleStateSelect}
                    onCountyClick={handleCountySelect}
                    selectedState={selectedState}
                    selectedLocationPin={selectedLocationPin}
                    zoomToLocation={mapZoomLocation}
                    onReset={() => {
                      setSelectedLocationPin(null)
                      setMapZoomLocation(null)
                    }}
                    onError={(error) => console.error("Map Error:", error)}
                    onHover={(feature) => console.log("Hovering on:", feature)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* State List */}
            <Card className="patriot-card shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-black dark:text-white">
                  <MapPin className="h-5 w-5 mr-2 text-patriot-red-600 dark:text-patriot-red-400" />
                  All States & Territories
                </CardTitle>
                <CardDescription className="text-black/80 dark:text-white/80">
                  Search and sort by name or population
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StateSelector onStateSelect={handleStateSelect} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-black/80 dark:text-white/80 mb-4">
              Want more precise information for your area?
            </p>
            <Button
              variant="outline"
              onClick={() => setStep("address")}
              className="rounded-xl border-patriot-gray-300 dark:border-patriot-gray-600"
            >
              Enter Your Full Address Instead
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
