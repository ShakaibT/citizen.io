"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Filter,
  Star,
  StarOff,
  Calendar,
  User,
  ExternalLink,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/components/auth-provider"
import { useLocation } from "@/components/location-provider"
import { useToast } from "@/hooks/use-toast"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface Bill {
  id: string
  bill_id: string
  title: string
  summary: string
  sponsor: string
  sponsor_party: string
  status: string
  current_stage: string
  next_stage: string
  introduced_date: string
  last_action_date: string
  last_action: string
  level: "federal" | "state" | "local"
  state: string
  topic: string
  cost_estimate: number
  passage_likelihood: number
  government_url: string
  tracked?: boolean
}

const statusColors = {
  Introduced: "bg-blue-100 text-blue-800",
  "In Committee": "bg-yellow-100 text-yellow-800",
  "Committee Vote": "bg-orange-100 text-orange-800",
  "Floor Vote": "bg-purple-100 text-purple-800",
  "Passed House": "bg-green-100 text-green-800",
  "Passed Senate": "bg-green-100 text-green-800",
  "Signed into Law": "bg-emerald-100 text-emerald-800",
  Vetoed: "bg-red-100 text-red-800",
}

const levelColors = {
  federal: "bg-blue-100 text-blue-800",
  state: "bg-green-100 text-green-800",
  local: "bg-purple-100 text-purple-800",
}

const mockBills: Bill[] = [
  {
    id: "1",
    bill_id: "HR-1234",
    title: "Clean Energy Infrastructure Act",
    summary:
      "A comprehensive bill to modernize America's energy infrastructure and accelerate the transition to clean energy sources.",
    sponsor: "Rep. Jane Smith",
    sponsor_party: "Democratic",
    status: "Committee Vote",
    current_stage: "Energy Committee Review",
    next_stage: "House Floor Vote",
    introduced_date: "2025-01-15",
    last_action_date: "2025-01-20",
    last_action: "Referred to Energy and Commerce Committee",
    level: "federal",
    state: "Federal",
    topic: "Environment",
    cost_estimate: 2500000000,
    passage_likelihood: 75,
    government_url: "https://congress.gov/bill/118th-congress/house-bill/1234",
  },
  {
    id: "2",
    bill_id: "S-567",
    title: "Healthcare Access Expansion Act",
    summary:
      "Legislation aimed at expanding healthcare access to underserved communities and reducing prescription drug costs.",
    sponsor: "Sen. John Doe",
    sponsor_party: "Republican",
    status: "Floor Vote",
    current_stage: "Senate Floor Debate",
    next_stage: "House Consideration",
    introduced_date: "2025-01-10",
    last_action_date: "2025-01-25",
    last_action: "Placed on Senate Legislative Calendar",
    level: "federal",
    state: "Federal",
    topic: "Healthcare",
    cost_estimate: 850000000,
    passage_likelihood: 60,
    government_url: "https://congress.gov/bill/118th-congress/senate-bill/567",
  },
  {
    id: "3",
    bill_id: "AB-890",
    title: "Education Funding Reform",
    summary: "State legislation to reform education funding formulas and increase support for public schools.",
    sponsor: "Assemblymember Maria Garcia",
    sponsor_party: "Democratic",
    status: "Signed into Law",
    current_stage: "Enacted",
    next_stage: "Implementation",
    introduced_date: "2024-12-01",
    last_action_date: "2025-01-30",
    last_action: "Signed by Governor",
    level: "state",
    state: "California",
    topic: "Education",
    cost_estimate: 1200000000,
    passage_likelihood: 100,
    government_url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB890",
  },
]

