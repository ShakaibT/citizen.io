"use client"

import { Star, TrendingUp, MessageSquare, Calendar, Bell, Vote, Scale, Newspaper, Megaphone, AlertCircle, CheckCircle, Clock, ArrowRight, ExternalLink, Users, MapPin, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useLocation } from "@/components/location-provider"
import { LocationSettings } from "@/components/location-settings"

const mockStats = {
  trackedBills: 5,
  messagesSent: 12,
  articlesRead: 28,
  campaignsJoined: 3,
  upcomingElections: 2,
  actionItemsCompleted: 8,
}

const mockActionItems = [
  {
    id: 1,
    type: "urgent",
    title: "Vote on Proposition 15",
    description: "Local ballot measure on education funding - voting ends in 3 days",
    deadline: "2024-03-15",
    category: "Election",
    icon: Vote,
    action: "Vote Now",
    priority: "high",
    source: "elections"
  },
  {
    id: 2,
    type: "bill",
    title: "Contact Rep. About Climate Bill",
    description: "HR-2847 Climate Action Act needs your voice - committee vote next week",
    deadline: "2024-03-20",
    category: "Legislation",
    icon: Scale,
    action: "Send Message",
    priority: "high",
    source: "legislation"
  },
  {
    id: 3,
    type: "meeting",
    title: "Town Hall: Infrastructure Plan",
    description: "Mayor hosting public meeting on new infrastructure investments",
    deadline: "2024-03-18",
    category: "Local Government",
    icon: Users,
    action: "RSVP",
    priority: "medium",
    source: "action-center"
  },
  {
    id: 4,
    type: "news",
    title: "Read: New Housing Policy Impact",
    description: "Important analysis on how new housing policies affect your district",
    deadline: "2024-03-25",
    category: "Local News",
    icon: Newspaper,
    action: "Read Article",
    priority: "medium",
    source: "news"
  },
  {
    id: 5,
    type: "petition",
    title: "Sign Petition: Park Preservation",
    description: "Help save Central Park from commercial development - 500 signatures needed",
    deadline: "2024-03-25",
    category: "Community",
    icon: Target,
    action: "Sign Petition",
    priority: "low",
    source: "action-center"
  }
]

const mockRecentActivity = [
  {
    type: "bill_update",
    title: "Clean Energy Infrastructure Act",
    description: "Status changed to 'Passed Committee' - now heading to full vote",
    timestamp: "2 hours ago",
    status: "positive",
    icon: Scale,
    source: "legislation"
  },
  {
    type: "message_sent",
    title: "Message to Sen. Jane Smith",
    description: "Regarding Healthcare Access Expansion Act - received confirmation",
    timestamp: "1 day ago",
    status: "completed",
    icon: MessageSquare,
    source: "action-center"
  },
  {
    type: "election_reminder",
    title: "Voter Registration Deadline",
    description: "Reminder: Register to vote by March 20th for upcoming primary",
    timestamp: "2 days ago",
    status: "warning",
    icon: Vote,
    source: "elections"
  },
  {
    type: "article_saved",
    title: "New Climate Report Released",
    description: "EPA releases comprehensive climate impact assessment",
    timestamp: "3 days ago",
    status: "neutral",
    icon: Newspaper,
    source: "news"
  },
  {
    type: "campaign_joined",
    title: "Joined: Clean Water Initiative",
    description: "You're now following the local clean water campaign",
    timestamp: "5 days ago",
    status: "positive",
    icon: Megaphone,
    source: "action-center"
  },
]

const mockUpcomingElections = [
  {
    position: "Governor",
    date: "2024-11-05",
    daysUntil: 280,
    type: "General Election",
    status: "registered"
  },
  {
    position: "Mayor",
    date: "2024-06-15",
    daysUntil: 137,
    type: "Primary Election",
    status: "not_registered"
  },
  {
    position: "School Board",
    date: "2024-04-20",
    daysUntil: 45,
    type: "Local Election",
    status: "registered"
  },
]

const mockTrackedBills = [
  {
    id: "HR-2847",
    title: "Climate Action and Jobs Act",
    status: "In Committee",
    lastUpdate: "2024-03-10",
    yourPosition: "Support",
    urgency: "high"
  },
  {
    id: "SB-156",
    title: "Healthcare Access Expansion",
    status: "Passed Senate",
    lastUpdate: "2024-03-08",
    yourPosition: "Support",
    urgency: "medium"
  },
  {
    id: "HR-1234",
    title: "Infrastructure Investment Act",
    status: "In House",
    lastUpdate: "2024-03-05",
    yourPosition: "Neutral",
    urgency: "low"
  }
]

export function UserDashboard() {
  const { user } = useAuth()
  const { location } = useLocation()

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-black min-h-screen">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Please sign in</h3>
          <p className="text-gray-600 dark:text-gray-400">Sign in to view your personalized civic dashboard.</p>
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
      case "medium": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
      case "low": return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800"
      default: return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "positive": return "text-green-600 dark:text-green-400"
      case "warning": return "text-yellow-600 dark:text-yellow-400"
      case "completed": return "text-blue-600 dark:text-blue-400"
      default: return "text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-black min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Your Civic Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome back, {user.email}</p>
        {location && (
          <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{location.city}, {location.state}</span>
          </div>
        )}
      </div>

      {/* Priority Action Items */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            Action Items
          </h2>
          <Badge variant="outline" className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
            {mockActionItems.filter(item => item.priority === "high").length} Urgent
          </Badge>
        </div>
        <div className="grid gap-4">
          {mockActionItems.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                            {item.source === "legislation" && "📜 Legislation"}
                            {item.source === "elections" && "🗳️ Elections"}
                            {item.source === "news" && "📰 News"}
                            {item.source === "action-center" && "📢 Action Center"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Due: {new Date(item.deadline).toLocaleDateString()}
                          </span>
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700">
                      {item.action}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Tracked Bills</CardTitle>
            <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.trackedBills}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">+2 from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.messagesSent}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">+4 from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Articles Read</CardTitle>
            <Newspaper className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.articlesRead}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">+12 from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Elections</CardTitle>
            <Vote className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.upcomingElections}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">upcoming this year</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.campaignsJoined}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">+1 from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">Actions</CardTitle>
            <CheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mockStats.actionItemsCompleted}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">completed this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Tracked Bills */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <Scale className="h-5 w-5 mr-2" />
              Tracked Legislation
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Bills you're following</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTrackedBills.map((bill) => (
                <div key={bill.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{bill.id}</h4>
                      <Badge variant="outline" className={getPriorityColor(bill.urgency)}>
                        {bill.urgency}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{bill.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Status: {bill.status}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Updated: {new Date(bill.lastUpdate).toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
              View All Bills
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <Bell className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Your latest civic engagement activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentActivity.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <Icon className={`h-4 w-4 ${getStatusColor(activity.status)}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{activity.title}</h4>
                        <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600">
                          {activity.source === "legislation" && "📜"}
                          {activity.source === "elections" && "🗳️"}
                          {activity.source === "news" && "📰"}
                          {activity.source === "action-center" && "📢"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming Elections */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <Vote className="h-5 w-5 mr-2" />
              Upcoming Elections
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Elections in your area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockUpcomingElections.map((election, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{election.position}</h4>
                      {election.status === "not_registered" && (
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800">
                          Not Registered
                        </Badge>
                      )}
                      {election.status === "registered" && (
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
                          Registered
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{election.type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(election.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                      {election.daysUntil} days
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700">
              View All Elections
            </Button>
          </CardContent>
        </Card>

        {/* Location Settings */}
        <LocationSettings />
      </div>
    </div>
  )
}
