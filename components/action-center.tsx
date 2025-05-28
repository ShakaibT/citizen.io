"use client"

import { useState } from "react"
import { Send, Star, Calendar, DollarSign, MapPin, User, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

interface TrackedBill {
  id: string
  title: string
  status: string
  lastUpdate: string
}

interface CampaignOpportunity {
  id: string
  organization: string
  cause: string
  title: string
  description: string
  date: string
  location: string
  type: "paid" | "unpaid"
  commitment: string
}

const mockTrackedBills: TrackedBill[] = [
  {
    id: "HR-1234",
    title: "Clean Energy Infrastructure Act",
    status: "In Committee",
    lastUpdate: "2024-01-20",
  },
  {
    id: "S-567",
    title: "Healthcare Access Expansion Act",
    status: "Passed Senate",
    lastUpdate: "2024-01-25",
  },
]

const mockCampaigns: CampaignOpportunity[] = [
  {
    id: "1",
    organization: "Clean Water Coalition",
    cause: "Environment",
    title: "Water Quality Advocacy Campaign",
    description:
      "Help advocate for stronger water quality standards in your community. Join our grassroots campaign to contact local representatives.",
    date: "2024-02-15",
    location: "Remote/Online",
    type: "unpaid",
    commitment: "2-4 hours/week",
  },
  {
    id: "2",
    organization: "Education First PAC",
    cause: "Education",
    title: "School Funding Campaign Coordinator",
    description:
      "Paid position to coordinate local advocacy efforts for increased education funding. Experience with community organizing preferred.",
    date: "2024-02-01",
    location: "Austin, TX",
    type: "paid",
    commitment: "Part-time",
  },
  {
    id: "3",
    organization: "Healthcare for All",
    cause: "Healthcare",
    title: "Community Outreach Volunteer",
    description:
      "Help spread awareness about healthcare access issues. Participate in community events and voter education drives.",
    date: "2024-02-10",
    location: "San Francisco, CA",
    type: "unpaid",
    commitment: "Flexible",
  },
]

const officials = [
  { name: "Sen. Jane Smith", office: "U.S. Senate", email: "senator.smith@senate.gov" },
  { name: "Rep. John Doe", office: "House of Representatives", email: "rep.doe@house.gov" },
  { name: "Gov. Sarah Johnson", office: "Governor", email: "governor@state.gov" },
]

const messageTemplates = {
  support:
    "I am writing to express my strong support for [Bill/Issue]. As your constituent, I believe this legislation is crucial because...",
  oppose:
    "I am writing to express my opposition to [Bill/Issue]. As your constituent, I have concerns about this legislation because...",
  inquiry:
    "I am writing to inquire about your position on [Bill/Issue]. As your constituent, I would like to understand...",
}

export function ActionCenter() {
  const [selectedOfficial, setSelectedOfficial] = useState("")
  const [messageType, setMessageType] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const handleTemplateChange = (template: string) => {
    setMessageType(template)
    setMessage(messageTemplates[template as keyof typeof messageTemplates])
  }

  const sendMessage = () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    if (!selectedOfficial || !subject || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Mock sending message
    toast({
      title: "Message sent!",
      description: `Your message has been sent to ${officials.find((o) => o.name === selectedOfficial)?.name}.`,
    })

    // Reset form
    setSelectedOfficial("")
    setMessageType("")
    setSubject("")
    setMessage("")
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to access Action Center</h3>
          <p className="text-gray-600 mb-6">
            Sign in to track legislation, contact officials, and find campaign opportunities.
          </p>
          <div className="space-x-4">
            <Button onClick={() => setAuthModalOpen(true)} className="bg-navy-600 hover:bg-navy-700">
              Sign In
            </Button>
            <Button onClick={() => setAuthModalOpen(true)} variant="outline">
              Create Account
            </Button>
          </div>
        </div>

        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Action Center</h1>
        <p className="text-gray-600">Take action on issues you care about</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Tracked Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              Your Tracked Bills
            </CardTitle>
            <CardDescription>Bills you're following and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            {mockTrackedBills.length > 0 ? (
              <div className="space-y-4">
                {mockTrackedBills.map((bill) => (
                  <div key={bill.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{bill.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">Bill ID: {bill.id}</p>
                      </div>
                      <Badge variant="outline">{bill.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Last updated: {new Date(bill.lastUpdate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">
                No tracked bills yet. Visit the Legislation Tracker to start following bills.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contact Officials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="h-5 w-5 mr-2 text-navy-600" />
              Contact Your Representatives
            </CardTitle>
            <CardDescription>Send messages to your elected officials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="official">Select Official</Label>
              <Select value={selectedOfficial} onValueChange={setSelectedOfficial}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an official" />
                </SelectTrigger>
                <SelectContent>
                  {officials.map((official) => (
                    <SelectItem key={official.name} value={official.name}>
                      {official.name} - {official.office}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="template">Message Template</Label>
              <Select value={messageType} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support Position</SelectItem>
                  <SelectItem value="oppose">Oppose Position</SelectItem>
                  <SelectItem value="inquiry">General Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
            </div>

            {selectedOfficial && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Sending to:</strong> {officials.find((o) => o.name === selectedOfficial)?.email}
                </p>
              </div>
            )}

            <Button onClick={sendMessage} className="w-full bg-navy-600 hover:bg-navy-700">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Marketplace */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Campaign Opportunities</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{campaign.title}</CardTitle>
                    <CardDescription className="mt-1">{campaign.organization}</CardDescription>
                  </div>
                  <Badge variant={campaign.type === "paid" ? "default" : "secondary"}>{campaign.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">{campaign.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Building className="h-4 w-4 mr-2" />
                      <span>{campaign.cause}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Starts: {new Date(campaign.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{campaign.location}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span>{campaign.commitment}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
