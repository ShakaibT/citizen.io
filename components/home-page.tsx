"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  ChevronRight,
  Shield,
  Vote,
  Scale,
  Newspaper,
  Megaphone,
  ArrowRight,
  MapPin,
  Edit,
  ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useLocation } from "@/components/location-provider"
import { AuthModal } from "@/components/auth-modal"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Dynamic import to prevent SSR issues
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-gray-600">Loading map...</div>
    </div>
  )
})

export function HomePage() {
  const { user } = useAuth()
  const { location, setLocation, clearLocation, setShowLocationSetup } = useLocation()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin")
  
  // Force welcome screen to always show on the home page
  const [showWelcome, setShowWelcome] = useState(true)
  const [selectedState, setSelectedState] = useState<string | null>(null)

  // Clear any saved location data and force welcome screen
  useEffect(() => {
    // Clear all location-related storage
    localStorage.removeItem("citizen-location")
    sessionStorage.removeItem("citizen-location")
    localStorage.removeItem("citizen-seen-welcome")
    sessionStorage.removeItem("citizen-seen-welcome")
    
    // Clear the location from the location provider
    clearLocation()
    
    // Force welcome screen to show
    setShowWelcome(true)
  }, [clearLocation])

  const handleGetStarted = () => {
    if (!location) {
      // If no location is set, show location setup
      setShowLocationSetup(true)
    } else {
      // If location is set, redirect to dashboard
      window.location.href = "/dashboard"
    }
    
    setShowWelcome(false)
  }

  const handleSignIn = () => {
    setAuthModalTab("signin")
    setAuthModalOpen(true)
  }

  const handleChangeLocation = () => {
    clearLocation()
    // This will trigger the LocationProvider to show the location setup
  }

  const handleMapStateClick = (stateName: string) => {
    // Set the selected state for the Officials legend
    setSelectedState(stateName)
    
    // Create a basic location object for state-level selection
    const stateLocation = {
      address: `${stateName}, USA`,
      city: stateName,
      state: stateName,
      zipCode: "",
      latitude: 39.8283, // Default center
      longitude: -98.5795,
    }
    setLocation(stateLocation)
  }

  const handleMapCountyClick = (countyName: string, stateName: string) => {
    // Keep the selected state for the Officials legend
    setSelectedState(stateName)
    
    // Create a location object for county-level selection
    const countyLocation = {
      address: `${countyName}, ${stateName}, USA`,
      city: countyName.replace(" County", ""),
      state: stateName,
      zipCode: "",
      latitude: 39.8283, // Default center
      longitude: -98.5795,
      county: countyName,
    }
    setLocation(countyLocation)
  }

  const handleMapReset = () => {
    // Clear the selected state when reset is clicked
    setSelectedState(null)
  }

  // Show welcome page first, regardless of saved location
  if (showWelcome) {
    return (
      <>
        {/* Hero Section - Your Voice in American Democracy */}
        <section className="relative bg-white dark:bg-black padding-responsive-sm">
          <div className="container-responsive">
            {/* Mobile: Flex column reverse to show map first, Desktop: Grid with proper order */}
            <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-6 lg:gap-12 items-center min-h-[300px] lg:min-h-[400px]">
              <div className="space-y-4 lg:space-y-6 lg:pr-8 flex flex-col justify-center">
                <div>
                  <h1 className="text-responsive-xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                    <span className="block">Your Voice in</span>
                    <span className="block gradient-text">American Democracy</span>
                  </h1>
                  <p className="mt-4 lg:mt-6 text-responsive-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Stay informed, engaged, and empowered with personalized civic information tailored to your location.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={handleGetStarted} 
                    className="get-started-btn btn-mobile-lg"
                  >
                    Get Started with Your Address
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  {!user && (
                    <button onClick={handleSignIn} className="auth-button btn-mobile-lg">
                      Sign In / Sign Up
                    </button>
                  )}
                </div>

                <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                  <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Free access to essential civic information. No credit card required.</span>
                </div>
              </div>

              <div className="relative flex items-center justify-center mb-6 lg:mb-0">
                {/* Map container with proper dark mode styling */}
                <div className="relative bg-white dark:bg-white/10 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-white/20 backdrop-blur-md w-full max-w-lg lg:max-w-none">
                  <div className="p-3 sm:p-4 lg:p-6">
                    <div className="mb-3 lg:mb-4 flex items-center justify-between">
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Interactive US Map</h3>
                    </div>

                    <div className="w-full h-[30vh] sm:h-[35vh] lg:h-[40vh] max-h-[400px]">
                      <LeafletMap
                        onStateClick={handleMapStateClick}
                        onCountyClick={handleMapCountyClick}
                        selectedState={selectedState}
                        zoomToLocation={null}
                        selectedLocationPin={null}
                        onReset={handleMapReset}
                        onError={(error) => console.error("Map Error:", error)}
                        onHover={(feature) => console.log("Hovering on:", feature)}
                        fullHeight={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-50 dark:bg-gray-900 padding-responsive-sm">
          <div className="container-responsive">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-responsive-lg font-bold text-gray-900 dark:text-white">Everything You Need to Stay Engaged</h2>
              <p className="mt-3 text-responsive-sm text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Citizen provides all the tools and information you need to participate meaningfully in democracy.
              </p>
            </div>

            <div className="grid-responsive-cards">
              {[
                {
                  icon: Scale,
                  title: "Legislation",
                  description: "Track bills and laws that matter to you at local, state, and federal levels.",
                  href: "/legislation",
                },
                {
                  icon: Newspaper,
                  title: "News",
                  description: "Get balanced, fact-based news about civic issues relevant to your community.",
                  href: "/news",
                },
                {
                  icon: Vote,
                  title: "Elections",
                  description: "Stay informed about upcoming elections, candidates, and voting information.",
                  href: "/elections",
                },
                {
                  icon: Megaphone,
                  title: "Action Center",
                  description: "Find opportunities to make your voice heard through civic engagement.",
                  href: "/action-center",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 h-full flex flex-col"
                >
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md mb-4 flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3 flex-grow">{feature.description}</p>
                  <Link
                    href={feature.href}
                    className="inline-flex items-center text-primary dark:text-patriot-blue-400 font-medium hover:text-primary/80 dark:hover:text-patriot-blue-300 mt-auto"
                  >
                    Learn more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-red-600 padding-responsive-sm">
          <div className="container-responsive text-center">
            <h2 className="text-responsive-lg font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-responsive-sm text-white/90 max-w-3xl mx-auto mb-6">
              Join thousands of citizens who are making a difference in their communities.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="get-started-btn btn-mobile-lg"
              >
                Get Started
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
              {!user && (
                <button
                  onClick={handleSignIn}
                  className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold py-3 px-8 rounded-lg transition-all duration-200 inline-flex items-center justify-center btn-mobile-lg"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </div>
        </section>

        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab={authModalTab} />
      </>
    )
  }

  return (
    <>
      {/* Location Display Section - Show when location is set */}
      {location && (
        <section className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-b border-green-200 dark:border-green-800">
          <div className="container-responsive padding-responsive-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Your Civic Hub</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      Personalized for {location.city}, {location.state}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={handleChangeLocation}
                  variant="outline"
                  size="sm"
                  className="bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white btn-mobile"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Change Location
                </Button>
                <Button onClick={handleGetStarted} size="sm" className="bg-green-600 hover:bg-green-700 text-white btn-mobile">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue to Dashboard
                </Button>
              </div>
            </div>

            {/* Simple Dashboard Preview */}
            <div className="mt-6 grid-responsive-cards">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Scale className="h-6 w-6 text-patriot-blue-600 dark:text-patriot-blue-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">3 Active Bills</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">2 need your action</div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-patriot-blue-100 dark:bg-patriot-blue-900/30 text-patriot-blue-800 dark:text-patriot-blue-300">
                      Urgent: Climate Bill
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Vote className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Next Election</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">School Board - 45 days</div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      Registered ✓
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Newspaper className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Local News</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">5 new articles today</div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      Infrastructure Plan
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Megaphone className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Action Items</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">4 opportunities</div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                      Town Hall Tonight
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section - Your Voice in American Democracy */}
      <section className="relative bg-white dark:bg-black padding-responsive-sm">
        <div className="container-responsive">
          {/* Mobile: Flex column reverse to show map first, Desktop: Grid with proper order */}
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-6 lg:gap-12 items-center min-h-[300px] lg:min-h-[400px]">
            <div className="space-y-4 lg:space-y-6 lg:pr-8 flex flex-col justify-center">
              <div>
                <h1 className="text-responsive-xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                  <span className="block">Your Voice in</span>
                  <span className="block gradient-text">American Democracy</span>
                </h1>
                <p className="mt-4 lg:mt-6 text-responsive-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Stay informed, engaged, and empowered with personalized civic information tailored to your location.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleGetStarted} 
                  className="get-started-btn btn-mobile-lg"
                >
                  {location ? "Go to Dashboard" : "Get Started with Your Address"}
                  <ChevronRight className="h-5 w-5" />
                </button>
                {!user && (
                  <button onClick={handleSignIn} className="auth-button btn-mobile-lg">
                    Sign In / Sign Up
                  </button>
                )}
              </div>

              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Free access to essential civic information. No credit card required.</span>
              </div>
            </div>

            <div className="relative flex items-center justify-center mb-6 lg:mb-0">
              {/* Map container with proper dark mode styling */}
              <div className="relative bg-white dark:bg-white/10 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-white/20 backdrop-blur-md w-full max-w-lg lg:max-w-none">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="mb-3 lg:mb-4 flex items-center justify-between">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Interactive US Map</h3>
                    {location && (
                      <Button onClick={handleChangeLocation} variant="outline" size="sm" className="text-xs btn-mobile">
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Change
                      </Button>
                    )}
                  </div>

                  <div className="w-full h-[30vh] sm:h-[35vh] lg:h-[40vh] max-h-[400px]">
                    <LeafletMap
                      onStateClick={handleMapStateClick}
                      onCountyClick={handleMapCountyClick}
                      selectedState={selectedState}
                      zoomToLocation={null}
                      selectedLocationPin={null}
                      onReset={handleMapReset}
                      onError={(error) => console.error("Map Error:", error)}
                      onHover={(feature) => console.log("Hovering on:", feature)}
                      fullHeight={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 dark:bg-gray-900 padding-responsive-sm">
        <div className="container-responsive">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-responsive-lg font-bold text-gray-900 dark:text-white">Everything You Need to Stay Engaged</h2>
            <p className="mt-3 text-responsive-sm text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Citizen provides all the tools and information you need to participate meaningfully in democracy.
            </p>
          </div>

          <div className="grid-responsive-cards">
            {[
              {
                icon: Scale,
                title: "Legislation",
                description: "Track bills and laws that matter to you at local, state, and federal levels.",
                href: "/legislation",
              },
              {
                icon: Newspaper,
                title: "News",
                description: "Get balanced, fact-based news about civic issues relevant to your community.",
                href: "/news",
              },
              {
                icon: Vote,
                title: "Elections",
                description: "Stay informed about upcoming elections, candidates, and voting information.",
                href: "/elections",
              },
              {
                icon: Megaphone,
                title: "Action Center",
                description: "Find opportunities to make your voice heard through civic engagement.",
                href: "/action-center",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 h-full flex flex-col"
              >
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md mb-4 flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3 flex-grow">{feature.description}</p>
                <Link
                  href={feature.href}
                  className="inline-flex items-center text-primary dark:text-patriot-blue-400 font-medium hover:text-primary/80 dark:hover:text-patriot-blue-300 mt-auto"
                >
                  Learn more
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-red-600 padding-responsive-sm">
        <div className="container-responsive text-center">
          <h2 className="text-responsive-lg font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-responsive-sm text-white/90 max-w-3xl mx-auto mb-6">
            Join thousands of citizens who are making a difference in their communities.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="get-started-btn btn-mobile-lg"
            >
              {location ? "Go to Dashboard" : "Get Started"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </button>
            {!user && (
              <button
                onClick={handleSignIn}
                className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold py-3 px-8 rounded-lg transition-all duration-200 inline-flex items-center justify-center btn-mobile-lg"
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </section>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab={authModalTab} />
    </>
  )
}
