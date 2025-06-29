"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  Bell,
  Users,
  Globe2,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  PlayCircle,
  Pause,
  Volume2,
  VolumeX
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useLocation } from "@/components/location-provider"
import { AuthModal } from "@/components/auth-modal"
import { AnimatedTutorial } from "@/components/animated-tutorial"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

// Dynamic import to prevent SSR issues
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
      <div className="text-gray-600">Loading map...</div>
    </div>
  )
})

// Mock data for previews
const mockRepresentatives = [
  {
    name: "Rep. Sarah Johnson",
    title: "U.S. Representative",
    party: "Democrat",
    district: "PA-10",
    phone: "(202) 225-4315",
    email: "contact@johnson.house.gov",
    image: "/placeholder-user.jpg"
  },
  {
    name: "Sen. Michael Chen",
    title: "U.S. Senator",
    party: "Republican", 
    district: "Pennsylvania",
    phone: "(202) 224-4254",
    email: "senator@chen.senate.gov",
    image: "/placeholder-user.jpg"
  }
]

const mockLegislation = [
  {
    id: "HR-1234",
    title: "Infrastructure Investment Act",
    status: "Passed House",
    summary: "Allocates $2.1B for road and bridge improvements in Pennsylvania",
    lastAction: "2 days ago",
    relevance: "High",
    category: "Infrastructure"
  },
  {
    id: "SB-567",
    title: "Education Funding Reform",
    status: "In Committee", 
    summary: "Increases per-pupil funding by 15% for rural school districts",
    lastAction: "1 week ago",
    relevance: "Medium",
    category: "Education"
  }
]

const mockNews = [
  {
    title: "City Council Approves New Park Development",
    source: "Local News Today",
    time: "3 hours ago",
    category: "Local Government",
    excerpt: "The $1.2M project will add recreational facilities to downtown area..."
  },
  {
    title: "School Board Meeting: Budget Vote Tonight",
    source: "Education Weekly",
    time: "6 hours ago", 
    category: "Education",
    excerpt: "Board to vote on proposed 8% budget increase for next fiscal year..."
  }
]