export function LegislationTracker() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [topicFilter, setTopicFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const { user } = useAuth()
  const { location } = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    fetchBills()
  }, [location])

  const fetchBills = async () => {
    setLoading(true)
    try {
      // In production, fetch from Supabase
      // For now, use mock data filtered by location
      const filteredMockBills = mockBills.filter(
        (bill) => bill.level === "federal" || bill.state === location?.state || bill.level === "local",
      )
      setBills(filteredMockBills)
    } catch (error) {
      console.error("Error fetching bills:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.summary.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = levelFilter === "all" || bill.level === levelFilter
    const matchesTopic = topicFilter === "all" || bill.topic === topicFilter
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter

    return matchesSearch && matchesLevel && matchesTopic && matchesStatus
  })

  const toggleTrack = async (billId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track legislation.",
        variant: "destructive",
      })
      return
    }

    if (!isSupabaseConfigured) {
      toast({
        title: "Feature unavailable",
        description: "Bill tracking requires database configuration.",
        variant: "destructive",
      })
      return
    }

    const bill = bills.find((b) => b.id === billId)
    if (!bill) return

    try {
      if (bill.tracked) {
        // Remove from tracking
        await supabase.from("user_tracked_bills").delete().eq("user_id", user.id).eq("bill_id", billId)
      } else {
        // Add to tracking
        await supabase.from("user_tracked_bills").insert({
          user_id: user.id,
          bill_id: billId,
        })
      }

      setBills(bills.map((b) => (b.id === billId ? { ...b, tracked: !b.tracked } : b)))

      toast({
        title: bill.tracked ? "Removed from watchlist" : "Added to watchlist",
        description: bill.tracked
          ? `${bill.title} has been removed from your watchlist.`
          : `${bill.title} has been added to your watchlist.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tracking status.",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else {
      return `$${amount.toLocaleString()}`
    }
  }

  const getProgressSteps = (currentStage: string, level: string) => {
    const federalSteps = ["Introduced", "Committee", "Floor Vote", "Other Chamber", "Signed"]
    const stateSteps = ["Introduced", "Committee", "Floor Vote", "Signed"]
    const localSteps = ["Introduced", "Council Vote", "Signed"]

    const steps = level === "federal" ? federalSteps : level === "state" ? stateSteps : localSteps
    const currentIndex = steps.findIndex((step) => currentStage.toLowerCase().includes(step.toLowerCase()))
    return { steps, currentIndex: Math.max(0, currentIndex) }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Legislation Tracker</h1>
        <p className="text-gray-600">
          Stay informed about current legislation in {location?.city}, {location?.state}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search bills by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="federal">Federal</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="local">Local</SelectItem>
            </SelectContent>
          </Select>

          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="Environment">Environment</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Economy">Economy</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Introduced">Introduced</SelectItem>
              <SelectItem value="In Committee">In Committee</SelectItem>
              <SelectItem value="Floor Vote">Floor Vote</SelectItem>
              <SelectItem value="Signed into Law">Signed into Law</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bills Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBills.map((bill) => {
          const { steps, currentIndex } = getProgressSteps(bill.current_stage, bill.level)
          const progress = ((currentIndex + 1) / steps.length) * 100

          return (
            <Card key={bill.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={levelColors[bill.level]}>{bill.level}</Badge>
                      <Badge variant="outline">{bill.topic}</Badge>
                    </div>
                    <CardTitle className="text-lg mb-2 group-hover:text-navy-600 transition-colors">
                      {bill.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 mb-3">{bill.summary}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => toggleTrack(bill.id)} className="ml-2">
                    {bill.tracked ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status and Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={
                          statusColors[bill.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                        }
                      >
                        {bill.status}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-600">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>{bill.passage_likelihood}% likely</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="text-xs text-gray-500">Current: {bill.current_stage}</div>
                      {bill.next_stage && (
                        <div className="flex items-center text-xs text-gray-600">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Next: {bill.next_stage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cost and Impact */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>Cost: {formatCurrency(bill.cost_estimate)}</span>
                    </div>
                  </div>

                  {/* Sponsor and Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span>
                        {bill.sponsor} ({bill.sponsor_party})
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Introduced: {new Date(bill.introduced_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Last Action: {new Date(bill.last_action_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium text-gray-900">{bill.bill_id}</span>
                    <Button variant="outline" size="sm" asChild>
                      <a href={bill.government_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Bill
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bills found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}
