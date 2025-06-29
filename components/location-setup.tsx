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
  Vote,
  Scale,
  User,
  Phone,
  Mail,
  Newspaper,
  Megaphone,
  FileText,
  ArrowRight,
  Sparkles,
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
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/components/theme-provider"

// Dynamic import to prevent SSR issues
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-gray-600">Loading map...</div>
    </div>
  )
})

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

// Visual Narrative Carousel Component
function PreferenceCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  
  const slides = [
    {
      icon: Bell,
      title: "Stay Informed",
      subtitle: "Never miss what matters",
      description: "Get alerts about local school board votes, city council meetings, and legislation that affects your daily life.",
      example: "🏫 School Board Meeting Tomorrow: Budget Vote",
      color: "bg-blue-500 dark:bg-blue-600"
    },
    {
      icon: Users,
      title: "Take Action",
      subtitle: "Make your voice heard",
      description: "Contact your representatives with one click. Join campaigns and connect with like-minded citizens in your area.",
      example: "📞 Contact Rep. Johnson about Bill HR-1234",
      color: "bg-green-500 dark:bg-green-600"
    },
    {
      icon: MapPin,
      title: "Stay Connected",
      subtitle: "Personalized to your location",
      description: "Track multiple addresses - home, work, family. Get updates for all the places that matter to you.",
      example: "📍 3 locations saved • 12 active alerts",
      color: "bg-purple-500 dark:bg-purple-600"
    }
  ]

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [slides.length])

  const currentSlideData = slides[currentSlide]
  const IconComponent = currentSlideData.icon

  return (
    <div className="max-w-lg mx-auto text-center text-white px-8">
      {/* Main Content */}
      <div className="mb-8">
        <div className={`w-24 h-24 ${currentSlideData.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform transition-all duration-500 hover:scale-105`}>
          <IconComponent className="h-12 w-12 text-white" />
        </div>
        
        <h2 className="text-4xl font-bold mb-3 transition-all duration-500">
          {currentSlideData.title}
        </h2>
        
        <p className="text-xl text-blue-100 mb-4 font-medium">
          {currentSlideData.subtitle}
        </p>
        
        <p className="text-blue-200 text-lg leading-relaxed mb-6">
          {currentSlideData.description}
        </p>
        
        {/* Example Preview */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="text-sm text-blue-100 mb-1">Example:</div>
          <div className="text-white font-medium">{currentSlideData.example}</div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white shadow-lg' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// Signup Form Component
function SignupForm({ 
  validatedAddress, 
  onSignup, 
  onContinueAsGuest,
  onChangeLocation 
}: { 
  validatedAddress: string | null
  onSignup: () => void
  onContinueAsGuest: () => void
  onChangeLocation?: () => void
}) {
  const [activeTab, setActiveTab] = useState<'signup' | 'guest'>('signup')
  const [email, setEmail] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationFacts, setLocationFacts] = useState<any>(null)

  // Mock function to get location facts - in real app this would call an API
  const getLocationFacts = (address: string) => {
    // Extract state from address for demo purposes
    const stateMatch = address.match(/,\s*([A-Z]{2})\s*\d{5}/)
    const state = stateMatch ? stateMatch[1] : 'Unknown'
    
    // Mock data - in real app this would come from Census API
    const mockFacts = {
      'CA': { population: '39.5M', counties: 58, founded: 1850, nickname: 'Golden State' },
      'TX': { population: '30.0M', counties: 254, founded: 1845, nickname: 'Lone Star State' },
      'NY': { population: '19.3M', counties: 62, founded: 1788, nickname: 'Empire State' },
      'FL': { population: '22.6M', counties: 67, founded: 1845, nickname: 'Sunshine State' },
      'IL': { population: '12.6M', counties: 102, founded: 1818, nickname: 'Prairie State' },
    }
    
    return mockFacts[state as keyof typeof mockFacts] || { 
      population: '2.1M', 
      counties: 64, 
      founded: 1876, 
      nickname: 'Great State' 
    }
  }

  React.useEffect(() => {
    if (validatedAddress) {
      const facts = getLocationFacts(validatedAddress)
      setLocationFacts(facts)
    }
  }, [validatedAddress])

  return (
    <div className="space-y-6">
      {/* Location Summary Section */}
      {validatedAddress && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 dark:bg-blue-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-white" />
                <span className="text-white font-semibold">Your Location</span>
              </div>
              <button
                onClick={onChangeLocation}
                className="text-blue-100 hover:text-white text-sm font-medium hover:underline transition-colors"
              >
                Change Location
              </button>
            </div>
          </div>
          
          {/* Location Details */}
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Validated Address</div>
              <div className="text-slate-900 dark:text-white font-semibold">{validatedAddress}</div>
            </div>
            
            {/* County Facts */}
            {locationFacts && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">State Population</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{locationFacts.population}</div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Counties</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">{locationFacts.counties}</div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Statehood</div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{locationFacts.founded}</div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Nickname</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{locationFacts.nickname}</div>
                </div>
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">What you'll discover:</span>
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <div>• Your federal and state representatives</div>
                <div>• Local legislation and ballot measures</div>
                <div>• Upcoming elections and voting locations</div>
                <div>• Community meetings and civic events</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('signup')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'signup'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Create Account
        </button>
        <button
          onClick={() => setActiveTab('guest')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'guest'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Continue as Guest
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'signup' ? (
        <div className="space-y-4">
          {/* Benefits Preview */}
          <div className="grid gap-3 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Save & track legislation</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Bookmark bills that matter to you</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Smart notifications</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Only get alerts you care about</div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                ZIP Code
              </label>
              <Input
                type="text"
                placeholder="12345"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onSignup}
            disabled={loading || !email || !zipCode}
            className="w-full bg-patriot-blue-600 hover:bg-patriot-blue-700 dark:bg-patriot-blue-700 dark:hover:bg-patriot-blue-800 text-white font-semibold py-4 text-base rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Creating Account...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Start Your Dashboard
              </div>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Guest Benefits */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start space-x-3">
              <Globe2 className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Explore without signing up
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Browse civic info for your area • Create account anytime to save progress
                </div>
              </div>
            </div>
          </div>

          {/* ZIP Code Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              ZIP Code (Optional)
            </label>
            <Input
              type="text"
              placeholder="Enter ZIP to see local info"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Guest CTA */}
          <Button
            onClick={onContinueAsGuest}
            variant="outline"
            className="w-full py-4 text-base rounded-xl border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
          >
            <Globe2 className="h-5 w-5 mr-2" />
            Explore Without Account
          </Button>
        </div>
      )}
    </div>
  )
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
  const { theme } = useTheme()
  
  // Debounce address for real-time geocoding
  const debouncedAddress = useDebounce(address, 1000)

  // Glass card styles that adapt to light/dark mode
  const isDark = theme === 'dark'
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
      googleLoaded: !!window.google,
      existingScript: !!document.querySelector('script[src*="maps.googleapis.com"]')
    })
    
    // Check if Google Maps script is already loaded or loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log("Google Maps script already exists, skipping load")
      return
    }
    
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
      script.id = "google-maps-script" // Add ID to prevent duplicates
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

  const handleChangeLocation = () => {
    setValidatedAddress(null)
    setPendingLocationData(null)
    setSelectedLocationPin(null)
    setMapZoomLocation(null)
    setStep("address")
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <img src="/logo.png" alt="Citizen Logo" className="h-20 w-20 rounded-2xl shadow-xl object-contain" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-900 shadow-sm animate-pulse"></div>
                </div>
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                Your Voice in
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  American Democracy
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto mb-12">
                Stay informed, engaged, and empowered with personalized civic information tailored to your location. See exactly what's happening in your community.
              </p>
            </div>

            {/* Main Action Section */}
            <div className="text-center mb-16">

              {/* Primary CTA */}
              <div className="mb-8">
                <button
                  onClick={() => setStep("address")}
                  className="group relative inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-12 py-5 text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <MapPin className="h-6 w-6" />
                  Get Started with Your Address
                  <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </div>

              {/* Secondary Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => {
                    setAuthModalTab("signup")
                    setAuthModalOpen(true)
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 text-base rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <UserPlus className="h-5 w-5" />
                  Create Account
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab("signin")
                    setAuthModalOpen(true)
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold px-8 py-3 text-base rounded-xl shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-600 transition-all duration-200"
                >
                  <Shield className="h-5 w-5" />
                  Sign In
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm mt-8">
                <Shield className="w-4 h-4 mr-2" />
                Free forever. No credit card required. Privacy protected.
              </div>
            </div>

            {/* Dashboard Preview Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full text-sm font-medium text-blue-700 dark:text-blue-300 mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                Preview Your Dashboard
              </div>
              
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Here's What You'll See
              </h2>
              
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12">
                Get a sneak peek at your personalized civic dashboard for Manhattan, NYC. These are the tools that will keep you informed and engaged.
              </p>

              {/* Interactive Dashboard Previews */}
              <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Elections Dashboard Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg flex items-center">
                        <Vote className="w-5 h-5 mr-2" />
                        Elections Dashboard
                      </h3>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Next Election</span>
                      <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">325 days</span>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">NYC Mayoral Election</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">November 4, 2025 • Primary TBD</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Eric Adams</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">Incumbent</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Manhattan Borough President</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">Also on Ballot</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">Registered to Vote</span>
                      </div>
                      <button className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700">
                        View Ballot
                      </button>
                    </div>
                  </div>
                </div>

                {/* Legislation Tracker Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg flex items-center">
                        <Scale className="w-5 h-5 mr-2" />
                        Active Legislation
                      </h3>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">NYC Council Bills</span>
                      <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">4 active</span>
                    </div>
                    <div className="space-y-3">
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded">Intro 0734-2024</span>
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">High Priority</span>
                        </div>
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Housing Preservation & Development</h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Affordable housing initiatives for NYC</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Updated 3 days ago</span>
                          <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Track</button>
                        </div>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">Intro 0889-2024</span>
                          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Medium</span>
                        </div>
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Climate Resiliency & Environmental Justice</h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Environmental protection measures</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Updated 1 week ago</span>
                          <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Track</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Representatives Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Your Representatives
                      </h3>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Manhattan, NY</span>
                      <span className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">6 officials</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">CS</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white text-sm">Sen. Chuck Schumer</h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400">U.S. Senate Majority Leader • Democrat</p>
                        </div>
                        <div className="flex space-x-1">
                          <button className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                            <Phone className="w-3 h-3" />
                          </button>
                          <button className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                            <Mail className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">JN</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white text-sm">Rep. Jerry Nadler</h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400">NY-12 House District • Democrat</p>
                        </div>
                        <div className="flex space-x-1">
                          <button className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                            <Phone className="w-3 h-3" />
                          </button>
                          <button className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                            <Mail className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* News & Action Center Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-lg flex items-center">
                        <Newspaper className="w-5 h-5 mr-2" />
                        News & Actions
                      </h3>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full hover:w-4 hover:h-4 transition-all duration-200 cursor-pointer"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="border-l-4 border-blue-500 pl-3 py-2">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">NYC Council Housing Committee Meeting</h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Affordable housing initiatives discussed</p>
                        <span className="text-xs text-blue-600 dark:text-blue-400">NYC.gov • 1 day ago</span>
                      </div>
                      <div className="border-l-4 border-green-500 pl-3 py-2">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Manhattan Borough President Budget Hearing</h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Community input session scheduled</p>
                        <span className="text-xs text-green-600 dark:text-green-400">Manhattan BP • 2 days ago</span>
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Public Comment Period</span>
                        <Megaphone className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">Congestion pricing implementation feedback needed</p>
                      <button className="text-xs bg-yellow-600 text-white px-3 py-1 rounded-full hover:bg-yellow-700">
                        Submit Comment
                      </button>
                    </div>
                  </div>
                </div>
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
      <div className="preferences-v2 min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        
        {/* Split Screen Layout - Stack on mobile */}
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Left Panel - Visual Storytelling (60% on desktop, full width on mobile) */}
          <div className="w-full lg:w-3/5 relative bg-patriot-blue-600 dark:bg-patriot-blue-800 flex items-center justify-center overflow-hidden min-h-[40vh] lg:min-h-screen">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full animate-pulse"></div>
              <div className="absolute bottom-32 right-32 w-24 h-24 bg-white rounded-full animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full animate-pulse delay-2000"></div>
            </div>
            
            {/* Visual Narrative Carousel */}
            <PreferenceCarousel />
          </div>

          {/* Right Panel - Signup Form */}
          <div className="w-full lg:w-2/5 h-[60vh] lg:h-full relative bg-white dark:bg-slate-900 flex-1 flex items-center justify-center p-6 lg:p-8">
            <div className="w-full max-w-md">
              <SignupForm
                validatedAddress={validatedAddress}
                onSignup={handleAuthSuccess}
                onContinueAsGuest={handleContinueWithoutAccount}
                onChangeLocation={handleChangeLocation}
              />
            </div>
          </div>
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
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Address Input & Information */}
        <div className="w-full lg:w-1/3 h-auto lg:h-full bg-white dark:bg-slate-900 lg:border-r border-slate-200 dark:border-slate-700 flex flex-col max-h-[60vh] lg:max-h-none">
          {/* Header Section */}
          <div className="p-3 sm:p-4 lg:p-8 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            {/* Top row with back button and theme toggle */}
            <div className="flex items-center justify-between mb-3 lg:mb-6">
              <Button
                variant="ghost"
                onClick={() => setStep("welcome")}
                className="text-slate-600 dark:text-slate-400 hover:text-patriot-blue-600 dark:hover:text-patriot-blue-400 hover:bg-patriot-blue-50 dark:hover:bg-patriot-blue-900/20 transition-all duration-200 btn-mobile text-sm lg:text-base"
              >
                ← Back to Welcome
              </Button>
              <ThemeToggle />
            </div>
            
            <div className="space-y-2 lg:space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-patriot-blue-600 dark:bg-patriot-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <MapPin className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white truncate">Your Location</h1>
                  <p className="text-xs lg:text-base text-slate-600 dark:text-slate-400 truncate">Discover your civic information</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address Input Section - Scrollable on mobile, compact */}
          <div className="flex-1 p-3 sm:p-4 lg:p-8 space-y-3 lg:space-y-6 overflow-y-auto">
            {/* Status Messages */}
            {validatedAddress && (
              <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 shadow-sm">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-300">
                  <div className="space-y-2">
                    <div className="font-semibold text-xs lg:text-base">✅ Address Validated!</div>
                    <div className="text-xs lg:text-sm bg-green-100 dark:bg-green-800/30 p-2 lg:p-3 rounded-lg border border-green-200 dark:border-green-700">
                      <strong>Confirmed Address:</strong><br />
                      {validatedAddress}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-800/30 p-2 rounded border border-green-200 dark:border-green-700">
                      🏛️ Loading congressional district information...
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationError && (
              <Alert variant="destructive" className="shadow-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs lg:text-base">
                  <strong>Validation Error:</strong> {validationError}
                </AlertDescription>
              </Alert>
            )}

            {suggestions.length > 0 && (
              <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 shadow-sm">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  <strong>Suggestions to improve your search:</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} className="text-xs lg:text-sm">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Address Input */}
            <div className="space-y-2 lg:space-y-4">
              <div>
                <label htmlFor="address" className="block text-xs lg:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 lg:mb-2">
                  Enter Your Full Address
                </label>
                <div className="relative">
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State 12345"
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !loading && handleAddressSubmit()}
                    onFocus={() => address.length > 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className={`text-xs lg:text-base py-2 lg:py-4 px-3 lg:px-4 rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-all duration-200 btn-mobile ${
                      validationError
                        ? "border-patriot-red-400 dark:border-patriot-red-500 focus:border-patriot-red-500 dark:focus:border-patriot-red-400"
                        : "border-patriot-gray-300 dark:border-patriot-gray-600 focus:border-patriot-blue-500 dark:focus:border-patriot-blue-400 hover:border-patriot-gray-400 dark:hover:border-patriot-gray-500"
                    }`}
                    disabled={loading}
                    style={{ boxShadow: "none" }}
                  />

                  {/* Address Suggestions Dropdown */}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl shadow-xl z-20 max-h-32 lg:max-h-48 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-3 lg:px-4 py-2 lg:py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs lg:text-sm text-slate-900 dark:text-white first:rounded-t-xl last:rounded-b-xl border-b border-slate-200 dark:border-slate-600 last:border-b-0 btn-mobile"
                        >
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 lg:h-4 lg:w-4 mr-2 lg:mr-3 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                            <span className="truncate text-xs lg:text-sm">{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 lg:space-y-3">
                <Button
                  onClick={handleAddressSubmit}
                  disabled={loading || !address.trim()}
                  className="w-full font-semibold py-2 lg:py-4 text-xs lg:text-base rounded-xl bg-patriot-blue-600 hover:bg-patriot-blue-700 dark:bg-patriot-blue-700 dark:hover:bg-patriot-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-mobile-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-3 w-3 lg:h-5 lg:w-5 mr-2" />
                      <span className="text-xs lg:text-base">Validating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 lg:h-5 lg:w-5 mr-2" />
                      <span className="text-xs lg:text-base">Validate & Locate</span>
                    </div>
                  )}
                </Button>

                {(validationError || suggestions.length > 0) && (
                  <Button
                    onClick={handleTryAgain}
                    variant="outline"
                    className="w-full py-2 lg:py-4 text-xs lg:text-base rounded-xl border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 btn-mobile-lg"
                  >
                    Try Different Address
                  </Button>
                )}
              </div>
            </div>

            {/* Alternative Options - Compact on mobile */}
            <div className="pt-2 lg:pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center space-y-2 lg:space-y-4">
                <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Alternative Options
                </p>
                
                <div className="space-y-1 lg:space-y-3">
                  <Button
                    onClick={handleUseMyLocation}
                    variant="outline"
                    disabled={loading}
                    className="w-full py-1.5 lg:py-3 text-xs lg:text-sm rounded-lg border-patriot-blue-300 dark:border-patriot-blue-600 bg-white dark:bg-slate-800 hover:bg-patriot-blue-50 dark:hover:bg-patriot-blue-900/20 hover:text-patriot-blue-700 dark:hover:text-patriot-blue-300 text-patriot-blue-600 dark:text-patriot-blue-400 hover:border-patriot-blue-400 dark:hover:border-patriot-blue-500 transition-all duration-200 btn-mobile"
                  >
                    <Globe2 className="h-3 w-3 lg:h-4 lg:w-4 mr-2" />
                    Use My Current Location
                  </Button>
                  
                  <Button
                    onClick={() => setStep("state")}
                    variant="ghost"
                    className="w-full py-1.5 lg:py-3 text-xs lg:text-sm rounded-lg text-slate-600 dark:text-slate-400 hover:text-patriot-blue-600 dark:hover:text-patriot-blue-400 hover:bg-patriot-blue-50 dark:hover:bg-patriot-blue-900/20 btn-mobile"
                  >
                    Browse by State Instead
                  </Button>
                </div>
              </div>
            </div>

            {/* Information Cards - Hide on mobile to save space */}
            <div className="hidden lg:block pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                What You'll Discover
              </h3>
              
              <div className="grid gap-3">
                <div className="flex items-start space-x-3 p-3 bg-patriot-blue-50 dark:bg-patriot-blue-900/20 rounded-lg border border-patriot-blue-200 dark:border-patriot-blue-800">
                  <Flag className="h-5 w-5 text-patriot-blue-600 dark:text-patriot-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-patriot-blue-900 dark:text-patriot-blue-100">
                      Your Representatives</div>
                    <div className="text-xs text-patriot-blue-700 dark:text-patriot-blue-300">
                      Federal, state, and local officials
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-green-900 dark:text-green-100">
                      Local Legislation
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">
                      Bills and measures affecting you
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      Civic Information
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-300">
                      Voting locations, districts, and more
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="w-full lg:w-2/3 h-[40vh] lg:h-full relative bg-patriot-gray-100 dark:bg-patriot-gray-800 flex-1">
          {/* Full Map - No padding, fills entire container */}
          <div className="absolute inset-0 w-full h-full">
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
              className="w-full h-full"
              fullHeight={true}
            />
          </div>
        </div>
      </div>
    )
  }

  if (step === "state") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-2 sm:p-4">
        {/* Theme Toggle */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 sm:mb-8 pt-6 sm:pt-8">
            <Button
              variant="ghost"
              onClick={() => setStep("welcome")}
              className="mb-3 sm:mb-4 text-black/80 dark:text-white/80 hover:text-white hover:bg-patriot-blue-600 hover:border-patriot-blue-600 border border-transparent transition-all duration-200 btn-mobile"
            >
              ← Back
            </Button>
            <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-3 sm:mb-4">Select Your State</h2>
            <p className="text-sm sm:text-base text-black/80 dark:text-white/80">
              Choose your state to get started with general civic information
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Interactive Map */}
            <Card className="patriot-card shadow-2xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-black dark:text-white text-lg sm:text-xl">
                  <Globe2 className="h-4 sm:h-5 sm:w-5 mr-2 text-patriot-blue-600 dark:text-patriot-blue-400" />
                  Interactive US Map
                </CardTitle>
                <CardDescription className="text-black/80 dark:text-white/80 text-sm">
                  Click on any state to get started • Zoom and pan to explore
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="relative w-full h-[40vh] sm:h-[45vh] lg:h-[60vh] max-h-[600px] bg-white dark:bg-white/10 rounded-xl overflow-hidden border border-gray-200 dark:border-white/20 backdrop-blur-md">
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
                    fullHeight={true}
                  />
                </div>
              </CardContent>
            </Card>

            {/* State List */}
            <Card className="patriot-card shadow-2xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-black dark:text-white text-lg sm:text-xl">
                  <MapPin className="h-4 sm:h-5 sm:w-5 mr-2 text-patriot-red-600 dark:text-patriot-red-400" />
                  All States & Territories
                </CardTitle>
                <CardDescription className="text-black/80 dark:text-white/80 text-sm">
                  Search and sort by name or population
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <StateSelector onStateSelect={handleStateSelect} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-black/80 dark:text-white/80 mb-3 sm:mb-4">
              Want more precise information for your area?
            </p>
            <Button
              variant="outline"
              onClick={() => setStep("address")}
              className="rounded-xl border-patriot-gray-300 dark:border-patriot-gray-600 btn-mobile"
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
