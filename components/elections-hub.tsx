"use client"

import { useState } from "react"
import { MapPin, Calendar, Users, ExternalLink, Vote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

interface Election {
  id: string
  position: string
  date: string
  candidates: Array<{
    name: string
    party: string
    incumbent?: boolean
  }>
  region: string
  type: "federal" | "state" | "local"
}

const mockElections: Election[] = [
  {
    id: "1",
    position: "Governor",
    date: "2024-11-05",
    candidates: [
      { name: "Sarah Johnson", party: "Democratic", incumbent: true },
      { name: "Michael Chen", party: "Republican" },
      { name: "Lisa Rodriguez", party: "Independent" },
    ],
    region: "California",
    type: "state",
  },
  {
    id: "2",
    position: "U.S. Senate",
    date: "2024-11-05",
    candidates: [
      { name: "Robert Williams", party: "Republican", incumbent: true },
      { name: "Amanda Davis", party: "Democratic" },
    ],
    region: "Texas",
    type: "federal",
  },
  {
    id: "3",
    position: "Mayor",
    date: "2024-06-15",
    candidates: [
      { name: "David Park", party: "Nonpartisan" },
      { name: "Jennifer Martinez", party: "Nonpartisan", incumbent: true },
      { name: "Thomas Anderson", party: "Nonpartisan" },
    ],
    region: "Austin, TX",
    type: "local",
  },
  {
    id: "4",
    position: "House of Representatives - District 12",
    date: "2024-11-05",
    candidates: [
      { name: "Maria Gonzalez", party: "Democratic" },
      { name: "James Thompson", party: "Republican", incumbent: true },
    ],
    region: "California",
    type: "federal",
  },
]

const partyColors = {
  Democratic: "bg-blue-100 text-blue-800",
  Republican: "bg-red-100 text-red-800",
  Independent: "bg-purple-100 text-purple-800",
  Nonpartisan: "bg-gray-100 text-gray-800",
}

export function ElectionsHub() {
  const [address, setAddress] = useState("")
  const [elections, setElections] = useState<Election[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const searchElections = () => {
    if (address.trim()) {
      // Mock search - in real app, this would call an API
      setElections(mockElections)
      setHasSearched(true)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Elections Hub</h1>
        <p className="text-gray-600">Find upcoming elections in your area and get voting information</p>
      </div>

      {/* Address Search */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Find Elections in Your Area
          </CardTitle>
          <CardDescription>Enter your address to see upcoming elections and voting information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="address" className="sr-only">
                Address
              </Label>
              <Input
                id="address"
                placeholder="Enter your address (e.g., 123 Main St, Austin, TX 78701)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchElections()}
              />
            </div>
            <Button onClick={searchElections} className="bg-navy-600 hover:bg-navy-700">
              Search Elections
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Voting Resources */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Vote className="h-5 w-5 mr-2 text-navy-600" />
              Register to Vote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Make sure you're registered to vote in upcoming elections.</p>
            <Button variant="outline" className="w-full" asChild>
              <a href="https://vote.gov" target="_blank" rel="noopener noreferrer">
                Register Now
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Calendar className="h-5 w-5 mr-2 text-navy-600" />
              View Sample Ballot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Preview your ballot before election day to prepare.</p>
            <Button variant="outline" className="w-full">
              See Ballot
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MapPin className="h-5 w-5 mr-2 text-navy-600" />
              Find Polling Place
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Locate your polling place and check hours.</p>
            <Button variant="outline" className="w-full" asChild>
              <a href="https://www.eac.gov/voters/polling-place-locator" target="_blank" rel="noopener noreferrer">
                Find Location
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Elections Results */}
      {hasSearched && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Elections {address && `for ${address}`}</h2>

          {elections.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {elections.map((election) => (
                <Card key={election.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{election.position}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(election.date)}
                        </CardDescription>
                      </div>
                      <Badge variant={isUpcoming(election.date) ? "default" : "secondary"}>{election.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Candidates
                        </h4>
                        <div className="space-y-2">
                          {election.candidates.map((candidate, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div>
                                <span className="font-medium">{candidate.name}</span>
                                {candidate.incumbent && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Incumbent
                                  </Badge>
                                )}
                              </div>
                              <Badge
                                className={
                                  partyColors[candidate.party as keyof typeof partyColors] ||
                                  "bg-gray-100 text-gray-800"
                                }
                              >
                                {candidate.party}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {election.region}
                        </span>
                        <span className={isUpcoming(election.date) ? "text-green-600 font-medium" : "text-gray-500"}>
                          {isUpcoming(election.date) ? "Upcoming" : "Past"}
                        </span>
                      </div>

                      <Button variant="outline" className="w-full">
                        More Information
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Vote className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No elections found</h3>
                <p className="text-gray-600">
                  No upcoming elections found for this address. Try a different location or check back later.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!hasSearched && (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Enter your address to get started</h3>
            <p className="text-gray-600">Search for your address above to find upcoming elections in your area.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