export function HomePage() {
  const { user } = useAuth()
  const { location, setLocation, clearLocation, setShowLocationSetup, showTutorial, setShowTutorial } = useLocation()
  const router = useRouter()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin")
  const [selectedState, setSelectedState] = useState<string | null>(null)
  
  // Interactive preview states
  const [activePreview, setActivePreview] = useState("representatives")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBill, setSelectedBill] = useState(0)

  // Auto-cycle through previews for the right side preview (keeping for existing functionality)
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePreview(prev => {
        const previews = ["representatives", "legislation", "news", "action"]
        const currentIndex = previews.indexOf(prev)
        return previews[(currentIndex + 1) % previews.length]
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleGetStarted = () => {
    if (location) {
      router.push('/dashboard')
    } else {
      setShowLocationSetup(true)
    }
  }

  const handleSignIn = () => {
    setAuthModalTab("signin")
    setAuthModalOpen(true)
  }

  const handleMapStateClick = (stateName: string) => {
    setSelectedState(stateName)
    if (!location || (location.address === `${location.state}, USA` && location.zipCode === "")) {
      const stateLocation = {
        address: `${stateName}, USA`,
        city: stateName,
        state: stateName,
        zipCode: "",
        latitude: 39.8283,
        longitude: -98.5795,
      }
      setLocation(stateLocation)
    }
  }

  const handleMapCountyClick = (countyName: string, stateName: string) => {
    setSelectedState(stateName)
    if (!location || (location.address === `${location.state}, USA` && location.zipCode === "") ||
        (location.address === `${location.county}, ${location.state}, USA` && location.zipCode === "")) {
      const countyLocation = {
        address: `${countyName}, ${stateName}, USA`,
        city: countyName.replace(" County", ""),
        state: stateName,
        zipCode: "",
        latitude: 39.8283,
        longitude: -98.5795,
        county: countyName,
      }
      setLocation(countyLocation)
    }
  }

  const handleMapReset = () => {
    setSelectedState(null)
  }

  return (
    <>
      {/* Hero Section with Interactive Preview */}
      <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Left Column - Hero Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm font-medium text-blue-700 dark:text-blue-300">
                  <Globe2 className="w-4 h-4 mr-2" />
                  Civic Engagement Made Simple
                </div>
                
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                  Your Voice in
                  <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    American Democracy
                  </span>
                </h1>
                
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg">
                  Stay informed, engaged, and empowered with personalized civic information tailored to your location. See exactly what's happening in your community.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {location ? "Go to Dashboard" : "Get Started with Your Address"}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                
                <Button 
                  onClick={() => setShowTutorial(true)}
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-lg rounded-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-105 transition-all duration-200"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                <Shield className="w-4 h-4 mr-2" />
                Free access to essential civic information. No credit card required.
              </div>
            </div>

            {/* Right Column - Interactive Preview */}
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Preview Header */}
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Live Preview
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview Navigation */}
                  <div className="flex space-x-1 mt-4">
                    {[
                      { id: "representatives", label: "Representatives", icon: Users },
                      { id: "legislation", label: "Legislation", icon: Scale },
                      { id: "news", label: "News", icon: Newspaper },
                      { id: "action", label: "Take Action", icon: Megaphone }
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setActivePreview(id)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          activePreview === id
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-1" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Content */}
                <div className="p-6 h-96 overflow-y-auto">
                  {activePreview === "representatives" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Your Representatives</h4>
                        <Badge variant="secondary">Pennsylvania</Badge>
                      </div>
                      {mockRepresentatives.map((rep, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-semibold text-gray-900 dark:text-white">{rep.name}</h5>
                                  <Badge variant={rep.party === "Democrat" ? "default" : "secondary"}>
                                    {rep.party.charAt(0)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{rep.title} • {rep.district}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <button className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                    <Phone className="w-3 h-3 mr-1" />
                                    Call
                                  </button>
                                  <button className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                    <Mail className="w-3 h-3 mr-1" />
                                    Email
                                  </button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {activePreview === "legislation" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Active Legislation</h4>
                        <div className="flex items-center space-x-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <Input 
                            placeholder="Search bills..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-32 h-8"
                          />
                        </div>
                      </div>
                      {mockLegislation.map((bill, index) => (
                        <Card 
                          key={index} 
                          className={`cursor-pointer transition-all duration-200 ${
                            selectedBill === index ? "ring-2 ring-blue-500" : "hover:shadow-md"
                          }`}
                          onClick={() => setSelectedBill(index)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline">{bill.id}</Badge>
                                    <Badge variant={bill.status === "Passed House" ? "default" : "secondary"}>
                                      {bill.status}
                                    </Badge>
                                  </div>
                                  <h5 className="font-semibold text-gray-900 dark:text-white mt-1">{bill.title}</h5>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  bill.relevance === "High" 
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                }`}>
                                  {bill.relevance}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{bill.summary}</p>
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Last action: {bill.lastAction}</span>
                                <span>{bill.category}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {activePreview === "news" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Local News</h4>
                        <div className="flex items-center space-x-2">
                          <Filter className="w-4 h-4 text-gray-400" />
                          <select className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700">
                            <option>All Categories</option>
                            <option>Local Government</option>
                            <option>Education</option>
                            <option>Infrastructure</option>
                          </select>
                        </div>
                      </div>
                      {mockNews.map((article, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow duration-200">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h5 className="font-semibold text-gray-900 dark:text-white leading-tight">{article.title}</h5>
                                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{article.source}</span>
                                <span>•</span>
                                <span>{article.time}</span>
                                <Badge variant="outline" className="text-xs">{article.category}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{article.excerpt}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {activePreview === "action" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Take Action</h4>
                        <Badge variant="secondary">3 opportunities</Badge>
                      </div>
                      
                      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Vote className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-blue-900 dark:text-blue-100">Contact Rep. Johnson about HR-1234</h5>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                The Infrastructure Investment Act affects your district. Make your voice heard!
                              </p>
                              <div className="flex items-center space-x-2 mt-3">
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                  <Phone className="w-3 h-3 mr-1" />
                                  Call Now
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Mail className="w-3 h-3 mr-1" />
                                  Send Email
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900 dark:text-white">School Board Meeting Tonight</h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Budget vote at 7 PM. Your input could make a difference.
                              </p>
                              <div className="flex items-center space-x-2 mt-3">
                                <Button size="sm" variant="outline">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  Get Directions
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Bell className="w-3 h-3 mr-1" />
                                  Set Reminder
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Civic Engagement Score</span>
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">75/100</span>
                        </div>
                        <Progress value={75} className="h-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Take 2 more actions this month to reach your goal!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating indicators */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                Live Data
              </div>
              <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                Your Location
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Explore Democracy by Location
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Click on any state or county to see real civic data. This is the same interactive map you'll use in your dashboard.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Map */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="h-[500px]">
                  <LeafletMap
                    selectedState={selectedState}
                    onStateClick={handleMapStateClick}
                    onCountyClick={handleMapCountyClick}
                    onReset={handleMapReset}
                    className="w-full h-full"
                    fullHeight={true}
                  />
                </div>
              </div>
            </div>

            {/* Live Data Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                    Real-Time Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">Live Census Data</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Population & Demographics</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Officials Database</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Representatives & Contacts</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-purple-900 dark:text-purple-100">Legislative Tracking</p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">Bills & Voting Records</p>
                    </div>
                    <Clock className="w-5 h-5 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              {location && (
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Selected Location</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {location.county ? `${location.county}, ${location.state}` : location.state}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {location.county ? 'County Level' : 'State Level'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Data Available:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">Live</span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleGetStarted}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                    >
                      View Dashboard for {location.county || location.state}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Stay Engaged
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Comprehensive civic tools in one beautiful, easy-to-use platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Users,
                title: "Find Representatives",
                description: "Contact information and voting records for all your elected officials",
                color: "blue"
              },
              {
                icon: Scale,
                title: "Track Legislation", 
                description: "Follow bills that affect your community with real-time updates",
                color: "purple"
              },
              {
                icon: Newspaper,
                title: "Local News",
                description: "Curated civic news and updates specific to your area",
                color: "green"
              },
              {
                icon: Megaphone,
                title: "Take Action",
                description: "Make your voice heard with guided advocacy tools",
                color: "red"
              }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-${feature.color}-100 dark:bg-${feature.color}-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-8 h-8 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Make Your Voice Heard?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of Americans who are staying informed and engaged with their local democracy.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Start with Your Address
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            
            {!user && (
              <Button 
                onClick={handleSignIn}
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg rounded-xl"
              >
                Sign In / Sign Up
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-center text-blue-100 text-sm mt-6">
            <Shield className="w-4 h-4 mr-2" />
            Free forever. No credit card required. Privacy protected.
          </div>
        </div>
      </section>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab={authModalTab} />
      <AnimatedTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  )
}
